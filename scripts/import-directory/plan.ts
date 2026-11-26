import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { normalizeAddress } from "@/lib/db/queries/firms";
import type { firms, lawyers } from "@/lib/db/schema";
import { canFillLawyerField, hasScrapedValue } from "@/lib/lawyers/fill-rules";
import type { FirmInput, LawyerInput } from "./data";
import { WEAK_STANDING, hostMatches, keyId, primaryKey, type Entity, type ExternalId } from "./keys";
import { practiceSlugs } from "./maps/practice-areas";
import { matchFirms, matchLawyers, type Decision, type Match, type MatchFirm, type MatchLawyer } from "./match";
import { completedYears, normalizeEmail, parseAdmissionDate, parseWebUrl, phoneDigits, text } from "./normalize";
import { firmSlug, lawyerSlug, stableOrder, type SlugRule } from "./slug";

type Lawyer = typeof lawyers.$inferSelect;
type Firm = typeof firms.$inferSelect;
export type LawyerState = MatchLawyer & Pick<Lawyer,
  "slug" | "isClaimed" | "city" | "address" | "yearsAtBar" | "barStatus" | "standingNote" | "standingSourceUrl" |
  "designation" | "qualification" | "linkedin" | "languages" | "credentials" | "rankings" | "importData" | "importedAt">;
export type FirmState = MatchFirm & Pick<Firm,
  "slug" | "isClaimed" | "description" | "city" | "phone" | "email" | "website" | "postcode" | "latitude" |
  "longitude" | "fax" | "whatsapp" | "linkedin" | "socialLinks" | "foundedYear" | "openingHours" | "languages" |
  "bankPanels" | "legalNetworks" | "rankings" | "importData" | "importedAt">;

export type Existing = {
  firms: readonly FirmState[]; lawyers: readonly LawyerState[]; externalIds: readonly ExternalId[];
  practiceIds: ReadonlyMap<string, string>; practiceLinks: ReadonlySet<string>;
};

type Insert<T extends { id?: string }> = T & { id: string };
type Write<T extends { id?: string }> = { insert: Insert<T> } | { update: Partial<T> };
type Entry<T extends { id?: string }, R> = {
  row: R; key: string; match: Match; slug?: string; slugRule?: SlugRule; write?: Write<T>;
};
export type StatusReview = {
  key: string; name: string; state: string; firm: string | null; status: string;
  note: string | null; sourceUrl: string | null; tier: "A" | "B" | null;
};
export type PlanOptions = { now: Date; release: string; approvals: ReadonlySet<string>; only?: "firms" | "lawyers"; limit?: number };
export type ImportPlan = {
  now: Date;
  firmPlans: Entry<typeof firms.$inferInsert, FirmInput>[];
  lawyerPlans: Entry<typeof lawyers.$inferInsert, LawyerInput>[];
  externalIds: ExternalId[];
  links: { lawyerId: string; practiceAreaId: string }[];
  touchedFirms: Set<string>;
  missingPracticeSlugs: Set<string>;
  unmapped: Map<string, number>;
  statusReview: StatusReview[];
  unresolvedFirmReferences: number;
};

function importUuid(entity: Entity, key: string): string {
  const digest = createHash("sha256").update(`lawkita:directory-import:v1:${entity}:${key}`).digest();
  digest[6] = (digest[6] & 0x0f) | 0x80;
  digest[8] = (digest[8] & 0x3f) | 0x80;
  const hex = digest.toString("hex", 0, 16);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function changed<T extends { importedAt: Date | null }>(existing: T, next: Partial<T>, now: Date): Partial<T> | undefined {
  for (const key of Object.keys(next) as (keyof T)[]) {
    if (isDeepStrictEqual(existing[key], next[key])) delete next[key];
  }
  if (!Object.keys(next).length && existing.importedAt !== null) return undefined;
  next.importedAt = now;
  return next;
}

function fill<T, K extends keyof T>(existing: T, next: Partial<T>, incoming: Pick<T, K>, claimed: boolean, fields: readonly K[]) {
  for (const field of fields) {
    const value = incoming[field];
    if (hasScrapedValue(value) && canFillLawyerField(existing[field], claimed)) next[field] = value;
  }
}

const standingHosts: Readonly<Record<string, string>> = {
  sabah_law_society_disciplinary: "sabahlawsociety.org",
  jakess_syariah_non_practising: "jakess.gov.my",
  epjs_judiciary_revoked: "epjs.kehakiman.gov.my",
};

function standingSource(row: LawyerInput): string | null {
  const hosts = row.sources.filter((key) => Object.hasOwn(standingHosts, key)).map((key) => standingHosts[key]);
  if (new Set(hosts).size !== 1) return null;
  return row.source_urls.find((value) => {
    const url = parseWebUrl(value);
    return url && hostMatches(url.hostname, hosts[0]);
  }) ?? null;
}

function firmFields(row: FirmInput, release: string) {
  const website = parseWebUrl(row.website, true);
  return {
    name: row.name, description: text(row.description), address: text(row.address), state: row.state,
    city: text(row.city), phone: phoneDigits(row.phone), email: normalizeEmail(row.email),
    website: row.website_alive !== false && website?.hostname.includes(".") ? website.href : null,
    postcode: text(row.postcode), latitude: row.latitude ?? null, longitude: row.longitude ?? null,
    fax: phoneDigits(row.fax), whatsapp: phoneDigits(row.whatsapp), linkedin: parseWebUrl(row.linkedin, true)?.href ?? null,
    socialLinks: row.social_links, foundedYear: row.founded_year ?? null, openingHours: text(row.opening_hours),
    languages: row.languages, bankPanels: row.bank_panels, legalNetworks: row.legal_networks, rankings: row.rankings,
    importData: { ...row.raw, release },
  };
}

const firmGapFields = ["name", "description", "address", "state", "city", "phone", "email", "website"] as const;
const lawyerGapFields = ["name", "address", "state", "city", "phone", "email"] as const;

export function practiceLinkKey(lawyerId: string, practiceAreaId: string): string {
  return `${lawyerId}:${practiceAreaId}`;
}

export function planImport(input: { firms: readonly FirmInput[]; lawyers: readonly LawyerInput[] }, existing: Existing, options: PlanOptions): ImportPlan {
  const { now, release, only, limit } = options;
  const firmById = new Map(existing.firms.map((row) => [row.id, row]));
  const lawyerById = new Map(existing.lawyers.map((row) => [row.id, row]));
  const firmSlugs = new Set(existing.firms.map((row) => row.slug));
  const lawyerSlugs = new Set(existing.lawyers.map((row) => row.slug));
  const decisions = matchFirms(input.firms, existing.firms, existing.externalIds, only === "lawyers");
  const resolvedFirms = new Map<number, string>();
  const matchedFirms = new Map<number, string>();
  const sourceFirmNames = new Map(input.firms.map((row) => [row.id, row.name]));
  const existingKeys = new Set(existing.externalIds.map((key) => `${key.entityType}:${keyId(key)}`));
  const weakStanding = new Set(existing.externalIds
    .filter((key) => key.entityType === "lawyer" && key.namespace === WEAK_STANDING).map((key) => key.entityId));
  const externalIds: ExternalId[] = [];
  const links: { lawyerId: string; practiceAreaId: string }[] = [];
  const statusReview: StatusReview[] = [];
  const touchedFirms = new Set<string>();
  const missingPracticeSlugs = new Set<string>();
  const unmapped = new Map<string, number>();
  const firmPlans: Entry<typeof firms.$inferInsert, FirmInput>[] = [];
  const lawyerPlans: Entry<typeof lawyers.$inferInsert, LawyerInput>[] = [];
  let unresolvedFirmReferences = 0;

  function bind(entityType: Entity, entityId: string, { keys }: Decision) {
    for (const key of keys) {
      if (!existingKeys.has(`${entityType}:${keyId(key)}`)) externalIds.push({ entityType, entityId, ...key });
    }
  }

  function mapPractice(labels: readonly string[], lawyerId?: string) {
    const slugs = new Set<string>();
    for (const label of new Set(labels)) {
      const mapped = practiceSlugs(label);
      if (mapped) for (const slug of mapped) slugs.add(slug);
      else unmapped.set(label, (unmapped.get(label) ?? 0) + 1);
    }
    for (const slug of slugs) {
      const id = existing.practiceIds.get(slug);
      if (!id) missingPracticeSlugs.add(slug);
      else if (lawyerId && !existing.practiceLinks.has(practiceLinkKey(lawyerId, id))) {
        links.push({ lawyerId, practiceAreaId: id });
      }
    }
  }

  for (const [row, { match }] of decisions) {
    if (match.action === "update") {
      resolvedFirms.set(row, match.id);
      matchedFirms.set(row, match.id);
    }
  }
  if (only !== "lawyers") {
    for (const row of stableOrder(input.firms).slice(0, limit)) {
      const decision = decisions.get(row.id)!;
      const { match } = decision;
      const key = primaryKey(row);
      const entry: (typeof firmPlans)[number] = { row, key, match };
      firmPlans.push(entry);
      mapPractice(row.practice_areas);
      if (match.action === "insert") {
        const { slug, rule } = firmSlug(row, firmSlugs);
        const data = firmFields(row, release);
        const id = importUuid("firm", key);
        entry.slug = slug;
        entry.slugRule = rule;
        entry.write = { insert: { ...data, id, slug, normalizedAddress: normalizeAddress(data.address) || null,
          logo: null, logoIsLight: false, createdAt: now, updatedAt: now, importedAt: now } };
        resolvedFirms.set(row.id, id);
        touchedFirms.add(id);
        bind("firm", id, decision);
      } else if (match.action === "update") {
        const current = firmById.get(match.id)!;
        entry.slug = current.slug;
        touchedFirms.add(current.id);
        bind("firm", current.id, decision);
        if (!current.isClaimed) {
          const data = firmFields(row, release);
          const { name, description, address, state, city, phone, email, website, ...importOnly } = data;
          const patch: Partial<FirmState> = importOnly;
          fill(current, patch, { name, description, address, state, city, phone, email, website }, false, firmGapFields);
          if (patch.address) patch.normalizedAddress = normalizeAddress(patch.address) || null;
          const update = changed(current, patch, now);
          if (update) entry.write = { update: { ...update, updatedAt: now } };
        }
      }
    }
  }

  if (only !== "firms") {
    const decisions = matchLawyers(input.lawyers, existing.lawyers, existing.externalIds, matchedFirms);
    for (const row of stableOrder(input.lawyers).slice(0, limit)) {
      const decision = decisions.get(row.id)!;
      const key = primaryKey(row);
      const firmId = row.firm_id == null ? null : resolvedFirms.get(row.firm_id) ?? null;
      let { match } = decision;
      if (row.firm_id != null && !firmId) {
        unresolvedFirmReferences++;
        if (match.action === "insert" || match.action === "update") {
          match = { action: "review", reason: "release firm could not be resolved safely", candidates: match.action === "update" ? [match.id] : [] };
        }
      }
      const entry: (typeof lawyerPlans)[number] = { row, key, match };
      lawyerPlans.push(entry);
      const note = text(row.disciplinary_note);
      const hasStanding = row.status !== "Active" || note !== null;
      const sourceUrl = hasStanding ? standingSource(row) : null;
      const tier = decision.match.action === "update" ? decision.match.tier : null;
      const standingTier = decision.match.action === "update" && weakStanding.has(decision.match.id) ? "B" : tier;
      const standingAllowed = options.approvals.has(key) && (match.action === "insert" ||
        (match.action === "update" && standingTier === "A"));
      if (hasStanding && !standingAllowed) {
        statusReview.push({ key, name: row.full_name, state: row.state, firm: text(row.firm_name), status: row.status, note, sourceUrl, tier: standingTier });
      }
      if (match.action !== "update" && match.action !== "insert") {
        mapPractice(row.practice_areas);
        continue;
      }
      const id = match.action === "update" ? match.id : importUuid("lawyer", key);
      const current = lawyerById.get(id);
      const contact = { name: row.full_name, address: text(row.address), state: row.state, city: text(row.city),
        phone: phoneDigits(row.phone), email: normalizeEmail(row.email) };
      const publicImport = { designation: text(row.designation), qualification: text(row.qualification),
        linkedin: parseWebUrl(row.linkedin, true)?.href ?? null, languages: row.languages };
      const sharedImport = { importData: { ...row.raw, release }, rankings: row.rankings,
        credentials: row.lawyer_types.filter((credential) => credential !== "Advocate & Solicitor") };
      const firmName = text(row.firm_name) ?? (row.firm_id == null ? null : sourceFirmNames.get(row.firm_id) ?? null);
      const barAdmissionDate = parseAdmissionDate(row.admission_date);
      const barStatus = standingAllowed && row.status === "Struck Off" ? "struck_off" : "active";
      if (match.action === "insert") {
        const { slug, rule } = lawyerSlug(row, lawyerSlugs);
        entry.slug = slug;
        entry.slugRule = rule;
        entry.write = { insert: { ...contact, ...publicImport, ...sharedImport, id, slug, firmName, primaryFirmId: firmId,
          barAdmissionDate, yearsAtBar: completedYears(barAdmissionDate, now), barStatus,
          standingNote: standingAllowed ? note : null, standingSourceUrl: standingAllowed ? sourceUrl : null,
          isActive: true, isClaimed: false, isVerified: false, photo: null, createdAt: now, updatedAt: now, importedAt: now } };
        if (firmId) touchedFirms.add(firmId);
      } else if (current) {
        entry.slug = current.slug;
        const patch: Partial<LawyerState> = { ...sharedImport, ...(current.isClaimed ? {} : publicImport) };
        fill(current, patch, contact, current.isClaimed, lawyerGapFields);
        if (firmId && firmName && (!current.isClaimed || current.firmName === null)) {
          patch.firmName = firmName;
          patch.primaryFirmId = firmId;
        }
        if (barAdmissionDate && current.barAdmissionDate === null) patch.barAdmissionDate = barAdmissionDate;
        if (current.yearsAtBar === null) {
          const years = completedYears(current.barAdmissionDate ?? barAdmissionDate, now);
          if (years !== null) patch.yearsAtBar = years;
        }
        if (standingAllowed && hasStanding) {
          if (barStatus === "struck_off") patch.barStatus = barStatus;
          if (note !== null) {
            patch.standingNote = note;
            patch.standingSourceUrl = sourceUrl;
          }
        }
        const update = changed(current, patch, now);
        if (update) entry.write = { update: { ...update, updatedAt: now } };
        if (current.primaryFirmId) touchedFirms.add(current.primaryFirmId);
        if (patch.primaryFirmId) touchedFirms.add(patch.primaryFirmId);
        if (match.tier === "B" && !weakStanding.has(id)) {
          externalIds.push({ entityType: "lawyer", entityId: id, namespace: WEAK_STANDING, value: id });
        }
      }
      bind("lawyer", id, decision);
      mapPractice(row.practice_areas, id);
    }
  }
  return { now, firmPlans, lawyerPlans, externalIds, links, touchedFirms, missingPracticeSlugs, unmapped, statusReview, unresolvedFirmReferences };
}
