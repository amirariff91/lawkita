import { createServerSupabaseClient } from "@/lib/supabase/client";
import type {
  LawyerCardData,
  LawyerSearchParams,
  LawyerSearchResult,
  LawyerWithRelations,
  ExperienceLevel,
} from "@/types/lawyer";

const EXPERIENCE_THRESHOLDS: Record<ExperienceLevel, { min: number; max: number }> = {
  junior: { min: 0, max: 5 },
  mid: { min: 6, max: 15 },
  senior: { min: 16, max: Infinity },
};

// Get lawyers with filters and pagination
export async function searchLawyers(
  params: LawyerSearchParams
): Promise<LawyerSearchResult> {
  const {
    query,
    practiceArea,
    state,
    city,
    experienceLevel,
    sort = "relevance",
    page = 1,
    limit = 20,
    showInactive = false,
  } = params;

  const offset = (page - 1) * limit;
  const supabase = createServerSupabaseClient();

  // If filtering by practice area, get the lawyer IDs first
  let practiceAreaLawyerIds: Set<string> | null = null;
  if (practiceArea) {
    const { data: practiceAreaRecord } = await supabase
      .from("practice_areas")
      .select("id")
      .eq("slug", practiceArea)
      .single();

    if (practiceAreaRecord) {
      const { data: lawyerIdsInArea } = await supabase
        .from("lawyer_practice_areas")
        .select("lawyer_id")
        .eq("practice_area_id", practiceAreaRecord.id);

      practiceAreaLawyerIds = new Set(lawyerIdsInArea?.map((l) => l.lawyer_id) ?? []);
    } else {
      // Practice area not found - return empty results
      return {
        lawyers: [],
        total: 0,
        page,
        totalPages: 0,
        hasMore: false,
      };
    }
  }

  // Start building the query
  let queryBuilder = supabase
    .from("lawyers")
    .select(`
      id,
      slug,
      name,
      photo,
      bio,
      state,
      city,
      firm_name,
      is_verified,
      is_claimed,
      subscription_tier,
      years_at_bar,
      review_count,
      average_rating,
      response_rate,
      bar_status,
      bar_membership_number,
      last_scraped_at
    `, { count: "exact" });

  // Only filter by is_active if showInactive is false
  if (!showInactive) {
    queryBuilder = queryBuilder.eq("is_active", true);
  }

  // Filter by practice area lawyer IDs at database level
  if (practiceAreaLawyerIds !== null) {
    if (practiceAreaLawyerIds.size === 0) {
      // No lawyers in this practice area
      return {
        lawyers: [],
        total: 0,
        page,
        totalPages: 0,
        hasMore: false,
      };
    }
    queryBuilder = queryBuilder.in("id", Array.from(practiceAreaLawyerIds));
  }

  // Apply filters
  if (query) {
    queryBuilder = queryBuilder.or(`name.ilike.%${query}%,firm_name.ilike.%${query}%,bio.ilike.%${query}%`);
  }

  if (state) {
    queryBuilder = queryBuilder.eq("state", state);
  }

  if (city) {
    queryBuilder = queryBuilder.eq("city", city);
  }

  if (experienceLevel) {
    const threshold = EXPERIENCE_THRESHOLDS[experienceLevel];
    queryBuilder = queryBuilder.gte("years_at_bar", threshold.min);
    if (threshold.max !== Infinity) {
      queryBuilder = queryBuilder.lte("years_at_bar", threshold.max);
    }
  }

  // Apply sorting
  switch (sort) {
    case "experience":
      queryBuilder = queryBuilder.order("years_at_bar", { ascending: false });
      break;
    case "rating":
      queryBuilder = queryBuilder.order("average_rating", { ascending: false, nullsFirst: false });
      break;
    case "reviews":
      queryBuilder = queryBuilder.order("review_count", { ascending: false, nullsFirst: false });
      break;
    case "relevance":
    default:
      // Order by subscription tier (featured > premium > free), then by review count
      queryBuilder = queryBuilder
        .order("subscription_tier", { ascending: false })
        .order("review_count", { ascending: false, nullsFirst: false });
      break;
  }

  // Apply pagination
  queryBuilder = queryBuilder.range(offset, offset + limit - 1);

  const { data: lawyerResults, error, count } = await queryBuilder;

  if (error) {
    console.error("Error fetching lawyers:", error);
    return {
      lawyers: [],
      total: 0,
      page,
      totalPages: 0,
      hasMore: false,
    };
  }

  const total = count ?? 0;

  // Get practice areas for the returned lawyers
  const lawyerIds = lawyerResults?.map((l) => l.id) ?? [];
  const practiceAreaMap: Map<string, string[]> = new Map();

  if (lawyerIds.length > 0) {
    const { data: practiceAreaData } = await supabase
      .from("lawyer_practice_areas")
      .select(`
        lawyer_id,
        practice_areas!inner(name)
      `)
      .in("lawyer_id", lawyerIds);

    if (practiceAreaData) {
      for (const row of practiceAreaData) {
        const existing = practiceAreaMap.get(row.lawyer_id) ?? [];
        // @ts-expect-error - Supabase types don't handle nested selects well
        existing.push(row.practice_areas.name);
        practiceAreaMap.set(row.lawyer_id, existing);
      }
    }
  }

  // Map to LawyerCardData
  const lawyerCards: LawyerCardData[] = (lawyerResults ?? []).map((lawyer) => ({
    id: lawyer.id,
    slug: lawyer.slug,
    name: lawyer.name,
    photo: lawyer.photo,
    bio: lawyer.bio,
    state: lawyer.state,
    city: lawyer.city,
    firmName: lawyer.firm_name,
    isVerified: lawyer.is_verified,
    isClaimed: lawyer.is_claimed,
    subscriptionTier: lawyer.subscription_tier as "free" | "premium" | "featured",
    yearsAtBar: lawyer.years_at_bar,
    reviewCount: lawyer.review_count ?? 0,
    averageRating: lawyer.average_rating,
    responseRate: lawyer.response_rate,
    practiceAreas: practiceAreaMap.get(lawyer.id) ?? [],
    barStatus: lawyer.bar_status as LawyerCardData["barStatus"],
    barMembershipNumber: lawyer.bar_membership_number,
    lastScrapedAt: lawyer.last_scraped_at ? new Date(lawyer.last_scraped_at) : null,
  }));

  const totalPages = Math.ceil(total / limit);

  return {
    lawyers: lawyerCards,
    total,
    page,
    totalPages,
    hasMore: page < totalPages,
  };
}

// Get lawyer by slug with full relations
export async function getLawyerBySlug(
  slug: string
): Promise<LawyerWithRelations | null> {
  const supabase = createServerSupabaseClient();

  const { data: lawyer, error } = await supabase
    .from("lawyers")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  if (error || !lawyer) {
    return null;
  }

  // Get practice areas
  const { data: practiceAreasData } = await supabase
    .from("lawyer_practice_areas")
    .select(`
      experience_level,
      years_experience,
      practice_areas!inner(*)
    `)
    .eq("lawyer_id", lawyer.id);

  // Get reviews (published only)
  const { data: reviewsData } = await supabase
    .from("reviews")
    .select("*")
    .eq("lawyer_id", lawyer.id)
    .eq("is_published", true)
    .order("created_at", { ascending: false });

  // Get education
  const { data: educationData } = await supabase
    .from("lawyer_education")
    .select("id, institution, degree, field, graduation_year")
    .eq("lawyer_id", lawyer.id)
    .order("graduation_year", { ascending: false });

  // Get qualifications
  const { data: qualificationsData } = await supabase
    .from("lawyer_qualifications")
    .select("id, title, issuing_body, issued_at")
    .eq("lawyer_id", lawyer.id);

  // Get cases
  const { data: casesData } = await supabase
    .from("case_lawyers")
    .select(`
      case_id,
      role,
      role_description,
      cases!inner(id, slug, title, category, status, is_published)
    `)
    .eq("lawyer_id", lawyer.id)
    .eq("cases.is_published", true);

  // Transform to match the expected type
  return {
    id: lawyer.id,
    userId: lawyer.user_id,
    slug: lawyer.slug,
    name: lawyer.name,
    email: lawyer.email,
    phone: lawyer.phone,
    photo: lawyer.photo,
    bio: lawyer.bio,
    barMembershipNumber: lawyer.bar_membership_number,
    barAdmissionDate: lawyer.bar_admission_date ? new Date(lawyer.bar_admission_date) : null,
    barStatus: lawyer.bar_status,
    state: lawyer.state,
    city: lawyer.city,
    address: lawyer.address,
    primaryFirmId: lawyer.primary_firm_id,
    firmName: lawyer.firm_name,
    isVerified: lawyer.is_verified,
    isClaimed: lawyer.is_claimed,
    isActive: lawyer.is_active,
    verifiedAt: lawyer.verified_at ? new Date(lawyer.verified_at) : null,
    claimedAt: lawyer.claimed_at ? new Date(lawyer.claimed_at) : null,
    subscriptionTier: lawyer.subscription_tier,
    subscriptionExpiresAt: lawyer.subscription_expires_at ? new Date(lawyer.subscription_expires_at) : null,
    yearsAtBar: lawyer.years_at_bar,
    courtAppearances: lawyer.court_appearances,
    reviewCount: lawyer.review_count,
    averageRating: lawyer.average_rating,
    responseRate: lawyer.response_rate,
    avgResponseTimeHours: lawyer.avg_response_time_hours,
    caseAssociationOptOut: lawyer.case_association_opt_out ?? false,
    optOutRequestedAt: lawyer.opt_out_requested_at ? new Date(lawyer.opt_out_requested_at) : null,
    scrapedData: lawyer.scraped_data,
    lastScrapedAt: lawyer.last_scraped_at ? new Date(lawyer.last_scraped_at) : null,
    createdAt: new Date(lawyer.created_at),
    updatedAt: new Date(lawyer.updated_at),
    practiceAreas: (practiceAreasData ?? []).map((pa) => ({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      practiceArea: (pa as any).practice_areas,
      experienceLevel: pa.experience_level,
      yearsExperience: pa.years_experience,
    })),
    reviews: (reviewsData ?? []).map((r) => ({
      ...r,
      createdAt: new Date(r.created_at),
      updatedAt: new Date(r.updated_at),
      verifiedAt: r.verified_at ? new Date(r.verified_at) : null,
    })),
    education: (educationData ?? []).map((e) => ({
      id: e.id,
      institution: e.institution,
      degree: e.degree,
      field: e.field,
      graduationYear: e.graduation_year,
    })),
    qualifications: (qualificationsData ?? []).map((q) => ({
      id: q.id,
      title: q.title,
      issuingBody: q.issuing_body,
      issuedAt: q.issued_at ? new Date(q.issued_at) : null,
    })),
    cases: (casesData ?? []).map((c) => ({
      caseId: c.case_id,
      role: c.role,
      roleDescription: c.role_description,
      case: {
        // @ts-expect-error - Supabase types
        id: c.cases.id,
        // @ts-expect-error - Supabase types
        slug: c.cases.slug,
        // @ts-expect-error - Supabase types
        title: c.cases.title,
        // @ts-expect-error - Supabase types
        category: c.cases.category,
        // @ts-expect-error - Supabase types
        status: c.cases.status,
      },
    })),
  };
}

// Get lawyers by practice area slug
export async function getLawyersByPracticeArea(
  practiceAreaSlug: string,
  limit = 20,
  page = 1
): Promise<LawyerSearchResult> {
  return searchLawyers({
    practiceArea: practiceAreaSlug,
    limit,
    page,
  });
}

// Get lawyers by location
export async function getLawyersByLocation(
  state: string,
  city?: string,
  limit = 20,
  page = 1
): Promise<LawyerSearchResult> {
  return searchLawyers({
    state,
    city,
    limit,
    page,
  });
}

// Get featured lawyers for homepage/landing pages
export async function getFeaturedLawyers(limit = 6): Promise<LawyerCardData[]> {
  const result = await searchLawyers({
    limit,
    sort: "relevance",
  });
  return result.lawyers;
}

// Get lawyer count by state (for location pages)
export async function getLawyerCountsByState(): Promise<
  { state: string; count: number }[]
> {
  const supabase = createServerSupabaseClient();

  const { data } = await supabase
    .from("lawyers")
    .select("state")
    .eq("is_active", true)
    .not("state", "is", null);

  if (!data) return [];

  // Count by state manually
  const counts: Record<string, number> = {};
  for (const row of data) {
    if (row.state) {
      counts[row.state] = (counts[row.state] || 0) + 1;
    }
  }

  return Object.entries(counts).map(([state, count]) => ({ state, count }));
}

// Get lawyer count by practice area
export async function getLawyerCountsByPracticeArea(): Promise<
  { slug: string; name: string; count: number }[]
> {
  const supabase = createServerSupabaseClient();

  const { data } = await supabase
    .from("lawyer_practice_areas")
    .select(`
      practice_areas!inner(slug, name, is_user_facing)
    `);

  if (!data) return [];

  // Count by practice area manually
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

  return Object.entries(counts)
    .map(([slug, { name, count }]) => ({ slug, name, count }))
    .sort((a, b) => b.count - a.count);
}

// Get newly admitted lawyers (admitted within last 12 months)
export async function getNewlyAdmittedLawyers(
  limit = 20,
  page = 1
): Promise<LawyerSearchResult> {
  const offset = (page - 1) * limit;
  const supabase = createServerSupabaseClient();

  // Query for lawyers with years_at_bar < 1
  let queryBuilder = supabase
    .from("lawyers")
    .select(`
      id,
      slug,
      name,
      photo,
      bio,
      state,
      city,
      firm_name,
      is_verified,
      is_claimed,
      subscription_tier,
      years_at_bar,
      review_count,
      average_rating,
      response_rate,
      bar_status,
      bar_membership_number,
      last_scraped_at
    `, { count: "exact" })
    .eq("is_active", true)
    .lt("years_at_bar", 1)
    .order("years_at_bar", { ascending: true })
    .range(offset, offset + limit - 1);

  const { data: lawyerResults, error, count } = await queryBuilder;

  if (error) {
    console.error("Error fetching newly admitted lawyers:", error);
    return {
      lawyers: [],
      total: 0,
      page,
      totalPages: 0,
      hasMore: false,
    };
  }

  const total = count ?? 0;

  // Get practice areas for the returned lawyers
  const lawyerIds = lawyerResults?.map((l) => l.id) ?? [];
  let practiceAreaMap: Map<string, string[]> = new Map();

  if (lawyerIds.length > 0) {
    const { data: practiceAreaData } = await supabase
      .from("lawyer_practice_areas")
      .select(`
        lawyer_id,
        practice_areas!inner(name)
      `)
      .in("lawyer_id", lawyerIds);

    if (practiceAreaData) {
      for (const row of practiceAreaData) {
        const existing = practiceAreaMap.get(row.lawyer_id) ?? [];
        // @ts-expect-error - Supabase types don't handle nested selects well
        existing.push(row.practice_areas.name);
        practiceAreaMap.set(row.lawyer_id, existing);
      }
    }
  }

  // Map to LawyerCardData
  const lawyerCards: LawyerCardData[] = (lawyerResults ?? []).map((lawyer) => ({
    id: lawyer.id,
    slug: lawyer.slug,
    name: lawyer.name,
    photo: lawyer.photo,
    bio: lawyer.bio,
    state: lawyer.state,
    city: lawyer.city,
    firmName: lawyer.firm_name,
    isVerified: lawyer.is_verified,
    isClaimed: lawyer.is_claimed,
    subscriptionTier: lawyer.subscription_tier as "free" | "premium" | "featured",
    yearsAtBar: lawyer.years_at_bar,
    reviewCount: lawyer.review_count ?? 0,
    averageRating: lawyer.average_rating,
    responseRate: lawyer.response_rate,
    practiceAreas: practiceAreaMap.get(lawyer.id) ?? [],
    barStatus: lawyer.bar_status as LawyerCardData["barStatus"],
    barMembershipNumber: lawyer.bar_membership_number,
    lastScrapedAt: lawyer.last_scraped_at ? new Date(lawyer.last_scraped_at) : null,
  }));

  const totalPages = Math.ceil(total / limit);

  return {
    lawyers: lawyerCards,
    total,
    page,
    totalPages,
    hasMore: page < totalPages,
  };
}

// Get similar lawyers based on location, practice areas, and experience
export async function getSimilarLawyers(
  lawyerSlug: string,
  limit = 4
): Promise<LawyerCardData[]> {
  const supabase = createServerSupabaseClient();

  // First get the target lawyer
  const { data: targetLawyer } = await supabase
    .from("lawyers")
    .select(`
      id,
      state,
      city,
      years_at_bar
    `)
    .eq("slug", lawyerSlug)
    .single();

  if (!targetLawyer) return [];

  // Get target lawyer's practice areas
  const { data: targetPracticeAreas } = await supabase
    .from("lawyer_practice_areas")
    .select("practice_area_id")
    .eq("lawyer_id", targetLawyer.id);

  const targetPracticeAreaIds = targetPracticeAreas?.map((pa) => pa.practice_area_id) ?? [];

  // Find similar lawyers - prioritize same state/city and overlapping practice areas
  let queryBuilder = supabase
    .from("lawyers")
    .select(`
      id,
      slug,
      name,
      photo,
      bio,
      state,
      city,
      firm_name,
      is_verified,
      is_claimed,
      subscription_tier,
      years_at_bar,
      review_count,
      average_rating,
      response_rate,
      bar_status,
      bar_membership_number,
      last_scraped_at
    `)
    .eq("is_active", true)
    .neq("id", targetLawyer.id) // Exclude the target lawyer
    .in("bar_status", ["active"])
    .limit(50); // Get more candidates to filter

  // Prioritize same state/city
  if (targetLawyer.state) {
    queryBuilder = queryBuilder.eq("state", targetLawyer.state);
  }

  const { data: candidates } = await queryBuilder;

  if (!candidates || candidates.length === 0) return [];

  // Get practice areas for candidates
  const candidateIds = candidates.map((c) => c.id);
  const { data: candidatePracticeAreas } = await supabase
    .from("lawyer_practice_areas")
    .select(`
      lawyer_id,
      practice_area_id,
      practice_areas!inner(name)
    `)
    .in("lawyer_id", candidateIds);

  // Build practice area map
  const practiceAreaMap: Map<string, string[]> = new Map();
  const practiceAreaIdMap: Map<string, string[]> = new Map();

  if (candidatePracticeAreas) {
    for (const row of candidatePracticeAreas) {
      const existingNames = practiceAreaMap.get(row.lawyer_id) ?? [];
      const existingIds = practiceAreaIdMap.get(row.lawyer_id) ?? [];
      // @ts-expect-error - Supabase types
      existingNames.push(row.practice_areas.name);
      existingIds.push(row.practice_area_id);
      practiceAreaMap.set(row.lawyer_id, existingNames);
      practiceAreaIdMap.set(row.lawyer_id, existingIds);
    }
  }

  // Score and rank candidates
  const scoredCandidates = candidates.map((lawyer) => {
    const lawyerPracticeAreaIds = practiceAreaIdMap.get(lawyer.id) ?? [];

    // Calculate practice area overlap
    const overlap = lawyerPracticeAreaIds.filter((id) =>
      targetPracticeAreaIds.includes(id)
    ).length;
    const practiceScore = targetPracticeAreaIds.length > 0
      ? overlap / targetPracticeAreaIds.length
      : 0;

    // Calculate location score
    let locationScore = 0;
    if (lawyer.city === targetLawyer.city) {
      locationScore = 1;
    } else if (lawyer.state === targetLawyer.state) {
      locationScore = 0.6;
    }

    // Calculate experience similarity
    let experienceScore = 0.5;
    if (targetLawyer.years_at_bar !== null && lawyer.years_at_bar !== null) {
      const diff = Math.abs(targetLawyer.years_at_bar - lawyer.years_at_bar);
      if (diff <= 2) experienceScore = 1;
      else if (diff <= 5) experienceScore = 0.7;
      else if (diff <= 10) experienceScore = 0.4;
      else experienceScore = 0.2;
    }

    // Weighted score
    const totalScore =
      locationScore * 0.33 + practiceScore * 0.34 + experienceScore * 0.33;

    return { lawyer, score: totalScore };
  });

  // Sort by score and take top N
  const topCandidates = scoredCandidates
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  // Map to LawyerCardData
  return topCandidates.map(({ lawyer }) => ({
    id: lawyer.id,
    slug: lawyer.slug,
    name: lawyer.name,
    photo: lawyer.photo,
    bio: lawyer.bio,
    state: lawyer.state,
    city: lawyer.city,
    firmName: lawyer.firm_name,
    isVerified: lawyer.is_verified,
    isClaimed: lawyer.is_claimed,
    subscriptionTier: lawyer.subscription_tier as "free" | "premium" | "featured",
    yearsAtBar: lawyer.years_at_bar,
    reviewCount: lawyer.review_count ?? 0,
    averageRating: lawyer.average_rating,
    responseRate: lawyer.response_rate,
    practiceAreas: practiceAreaMap.get(lawyer.id) ?? [],
    barStatus: lawyer.bar_status as LawyerCardData["barStatus"],
    barMembershipNumber: lawyer.bar_membership_number,
    lastScrapedAt: lawyer.last_scraped_at ? new Date(lawyer.last_scraped_at) : null,
  }));
}
