import { createServerSupabaseClient } from "@/lib/supabase/client";

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

/**
 * Get overall statistics
 */
export async function getOverallStats(): Promise<OverallStats> {
  const supabase = createServerSupabaseClient();

  // Get lawyer counts
  const { count: totalLawyers } = await supabase
    .from("lawyers")
    .select("*", { count: "exact", head: true });

  const { count: activeLawyers } = await supabase
    .from("lawyers")
    .select("*", { count: "exact", head: true })
    .eq("is_active", true)
    .eq("bar_status", "active");

  const { count: verifiedLawyers } = await supabase
    .from("lawyers")
    .select("*", { count: "exact", head: true })
    .eq("is_verified", true);

  const { count: claimedProfiles } = await supabase
    .from("lawyers")
    .select("*", { count: "exact", head: true })
    .eq("is_claimed", true);

  // Get average years experience
  const { data: avgData } = await supabase
    .from("lawyers")
    .select("years_at_bar")
    .eq("is_active", true)
    .not("years_at_bar", "is", null);

  const validYears = avgData?.map((l) => l.years_at_bar).filter((y): y is number => y !== null) ?? [];
  const avgYearsExperience = validYears.length > 0
    ? validYears.reduce((a, b) => a + b, 0) / validYears.length
    : 0;

  // Get firm count
  const { count: totalFirms } = await supabase
    .from("firms")
    .select("*", { count: "exact", head: true });

  // Get practice area count
  const { count: totalPracticeAreas } = await supabase
    .from("practice_areas")
    .select("*", { count: "exact", head: true })
    .eq("is_user_facing", true);

  return {
    totalLawyers: totalLawyers ?? 0,
    activeLawyers: activeLawyers ?? 0,
    verifiedLawyers: verifiedLawyers ?? 0,
    claimedProfiles: claimedProfiles ?? 0,
    avgYearsExperience: Math.round(avgYearsExperience * 10) / 10,
    totalFirms: totalFirms ?? 0,
    totalPracticeAreas: totalPracticeAreas ?? 0,
  };
}

/**
 * Get geographic distribution of lawyers by state
 */
export async function getGeographicDistribution(filters?: {
  practiceArea?: string;
}): Promise<GeographicStats[]> {
  const supabase = createServerSupabaseClient();

  let query = supabase
    .from("lawyers")
    .select("state")
    .eq("is_active", true)
    .not("state", "is", null);

  // If filtering by practice area, we need to join
  if (filters?.practiceArea) {
    const { data: lawyerIds } = await supabase
      .from("lawyer_practice_areas")
      .select("lawyer_id, practice_areas!inner(slug)")
      .eq("practice_areas.slug", filters.practiceArea);

    if (lawyerIds && lawyerIds.length > 0) {
      query = query.in("id", lawyerIds.map((l) => l.lawyer_id));
    }
  }

  const { data } = await query;

  if (!data) return [];

  // Count by state
  const counts: Record<string, number> = {};
  for (const row of data) {
    if (row.state) {
      counts[row.state] = (counts[row.state] || 0) + 1;
    }
  }

  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return Object.entries(counts)
    .map(([state, count]) => ({
      state,
      count,
      percentage: Math.round((count / total) * 1000) / 10,
    }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Get experience level distribution
 */
export async function getExperienceDistribution(filters?: {
  state?: string;
  practiceArea?: string;
}): Promise<ExperienceDistribution[]> {
  const supabase = createServerSupabaseClient();

  let query = supabase
    .from("lawyers")
    .select("years_at_bar")
    .eq("is_active", true)
    .not("years_at_bar", "is", null);

  if (filters?.state) {
    query = query.eq("state", filters.state);
  }

  const { data } = await query;

  if (!data) return [];

  // Categorize by experience level
  const distribution = {
    junior: { count: 0, label: "Junior (0-5 years)" },
    mid: { count: 0, label: "Mid-Level (6-15 years)" },
    senior: { count: 0, label: "Senior (16+ years)" },
  };

  for (const row of data) {
    const years = row.years_at_bar;
    if (years === null) continue;

    if (years <= 5) {
      distribution.junior.count++;
    } else if (years <= 15) {
      distribution.mid.count++;
    } else {
      distribution.senior.count++;
    }
  }

  const total = distribution.junior.count + distribution.mid.count + distribution.senior.count;

  return (["junior", "mid", "senior"] as const).map((level) => ({
    level,
    label: distribution[level].label,
    count: distribution[level].count,
    percentage: total > 0 ? Math.round((distribution[level].count / total) * 1000) / 10 : 0,
  }));
}

/**
 * Get practice area statistics
 */
export async function getPracticeAreaStats(filters?: {
  state?: string;
  limit?: number;
}): Promise<PracticeAreaStats[]> {
  const supabase = createServerSupabaseClient();
  const limit = filters?.limit ?? 20;

  let lawyerIds: string[] | null = null;

  // If filtering by state, get lawyer IDs first
  if (filters?.state) {
    const { data: lawyers } = await supabase
      .from("lawyers")
      .select("id")
      .eq("state", filters.state)
      .eq("is_active", true);

    lawyerIds = lawyers?.map((l) => l.id) ?? [];
  }

  // Get practice area counts
  let query = supabase
    .from("lawyer_practice_areas")
    .select(`
      practice_area_id,
      practice_areas!inner(slug, name, is_user_facing)
    `);

  if (lawyerIds) {
    query = query.in("lawyer_id", lawyerIds);
  }

  const { data } = await query;

  if (!data) return [];

  // Count by practice area
  const counts: Record<string, { name: string; count: number }> = {};
  for (const row of data) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pa = (row as any).practice_areas;
    if (pa?.is_user_facing) {
      if (!counts[pa.slug]) {
        counts[pa.slug] = { name: pa.name, count: 0 };
      }
      counts[pa.slug].count++;
    }
  }

  const total = Object.values(counts).reduce((a, b) => a + b.count, 0);

  return Object.entries(counts)
    .map(([slug, { name, count }]) => ({
      slug,
      name,
      count,
      percentage: total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/**
 * Get admission trends by year
 */
export async function getAdmissionTrends(
  yearsBack = 10
): Promise<AdmissionTrend[]> {
  const supabase = createServerSupabaseClient();
  const currentYear = new Date().getFullYear();
  const startYear = currentYear - yearsBack;

  const { data } = await supabase
    .from("lawyers")
    .select("bar_admission_date")
    .not("bar_admission_date", "is", null)
    .gte("bar_admission_date", `${startYear}-01-01`);

  if (!data) return [];

  // Count by year
  const counts: Record<number, number> = {};
  for (let year = startYear; year <= currentYear; year++) {
    counts[year] = 0;
  }

  for (const row of data) {
    if (row.bar_admission_date) {
      const year = new Date(row.bar_admission_date).getFullYear();
      if (year >= startYear && year <= currentYear) {
        counts[year]++;
      }
    }
  }

  return Object.entries(counts)
    .map(([year, count]) => ({
      year: parseInt(year),
      count,
    }))
    .sort((a, b) => a.year - b.year);
}

/**
 * Get underserved areas (states with few lawyers relative to population)
 */
export async function getUnderservedAreas(): Promise<GeographicStats[]> {
  const geographic = await getGeographicDistribution();

  // Malaysian state populations (approximate, 2023)
  const statePopulations: Record<string, number> = {
    "Selangor": 6990000,
    "Johor": 4010000,
    "Sabah": 3910000,
    "Sarawak": 2820000,
    "Perak": 2510000,
    "Kedah": 2190000,
    "Penang": 1770000,
    "Kelantan": 1930000,
    "Pahang": 1680000,
    "Terengganu": 1290000,
    "Negeri Sembilan": 1170000,
    "Melaka": 1020000,
    "Kuala Lumpur": 1980000,
    "Perlis": 270000,
    "Labuan": 100000,
    "Putrajaya": 120000,
  };

  // Calculate lawyers per 100,000 population
  const withDensity = geographic.map((g) => {
    const population = statePopulations[g.state] || 1000000;
    const densityPer100k = (g.count / population) * 100000;
    return {
      ...g,
      densityPer100k,
    };
  });

  // Return states with lowest density
  return withDensity
    .sort((a, b) => a.densityPer100k - b.densityPer100k)
    .slice(0, 5)
    .map(({ state, count, percentage }) => ({ state, count, percentage }));
}

/**
 * Get all insights data in one call
 */
export async function getAllInsightsData(filters?: {
  state?: string;
  practiceArea?: string;
}): Promise<InsightsData> {
  const [overall, geographic, experience, practiceAreas, admissionTrends, underservedAreas] =
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
    practiceAreas,
    admissionTrends,
    underservedAreas,
  };
}
