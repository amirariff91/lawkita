import { and, count, eq, gte, isNotNull } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  firms,
  lawyerPracticeAreas,
  lawyers,
  practiceAreas,
} from "@/lib/db/schema";

export interface GeographicStats {
  state: string;
  count: number;
  percentage: number;
}
export interface ExperienceDistribution {
  level: "junior" | "mid" | "senior";
  label: string;
  count: number;
  percentage: number;
}

export interface PracticeAreaStats {
  slug: string;
  name: string;
  count: number;
  percentage: number;
}

export interface AdmissionTrend {
  year: number;
  count: number;
}

export interface OverallStats {
  totalLawyers: number;
  activeLawyers: number;
  verifiedLawyers: number;
  claimedProfiles: number;
  avgYearsExperience: number;
  totalFirms: number;
  totalPracticeAreas: number;
}

export interface InsightsData {
  overall: OverallStats;
  geographic: GeographicStats[];
  experience: ExperienceDistribution[];
  practiceAreas: PracticeAreaStats[];
  admissionTrends: AdmissionTrend[];
  underservedAreas: GeographicStats[];
}

export async function getOverallStats(): Promise<OverallStats> {
  const [total, active, verified, claimed, firmsCount, practiceAreasCount, years] =
    await Promise.all([
      db.select({ count: count() }).from(lawyers),
      db
        .select({ count: count() })
        .from(lawyers)
        .where(and(eq(lawyers.isActive, true), eq(lawyers.barStatus, "active"))),
      db.select({ count: count() }).from(lawyers).where(eq(lawyers.isVerified, true)),
      db.select({ count: count() }).from(lawyers).where(eq(lawyers.isClaimed, true)),
      db.select({ count: count() }).from(firms),
      db
        .select({ count: count() })
        .from(practiceAreas)
        .where(eq(practiceAreas.isUserFacing, true)),
      db
        .select({ years: lawyers.yearsAtBar })
        .from(lawyers)
        .where(and(eq(lawyers.isActive, true), isNotNull(lawyers.yearsAtBar))),
    ]);

  const validYears = years
    .map((row) => row.years)
    .filter((year): year is number => year !== null);
  const average = validYears.length
    ? validYears.reduce((sum, year) => sum + year, 0) / validYears.length
    : 0;

  return {
    totalLawyers: Number(total[0]?.count ?? 0),
    activeLawyers: Number(active[0]?.count ?? 0),
    verifiedLawyers: Number(verified[0]?.count ?? 0),
    claimedProfiles: Number(claimed[0]?.count ?? 0),
    avgYearsExperience: Math.round(average * 10) / 10,
    totalFirms: Number(firmsCount[0]?.count ?? 0),
    totalPracticeAreas: Number(practiceAreasCount[0]?.count ?? 0),
  };
}

export async function getGeographicDistribution(filters?: {
  practiceArea?: string;
}): Promise<GeographicStats[]> {
  const conditions = [eq(lawyers.isActive, true), isNotNull(lawyers.state)];

  if (filters?.practiceArea) {
    conditions.push(eq(practiceAreas.slug, filters.practiceArea));
  }

  const rows = filters?.practiceArea
    ? await db
        .select({ state: lawyers.state })
        .from(lawyers)
        .innerJoin(
          lawyerPracticeAreas,
          eq(lawyers.id, lawyerPracticeAreas.lawyerId)
        )
        .innerJoin(
          practiceAreas,
          eq(lawyerPracticeAreas.practiceAreaId, practiceAreas.id)
        )
        .where(and(...conditions))
    : await db
        .select({ state: lawyers.state })
        .from(lawyers)
        .where(and(...conditions));

  return groupByState(rows.map((row) => row.state));
}

function groupByState(states: (string | null)[]): GeographicStats[] {
  const counts = new Map<string, number>();
  for (const state of states) {
    if (state) counts.set(state, (counts.get(state) ?? 0) + 1);
  }
  const total = [...counts.values()].reduce((sum, value) => sum + value, 0);

  return [...counts]
    .map(([state, count]) => ({
      state,
      count,
      percentage: total ? Math.round((count / total) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.count - a.count);
}

export async function getExperienceDistribution(filters?: {
  state?: string;
  practiceArea?: string;
}): Promise<ExperienceDistribution[]> {
  const conditions = [eq(lawyers.isActive, true), isNotNull(lawyers.yearsAtBar)];
  if (filters?.state) conditions.push(eq(lawyers.state, filters.state));
  if (filters?.practiceArea) conditions.push(eq(practiceAreas.slug, filters.practiceArea));

  const rows = filters?.practiceArea
    ? await db
        .select({ years: lawyers.yearsAtBar })
        .from(lawyers)
        .innerJoin(
          lawyerPracticeAreas,
          eq(lawyers.id, lawyerPracticeAreas.lawyerId)
        )
        .innerJoin(
          practiceAreas,
          eq(lawyerPracticeAreas.practiceAreaId, practiceAreas.id)
        )
        .where(and(...conditions))
    : await db
        .select({ years: lawyers.yearsAtBar })
        .from(lawyers)
        .where(and(...conditions));

  const distribution = {
    junior: { count: 0, label: "Junior (0-5 years)" },
    mid: { count: 0, label: "Mid-Level (6-15 years)" },
    senior: { count: 0, label: "Senior (16+ years)" },
  };

  for (const row of rows) {
    if (row.years === null) continue;
    if (row.years <= 5) distribution.junior.count++;
    else if (row.years <= 15) distribution.mid.count++;
    else distribution.senior.count++;
  }

  const total = Object.values(distribution).reduce((sum, item) => sum + item.count, 0);
  return (Object.keys(distribution) as (keyof typeof distribution)[]).map((level) => ({
    level,
    label: distribution[level].label,
    count: distribution[level].count,
    percentage: total ? Math.round((distribution[level].count / total) * 1000) / 10 : 0,
  }));
}

export async function getPracticeAreaStats(filters?: {
  state?: string;
  limit?: number;
}): Promise<PracticeAreaStats[]> {
  const conditions = [eq(practiceAreas.isUserFacing, true)];
  if (filters?.state) conditions.push(eq(lawyers.state, filters.state));

  const rows = await db
    .select({ slug: practiceAreas.slug, name: practiceAreas.name })
    .from(lawyerPracticeAreas)
    .innerJoin(
      practiceAreas,
      eq(lawyerPracticeAreas.practiceAreaId, practiceAreas.id)
    )
    .innerJoin(lawyers, eq(lawyerPracticeAreas.lawyerId, lawyers.id))
    .where(and(...conditions));
  const counts = new Map<string, { name: string; count: number }>();

  for (const row of rows) {
    const current = counts.get(row.slug) ?? { name: row.name, count: 0 };
    current.count++;
    counts.set(row.slug, current);
  }

  const total = [...counts.values()].reduce((sum, item) => sum + item.count, 0);
  return [...counts]
    .map(([slug, value]) => ({
      slug,
      name: value.name,
      count: value.count,
      percentage: total ? Math.round((value.count / total) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, filters?.limit ?? 20);
}

export async function getAdmissionTrends(yearsBack = 10): Promise<AdmissionTrend[]> {
  const currentYear = new Date().getFullYear();
  const startYear = currentYear - yearsBack;
  const startDate = new Date(startYear, 0, 1);
  const rows = await db
    .select({ admissionDate: lawyers.barAdmissionDate })
    .from(lawyers)
    .where(and(isNotNull(lawyers.barAdmissionDate), gte(lawyers.barAdmissionDate, startDate)));
  const counts = new Map<number, number>();
  for (let year = startYear; year <= currentYear; year++) counts.set(year, 0);

  for (const row of rows) {
    if (!row.admissionDate) continue;
    const year = row.admissionDate.getFullYear();
    if (counts.has(year)) counts.set(year, (counts.get(year) ?? 0) + 1);
  }

  return [...counts].map(([year, count]) => ({ year, count }));
}

export async function getUnderservedAreas(): Promise<GeographicStats[]> {
  const geographic = await getGeographicDistribution();
  const statePopulations: Record<string, number> = {
    Selangor: 6990000,
    Johor: 4010000,
    Sabah: 3910000,
    Sarawak: 2820000,
    Perak: 2510000,
    Kedah: 2190000,
    Penang: 1770000,
    Kelantan: 1930000,
    Pahang: 1680000,
    Terengganu: 1290000,
    "Negeri Sembilan": 1170000,
    Melaka: 1020000,
    "Kuala Lumpur": 1980000,
    Perlis: 270000,
    Labuan: 100000,
    Putrajaya: 120000,
  };

  return geographic
    .map((item) => ({
      ...item,
      densityPer100k: (item.count / (statePopulations[item.state] || 1000000)) * 100000,
    }))
    .sort((a, b) => a.densityPer100k - b.densityPer100k)
    .slice(0, 5)
    .map(({ state, count: lawyerCount, percentage }) => ({
      state,
      count: lawyerCount,
      percentage,
    }));
}

export async function getAllInsightsData(filters?: {
  state?: string;
  practiceArea?: string;
}): Promise<InsightsData> {
  const [overall, geographic, experience, practiceAreasData, admissionTrends, underservedAreas] =
    await Promise.all([
      getOverallStats(),
      getGeographicDistribution(filters),
      getExperienceDistribution(filters),
      getPracticeAreaStats(filters),
      getAdmissionTrends(),
      getUnderservedAreas(),
    ]);

  return {
    overall,
    geographic,
    experience,
    practiceAreas: practiceAreasData,
    admissionTrends,
    underservedAreas,
  };
}
