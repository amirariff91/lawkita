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
  } = params;

  const offset = (page - 1) * limit;
  const supabase = createServerSupabaseClient();

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
      response_rate
    `, { count: "exact" })
    .eq("is_active", true);

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

  // If filtering by practice area, we need to filter the results
  if (practiceArea && lawyerResults) {
    // Get the practice area ID first
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

      const validIds = new Set(lawyerIdsInArea?.map((l) => l.lawyer_id) ?? []);

      // Filter the results
      const filteredResults = lawyerResults.filter((l) => validIds.has(l.id));

      // Map to LawyerCardData
      const lawyerCards: LawyerCardData[] = filteredResults.map((lawyer) => ({
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
      }));

      const filteredTotal = filteredResults.length;
      const totalPages = Math.ceil(filteredTotal / limit);

      return {
        lawyers: lawyerCards,
        total: filteredTotal,
        page,
        totalPages,
        hasMore: page < totalPages,
      };
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
