import { getTableColumns, sql } from "drizzle-orm";
import { type PgTable } from "drizzle-orm/pg-core";
import { db, withAdvisoryLock } from "@/lib/db";
import { externalIds, firms, lawyerPracticeAreas, lawyers, practiceAreas } from "@/lib/db/schema";
import { practiceLinkKey, type Existing, type FirmState, type ImportPlan, type LawyerState } from "./plan";

const DIRECTORY_IMPORT_LOCK = 20_261_126;
const BATCH_SIZE = 500;

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

const firmFields = {
  id: firms.id, slug: firms.slug, name: firms.name, isClaimed: firms.isClaimed, description: firms.description,
  address: firms.address, normalizedAddress: firms.normalizedAddress, state: firms.state, city: firms.city,
  phone: firms.phone, email: firms.email, website: firms.website, postcode: firms.postcode,
  latitude: firms.latitude, longitude: firms.longitude, fax: firms.fax, whatsapp: firms.whatsapp,
  linkedin: firms.linkedin, socialLinks: firms.socialLinks, foundedYear: firms.foundedYear, openingHours: firms.openingHours,
  languages: firms.languages, bankPanels: firms.bankPanels, legalNetworks: firms.legalNetworks, rankings: firms.rankings,
  importData: firms.importData, importedAt: firms.importedAt,
} satisfies Record<keyof FirmState, unknown>;
const lawyerFields = {
  id: lawyers.id, slug: lawyers.slug, name: lawyers.name, state: lawyers.state, city: lawyers.city, address: lawyers.address,
  isActive: lawyers.isActive, isClaimed: lawyers.isClaimed, barMembershipNumber: lawyers.barMembershipNumber,
  primaryFirmId: lawyers.primaryFirmId, firmName: lawyers.firmName, barAdmissionDate: lawyers.barAdmissionDate,
  barStatus: lawyers.barStatus, yearsAtBar: lawyers.yearsAtBar, phone: lawyers.phone, email: lawyers.email,
  designation: lawyers.designation, qualification: lawyers.qualification, linkedin: lawyers.linkedin, languages: lawyers.languages,
  credentials: lawyers.credentials, rankings: lawyers.rankings, importData: lawyers.importData, importedAt: lawyers.importedAt,
  standingNote: lawyers.standingNote, standingSourceUrl: lawyers.standingSourceUrl,
} satisfies Record<keyof LawyerState, unknown>;

async function loadExisting(tx: Transaction, includeLawyers: boolean): Promise<Existing> {
  const existingFirms = await tx.select(firmFields).from(firms);
  const existingLawyers = includeLawyers ? await tx.select(lawyerFields).from(lawyers) : [];
  const keys = await tx.select({ entityType: externalIds.entityType, entityId: externalIds.entityId,
    namespace: externalIds.namespace, value: externalIds.value }).from(externalIds);
  const areas = await tx.select({ id: practiceAreas.id, slug: practiceAreas.slug }).from(practiceAreas);
  const links = includeLawyers ? await tx.select({ lawyerId: lawyerPracticeAreas.lawyerId,
    practiceAreaId: lawyerPracticeAreas.practiceAreaId }).from(lawyerPracticeAreas) : [];
  return { firms: existingFirms, lawyers: existingLawyers, externalIds: keys,
    practiceIds: new Map(areas.map(({ id, slug }) => [slug, id])),
    practiceLinks: new Set(links.map(({ lawyerId, practiceAreaId }) => practiceLinkKey(lawyerId, practiceAreaId))) };
}

function* batches<T>(rows: readonly T[]) {
  for (let start = 0; start < rows.length; start += BATCH_SIZE) yield rows.slice(start, start + BATCH_SIZE);
}

type RowWrite<T> = { match: { action: string; id?: string }; write?: { insert: T } | { update: Partial<T> } };
function mutations<T extends object>(entries: readonly RowWrite<T>[]) {
  const inserts: T[] = [];
  const updates: { id: string; patch: Partial<T> }[] = [];
  for (const { match, write } of entries) {
    if (!write) continue;
    if ("insert" in write) inserts.push(write.insert);
    else if (match.id) updates.push({ id: match.id, patch: write.update });
  }
  return { inserts, updates };
}

// A batch shares one UPDATE; missing JSON keys preserve the target column, explicit null clears it.
async function updateBatch<T extends object>(tx: Transaction, table: PgTable, batch: { id: string; patch: Partial<T> }[]) {
  const columns = getTableColumns(table);
  const names = new Set<string>();
  const rows = batch.map(({ id, patch }) => {
    const data: Record<string, unknown> = { id };
    for (const [field, value] of Object.entries(patch)) {
      const name = columns[field].name;
      names.add(name);
      data[name] = value;
    }
    return data;
  });
  const assignments = [...names].map((name) => {
    const column = sql.identifier(name);
    return sql`${column} = CASE WHEN source.data ? ${name} THEN incoming.${column} ELSE target.${column} END`;
  });
  await tx.execute(sql`
    UPDATE ${table} AS target SET ${sql.join(assignments, sql`, `)}
    FROM jsonb_array_elements(${JSON.stringify(rows)}::jsonb) AS source(data)
    CROSS JOIN LATERAL jsonb_populate_record(NULL::${table}, source.data) AS incoming
    WHERE target.id = incoming.id
  `);
}

async function applyPlan(tx: Transaction, plan: ImportPlan): Promise<number> {
  const firmWrites = mutations(plan.firmPlans);
  for (const batch of batches(firmWrites.inserts)) await tx.insert(firms).values(batch);
  for (const batch of batches(firmWrites.updates)) await updateBatch(tx, firms, batch);
  const lawyerWrites = mutations(plan.lawyerPlans);
  for (const batch of batches(lawyerWrites.inserts)) await tx.insert(lawyers).values(batch);
  for (const batch of batches(lawyerWrites.updates)) await updateBatch(tx, lawyers, batch);
  for (const batch of batches(plan.externalIds)) {
    // An unexpected ownership conflict aborts instead of silently adopting someone else's key.
    await tx.insert(externalIds).values(batch.map((key) => ({ ...key, createdAt: plan.now })));
  }
  for (const batch of batches(plan.links)) await tx.insert(lawyerPracticeAreas).values(batch).onConflictDoNothing();
  let countUpdates = 0;
  // Every firm, not only the ones this run touched: a lawyer who moved leaves
  // a stale count on the old firm, and counts from before the import are stale.
  if (plan.touchedFirms.size > 0) {
    const updated = await tx.execute(sql`
      WITH counts AS (
        SELECT ${firms.id} AS id, count(${lawyers.id})::int AS lawyer_count
        FROM ${firms} LEFT JOIN ${lawyers} ON ${lawyers.primaryFirmId} = ${firms.id}
          AND ${lawyers.isActive} AND coalesce(${lawyers.barStatus}, 'active') = 'active'
        GROUP BY ${firms.id}
      )
      UPDATE ${firms} AS target SET lawyer_count = counts.lawyer_count, updated_at = ${plan.now.toISOString()}::timestamp
      FROM counts WHERE target.id = counts.id AND target.lawyer_count IS DISTINCT FROM counts.lawyer_count
      RETURNING target.id
    `);
    countUpdates += updated.length;
  }
  return countUpdates;
}

export async function runWithDatabase(options: {
  apply: boolean; includeLawyers: boolean; confirmDatabase: (name: string) => void;
  plan: (existing: Existing) => ImportPlan;
  permitApply: (plan: ImportPlan) => boolean;
}): Promise<{ acquired: true; value: { plan: ImportPlan; countUpdates: number; applied: boolean } } | { acquired: false }> {
  const work = () => db.transaction(async (tx) => {
    const [database] = await tx.execute<{ name: string }>(sql`SELECT current_database() AS name`);
    options.confirmDatabase(database.name);
    const plan = options.plan(await loadExisting(tx, options.includeLawyers));
    const applied = options.apply && options.permitApply(plan);
    const countUpdates = applied ? await applyPlan(tx, plan) : 0;
    return { plan, countUpdates, applied };
  }, { isolationLevel: options.apply ? "serializable" : "repeatable read", accessMode: options.apply ? "read write" : "read only" });
  // One commit keeps rows, keys and Tier B provenance atomic even on interruption. In particular,
  // a scraper/claim update racing a planned write aborts the serializable transaction rather than overwriting it.
  return options.apply ? withAdvisoryLock(DIRECTORY_IMPORT_LOCK, work) : { acquired: true, value: await work() };
}
