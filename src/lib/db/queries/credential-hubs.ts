// Queries for the /lawyers/services credential hubs. Drizzle, like the rest of
// the lawyer queries. Only listable lawyers (listableLawyer) are listed or
// counted. A lawyer is on a hub when lawyers.credentials overlaps the hub's
// exact credential values.

import { and, asc, count, desc, eq, isNotNull, sql, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import { lawyers } from "@/lib/db/schema";
import { listableLawyer } from "@/lib/lawyers/listable";
import { CREDENTIAL_HUBS } from "@/lib/constants/credentials";
import type { LawyerCardData } from "@/types/lawyer";
import {
  getPracticeAreaMap,
  lawyerCardSelection,
  toLawyerCard,
  type LawyerCardRow,
} from "./lawyers";

/** `credentials && ARRAY[...]::text[]`, one bind parameter per value. */
export function hasAnyCredential(values: readonly string[]): SQL {
  if (values.length === 0) return sql`false`;
  const list = sql.join(
    values.map((value) => sql`${value}`),
    sql`, `
  );
  return sql`${lawyers.credentials} && ARRAY[${list}]::text[]`;
}

export type CredentialHubLawyer = LawyerCardData & {
  address: string | null;
  phone: string | null;
};

export interface CredentialHubLawyerPage {
  lawyers: CredentialHubLawyer[];
  total: number;
  page: number;
  totalPages: number;
}

/** Listable lawyers holding any of `credentials`, optionally in one state/city (stored names). */
export async function listCredentialHubLawyers(params: {
  credentials: readonly string[];
  stateName?: string;
  cityName?: string;
  page?: number;
  limit?: number;
}): Promise<CredentialHubLawyerPage> {
  const page = Math.max(1, Math.floor(params.page ?? 1));
  const limit = Math.max(1, Math.floor(params.limit ?? 20));
  const conditions: SQL[] = [listableLawyer, hasAnyCredential(params.credentials)];
  if (params.stateName) conditions.push(eq(lawyers.state, params.stateName));
  if (params.cityName) conditions.push(eq(lawyers.city, params.cityName));
  const where = and(...conditions);

  const [[{ total }], rows] = await Promise.all([
    db.select({ total: count() }).from(lawyers).where(where),
    db
      .select({ ...lawyerCardSelection, address: lawyers.address, phone: lawyers.phone })
      .from(lawyers)
      .where(where)
      .orderBy(
        desc(lawyers.subscriptionTier),
        sql`${lawyers.reviewCount} DESC NULLS LAST`,
        asc(lawyers.name),
        asc(lawyers.id)
      )
      .limit(limit)
      .offset((page - 1) * limit),
  ]);

  const practiceAreaMap = await getPracticeAreaMap(rows.map((row) => row.id));
  const numericTotal = Number(total);
  return {
    lawyers: rows.map((row) => ({
      ...toLawyerCard(row as LawyerCardRow, practiceAreaMap),
      address: row.address,
      phone: row.phone,
    })),
    total: numericTotal,
    page,
    totalPages: Math.ceil(numericTotal / limit),
  };
}

/** Counts of listable lawyers holding any of `credentials`, by stored state name. */
export async function getCredentialCountsByState(
  credentials: readonly string[]
): Promise<{ state: string; count: number }[]> {
  const rows = await db
    .select({ state: lawyers.state, total: count() })
    .from(lawyers)
    .where(and(listableLawyer, hasAnyCredential(credentials), isNotNull(lawyers.state)))
    .groupBy(lawyers.state);
  return rows.flatMap((row) => (row.state ? [{ state: row.state, count: Number(row.total) }] : []));
}

/** Counts by stored (state, city) names, optionally within one state. */
export async function getCredentialCountsByCity(
  credentials: readonly string[],
  stateName?: string
): Promise<{ state: string; city: string; count: number }[]> {
  const conditions: SQL[] = [
    listableLawyer,
    hasAnyCredential(credentials),
    isNotNull(lawyers.state),
    isNotNull(lawyers.city),
  ];
  if (stateName) conditions.push(eq(lawyers.state, stateName));
  const rows = await db
    .select({ state: lawyers.state, city: lawyers.city, total: count() })
    .from(lawyers)
    .where(and(...conditions))
    .groupBy(lawyers.state, lawyers.city);
  return rows.flatMap((row) =>
    row.state && row.city ? [{ state: row.state, city: row.city, count: Number(row.total) }] : []
  );
}

function perHubCountColumns(): Record<string, SQL<number>> {
  return Object.fromEntries(
    CREDENTIAL_HUBS.map((hub) => [
      hub.slug,
      sql<number>`count(*) filter (where ${hasAnyCredential(hub.credentials)})`.mapWith(Number),
    ])
  );
}

function allHubCredentials(): string[] {
  return CREDENTIAL_HUBS.flatMap((hub) => [...hub.credentials]);
}

/** Per-hub counts for one place (or nationally): one row, one column per hub. */
export async function getCredentialHubCountsForPlace(
  stateName?: string,
  cityName?: string
): Promise<Record<string, number>> {
  const conditions: SQL[] = [listableLawyer, hasAnyCredential(allHubCredentials())];
  if (stateName) conditions.push(eq(lawyers.state, stateName));
  if (cityName) conditions.push(eq(lawyers.city, cityName));
  const [row] = await db
    .select(perHubCountColumns())
    .from(lawyers)
    .where(and(...conditions));
  const counts: Record<string, number> = {};
  for (const hub of CREDENTIAL_HUBS) {
    counts[hub.slug] = Number((row as Record<string, unknown> | undefined)?.[hub.slug] ?? 0);
  }
  return counts;
}

export interface CredentialHubPlaceCounts {
  state: string | null;
  city: string | null;
  counts: Record<string, number>;
}

/**
 * Every hub's count for every stored (state, city) pair, in one query. Each
 * lawyer falls in exactly one (state, city) group, so summing rows gives
 * state and national totals. Used by the sitemap and the services index.
 */
export async function getCredentialHubCountsByPlace(): Promise<CredentialHubPlaceCounts[]> {
  const rows = await db
    .select({ state: lawyers.state, city: lawyers.city, ...perHubCountColumns() })
    .from(lawyers)
    .where(and(listableLawyer, hasAnyCredential(allHubCredentials())))
    .groupBy(lawyers.state, lawyers.city);
  return rows.map((row) => {
    const record = row as Record<string, unknown>;
    const counts: Record<string, number> = {};
    for (const hub of CREDENTIAL_HUBS) counts[hub.slug] = Number(record[hub.slug] ?? 0);
    return { state: row.state as string | null, city: row.city as string | null, counts };
  });
}
