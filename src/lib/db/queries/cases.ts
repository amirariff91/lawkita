import { createServerSupabaseClient } from "@/lib/supabase/client";
import type {
  CaseCardData,
  CaseCardDataWithLawyers,
  CaseLawyerPreview,
  CaseSearchParams,
  CaseSearchResult,
  CaseWithRelations,
  CaseCategory,
  CaseStatus,
  LawyerRole,
  TimelineEvent,
  CaseLawyerWithDetails,
} from "@/types/case";

// Search result type with lawyers
export interface CaseSearchResultWithLawyers {
  cases: CaseCardDataWithLawyers[];
  total: number;
  page: number;
  totalPages: number;
  hasMore: boolean;
}

// Search cases with filters and pagination
export async function searchCases(
  params: CaseSearchParams
): Promise<CaseSearchResult> {
  const {
    query,
    category,
    status,
    tag,
    featured,
    page = 1,
    limit = 12,
  } = params;

  const offset = (page - 1) * limit;
  const supabase = createServerSupabaseClient();

  // Start building the query
  let queryBuilder = supabase
    .from("cases")
    .select(`
      id,
      slug,
      title,
      subtitle,
      description,
      category,
      status,
      is_featured,
      outcome,
      verdict_date,
      tags,
      og_image
    `, { count: "exact" })
    .eq("is_published", true);

  // Apply filters
  if (query) {
    queryBuilder = queryBuilder.or(`title.ilike.%${query}%,subtitle.ilike.%${query}%,description.ilike.%${query}%`);
  }

  if (category) {
    queryBuilder = queryBuilder.eq("category", category);
  }

  if (status) {
    queryBuilder = queryBuilder.eq("status", status);
  }

  if (featured) {
    queryBuilder = queryBuilder.eq("is_featured", true);
  }

  if (tag) {
    // PostgreSQL array contains - tags is a jsonb array
    queryBuilder = queryBuilder.contains("tags", [tag]);
  }

  // Apply sorting: featured first, then by verdict date, then by created_at
  queryBuilder = queryBuilder
    .order("is_featured", { ascending: false })
    .order("verdict_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  // Apply pagination
  queryBuilder = queryBuilder.range(offset, offset + limit - 1);

  const { data: caseResults, error, count } = await queryBuilder;

  if (error) {
    console.error("Error fetching cases:", error);
    return {
      cases: [],
      total: 0,
      page,
      totalPages: 0,
      hasMore: false,
    };
  }

  const total = count ?? 0;

  const caseCards: CaseCardData[] = (caseResults ?? []).map((c) => ({
    id: c.id,
    slug: c.slug,
    title: c.title,
    subtitle: c.subtitle,
    description: c.description,
    category: c.category as CaseCategory,
    status: c.status as CaseStatus,
    isFeatured: c.is_featured,
    outcome: c.outcome,
    verdictDate: c.verdict_date ?? null,
    tags: (c.tags as string[]) || [],
    ogImage: c.og_image,
  }));

  const totalPages = Math.ceil(total / limit);

  return {
    cases: caseCards,
    total,
    page,
    totalPages,
    hasMore: page < totalPages,
  };
}

// Get featured cases for homepage
export async function getFeaturedCases(limit = 6): Promise<CaseCardData[]> {
  const result = await searchCases({
    featured: true,
    limit,
  });
  return result.cases;
}

// Get case by slug with full relations
export async function getCaseBySlug(
  slug: string
): Promise<CaseWithRelations | null> {
  const supabase = createServerSupabaseClient();

  // Fetch the case
  const { data: caseData, error } = await supabase
    .from("cases")
    .select("*")
    .eq("slug", slug)
    .eq("is_published", true)
    .single();

  if (error || !caseData) {
    return null;
  }

  // Get timeline events
  const { data: timelineData } = await supabase
    .from("case_timeline")
    .select("id, date, title, description, court, image, sort_order")
    .eq("case_id", caseData.id)
    .order("date", { ascending: true })
    .order("sort_order", { ascending: true });

  const timeline: TimelineEvent[] = (timelineData ?? []).map((t) => ({
    id: t.id,
    date: t.date,
    title: t.title,
    description: t.description,
    court: t.court,
    image: t.image,
    sortOrder: t.sort_order,
  }));

  // Get lawyers with their details
  const { data: lawyersData } = await supabase
    .from("case_lawyers")
    .select(`
      lawyer_id,
      role,
      role_description,
      is_verified,
      lawyers!inner(slug, name, photo, firm_name, is_verified)
    `)
    .eq("case_id", caseData.id);

  const caseLawyersList: CaseLawyerWithDetails[] = (lawyersData ?? []).map((l) => ({
    lawyerId: l.lawyer_id,
    role: l.role as CaseLawyerWithDetails["role"],
    roleDescription: l.role_description,
    isVerified: l.is_verified,
    lawyer: {
      // @ts-expect-error - Supabase types don't handle nested selects well
      slug: l.lawyers.slug,
      // @ts-expect-error - Supabase types don't handle nested selects well
      name: l.lawyers.name,
      // @ts-expect-error - Supabase types don't handle nested selects well
      photo: l.lawyers.photo,
      // @ts-expect-error - Supabase types don't handle nested selects well
      firmName: l.lawyers.firm_name,
      // @ts-expect-error - Supabase types don't handle nested selects well
      isVerified: l.lawyers.is_verified,
    },
  }));

  // Get media references
  const { data: mediaData } = await supabase
    .from("case_media_references")
    .select("*")
    .eq("case_id", caseData.id)
    .order("published_at", { ascending: false });

  return {
    id: caseData.id,
    slug: caseData.slug,
    title: caseData.title,
    subtitle: caseData.subtitle,
    description: caseData.description,
    category: caseData.category,
    caseNumber: caseData.case_number,
    citation: caseData.citation,
    court: caseData.court,
    alternativeNames: caseData.alternative_names,
    status: caseData.status,
    isPublished: caseData.is_published,
    isFeatured: caseData.is_featured,
    verdictSummary: caseData.verdict_summary,
    verdictDate: caseData.verdict_date ? new Date(caseData.verdict_date) : null,
    outcome: caseData.outcome,
    durationDays: caseData.duration_days,
    witnessCount: caseData.witness_count,
    hearingCount: caseData.hearing_count,
    chargeCount: caseData.charge_count,
    ogImage: caseData.og_image,
    metaDescription: caseData.meta_description,
    tags: caseData.tags,
    createdAt: new Date(caseData.created_at),
    updatedAt: new Date(caseData.updated_at),
    timeline,
    lawyers: caseLawyersList,
    mediaReferences: (mediaData ?? []).map((m) => ({
      id: m.id,
      caseId: m.case_id,
      source: m.source,
      title: m.title,
      url: m.url,
      publishedAt: m.published_at ? new Date(m.published_at) : null,
      excerpt: m.excerpt,
      createdAt: new Date(m.created_at),
    })),
  };
}

// Get all unique tags from published cases
export async function getAllCaseTags(): Promise<string[]> {
  const supabase = createServerSupabaseClient();

  const { data } = await supabase
    .from("cases")
    .select("tags")
    .eq("is_published", true);

  const allTags = new Set<string>();
  for (const row of data ?? []) {
    const tags = (row.tags as string[]) || [];
    for (const tag of tags) {
      allTags.add(tag);
    }
  }

  return Array.from(allTags).sort();
}

// Get case counts by category
export async function getCaseCountsByCategory(): Promise<
  { category: CaseCategory; count: number }[]
> {
  const supabase = createServerSupabaseClient();

  const { data } = await supabase
    .from("cases")
    .select("category")
    .eq("is_published", true);

  if (!data) return [];

  // Count by category manually
  const counts: Record<string, number> = {};
  for (const row of data) {
    if (row.category) {
      counts[row.category] = (counts[row.category] || 0) + 1;
    }
  }

  return Object.entries(counts).map(([category, count]) => ({
    category: category as CaseCategory,
    count,
  }));
}

// Get case counts by status
export async function getCaseCountsByStatus(): Promise<
  { status: CaseStatus; count: number }[]
> {
  const supabase = createServerSupabaseClient();

  const { data } = await supabase
    .from("cases")
    .select("status")
    .eq("is_published", true);

  if (!data) return [];

  // Count by status manually
  const counts: Record<string, number> = {};
  for (const row of data) {
    if (row.status) {
      counts[row.status] = (counts[row.status] || 0) + 1;
    }
  }

  return Object.entries(counts).map(([status, count]) => ({
    status: status as CaseStatus,
    count,
  }));
}

// Role priority for sorting lawyers (prosecution, defense, judge, other)
const ROLE_PRIORITY: Record<LawyerRole, number> = {
  prosecution: 1,
  defense: 2,
  judge: 3,
  other: 4,
};

// Search cases with filters, pagination, and lawyers (batch loaded)
export async function searchCasesWithLawyers(
  params: CaseSearchParams
): Promise<CaseSearchResultWithLawyers> {
  // First, get the base case results using existing function
  const baseResult = await searchCases(params);

  if (baseResult.cases.length === 0) {
    return {
      ...baseResult,
      cases: [],
    };
  }

  // Get all case IDs for batch lawyer lookup
  const caseIds = baseResult.cases.map((c) => c.id);

  const supabase = createServerSupabaseClient();

  // Batch fetch lawyers for all cases, respecting opt-out
  const { data: lawyersResult } = await supabase
    .from("case_lawyers")
    .select(`
      case_id,
      lawyer_id,
      role,
      lawyers!inner(slug, name, photo, case_association_opt_out)
    `)
    .in("case_id", caseIds)
    .eq("lawyers.case_association_opt_out", false);

  // Group lawyers by case ID
  const lawyersByCaseId = new Map<string, CaseLawyerPreview[]>();

  for (const row of lawyersResult ?? []) {
    const preview: CaseLawyerPreview = {
      lawyerId: row.lawyer_id,
      // @ts-expect-error - Supabase types don't handle nested selects well
      slug: row.lawyers.slug,
      // @ts-expect-error - Supabase types don't handle nested selects well
      name: row.lawyers.name,
      // @ts-expect-error - Supabase types don't handle nested selects well
      photo: row.lawyers.photo,
      role: row.role as LawyerRole,
    };

    const existing = lawyersByCaseId.get(row.case_id) || [];
    existing.push(preview);
    lawyersByCaseId.set(row.case_id, existing);
  }

  // Sort lawyers by role priority and attach to cases
  const casesWithLawyers: CaseCardDataWithLawyers[] = baseResult.cases.map((c) => {
    const caseLawyerList = lawyersByCaseId.get(c.id) || [];
    // Sort by role priority
    caseLawyerList.sort((a, b) => ROLE_PRIORITY[a.role] - ROLE_PRIORITY[b.role]);

    return {
      ...c,
      lawyers: caseLawyerList,
    };
  });

  return {
    cases: casesWithLawyers,
    total: baseResult.total,
    page: baseResult.page,
    totalPages: baseResult.totalPages,
    hasMore: baseResult.hasMore,
  };
}

// Get featured cases with lawyers for homepage
export async function getFeaturedCasesWithLawyers(
  limit = 6
): Promise<CaseCardDataWithLawyers[]> {
  const result = await searchCasesWithLawyers({
    featured: true,
    limit,
  });
  return result.cases;
}
