// Grouped counts for the practice area x location pages. Drizzle, like the
// rest of the lawyer queries. Only listable lawyers (listableLawyer) are
// counted, matched the same way searchLawyers matches a practice area (the
// lawyer_practice_areas join, keyed by practice_areas.slug) and a place (the
// stored lawyers.state / lawyers.city names).

import { and, eq, isNotNull, sql, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import { lawyerPracticeAreas, lawyers, practiceAreas } from "@/lib/db/schema";
import { listableLawyer } from "@/lib/lawyers/listable";
import type { AreaPlaceCountRow } from "@/lib/utils/practice-area-location-seo";

/**
 * Counts of listable lawyers per (practice area slug, state, city), in one
 * grouped query. Optional filters narrow it to one area and/or one place
 * (stored names). Rows with a null state are left out.
 */
export async function getAreaPlaceCounts(filters: {
  areaSlug?: string;
  stateName?: string;
  cityName?: string;
} = {}): Promise<AreaPlaceCountRow[]> {
  const conditions: SQL[] = [listableLawyer, isNotNull(lawyers.state)];
  if (filters.areaSlug) conditions.push(eq(practiceAreas.slug, filters.areaSlug));
  if (filters.stateName) conditions.push(eq(lawyers.state, filters.stateName));
  if (filters.cityName) conditions.push(eq(lawyers.city, filters.cityName));

  const rows = await db
    .select({
      slug: practiceAreas.slug,
      state: lawyers.state,
      city: lawyers.city,
      total: sql<number>`count(distinct ${lawyers.id})`.mapWith(Number),
    })
    .from(lawyerPracticeAreas)
    .innerJoin(practiceAreas, eq(lawyerPracticeAreas.practiceAreaId, practiceAreas.id))
    .innerJoin(lawyers, eq(lawyerPracticeAreas.lawyerId, lawyers.id))
    .where(and(...conditions))
    .groupBy(practiceAreas.slug, lawyers.state, lawyers.city);

  return rows.map((row) => ({
    slug: row.slug,
    state: row.state,
    city: row.city,
    count: Number(row.total),
  }));
}
