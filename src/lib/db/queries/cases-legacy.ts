import { PostgrestClient } from "@supabase/postgrest-js";
import { getLegacyCasesConfiguration } from "./cases-backend";
import type {
  CaseCardData,
  CaseCardDataWithLawyers,
  CaseCategory,
  CaseLawyerPreview,
  CaseLawyerWithDetails,
  CaseSearchParams,
  CaseSearchResult,
  CaseStatus,
  CaseWithRelations,
  LawyerRole,
  TimelineEvent,
} from "@/types/case";

export interface CaseSearchResultWithLawyers {
  cases: CaseCardDataWithLawyers[];
  total: number;
  page: number;
  totalPages: number;
  hasMore: boolean;
}

interface LegacyCaseCardRow {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  category: string;
  status: string;
  is_featured: boolean;
  outcome: string | null;
  verdict_date: string | null;
  tags: string[] | null;
  og_image: string | null;
}

interface LegacyCaseRow extends LegacyCaseCardRow {
  case_number: string | null;
  citation: string | null;
  court: string | null;
  alternative_names: string[] | null;
  is_published: boolean;
  verdict_summary: string | null;
  duration_days: number | null;
  witness_count: number | null;
  hearing_count: number | null;
  charge_count: number | null;
  meta_description: string | null;
  created_at: string;
  updated_at: string;
}

function createLegacyCasesClient(): PostgrestClient {
  const configuration = getLegacyCasesConfiguration();
  if (!configuration) {
    throw new Error("Legacy cases queries are not configured");
  }

  return new PostgrestClient(`${configuration.url}/rest/v1`, {
    headers: {
      apikey: configuration.key,
      Authorization: `Bearer ${configuration.key}`,
    },
  });
}

function toCaseCard(row: LegacyCaseCardRow): CaseCardData {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    subtitle: row.subtitle,
    description: row.description,
    category: row.category as CaseCategory,
    status: row.status as CaseStatus,
    isFeatured: row.is_featured,
    outcome: row.outcome as CaseCardData["outcome"],
    verdictDate: row.verdict_date,
    tags: row.tags ?? [],
    ogImage: row.og_image,
  };
}

export async function searchCases(params: CaseSearchParams): Promise<CaseSearchResult> {
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.max(1, params.limit ?? 12);
  const offset = (page - 1) * limit;
  let query = createLegacyCasesClient()
    .from("cases")
    .select(
      "id,slug,title,subtitle,description,category,status,is_featured,outcome,verdict_date,tags,og_image",
      { count: "exact" }
    )
    .eq("is_published", true);

  if (params.query) {
    query = query.or(
      `title.ilike.%${params.query}%,subtitle.ilike.%${params.query}%,description.ilike.%${params.query}%`
    );
  }
  if (params.category) query = query.eq("category", params.category);
  if (params.status) query = query.eq("status", params.status);
  if (params.featured) query = query.eq("is_featured", true);
  if (params.tag) query = query.contains("tags", [params.tag]);

  const { data, error, count } = await query
    .order("is_featured", { ascending: false })
    .order("verdict_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("Error fetching cases through legacy PostgREST:", error);
    return { cases: [], total: 0, page, totalPages: 0, hasMore: false };
  }

  const total = count ?? 0;
  return {
    cases: ((data ?? []) as LegacyCaseCardRow[]).map(toCaseCard),
    total,
    page,
    totalPages: Math.ceil(total / limit),
    hasMore: page < Math.ceil(total / limit),
  };
}

export async function getFeaturedCases(limit = 6): Promise<CaseCardData[]> {
  return (await searchCases({ featured: true, limit })).cases;
}

export async function getCaseBySlug(slug: string): Promise<CaseWithRelations | null> {
  const client = createLegacyCasesClient();
  const { data, error } = await client
    .from("cases")
    .select("*")
    .eq("slug", slug)
    .eq("is_published", true)
    .single();
  if (error || !data) return null;

  const caseData = data as LegacyCaseRow;
  const [timelineResult, lawyersResult, mediaResult] = await Promise.all([
    client
      .from("case_timeline")
      .select("id,date,title,description,court,image,sort_order")
      .eq("case_id", caseData.id)
      .order("date", { ascending: true })
      .order("sort_order", { ascending: true }),
    client
      .from("case_lawyers")
      .select(
        "lawyer_id,role,role_description,is_verified,lawyers!inner(slug,name,photo,firm_name,is_verified)"
      )
      .eq("case_id", caseData.id),
    client
      .from("case_media_references")
      .select("*")
      .eq("case_id", caseData.id)
      .order("published_at", { ascending: false }),
  ]);

  const timeline = (timelineResult.data ?? []) as Array<{
    id: string;
    date: string;
    title: string;
    description: string | null;
    court: string | null;
    image: string | null;
    sort_order: number;
  }>;
  const lawyerRows = (lawyersResult.data ?? []) as unknown as Array<{
    lawyer_id: string;
    role: string;
    role_description: string | null;
    is_verified: boolean;
    lawyers: {
      slug: string;
      name: string;
      photo: string | null;
      firm_name: string | null;
      is_verified: boolean;
    };
  }>;
  const mediaRows = (mediaResult.data ?? []) as Array<{
    id: string;
    case_id: string;
    source: string;
    title: string;
    url: string;
    published_at: string | null;
    excerpt: string | null;
    created_at: string;
  }>;

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
    timeline: timeline.map(
      (row): TimelineEvent => ({
        id: row.id,
        date: new Date(row.date),
        title: row.title,
        description: row.description,
        court: row.court,
        image: row.image,
        sortOrder: row.sort_order,
      })
    ),
    lawyers: lawyerRows.map(
      (row): CaseLawyerWithDetails => ({
        lawyerId: row.lawyer_id,
        role: row.role as LawyerRole,
        roleDescription: row.role_description,
        isVerified: row.is_verified,
        lawyer: {
          slug: row.lawyers.slug,
          name: row.lawyers.name,
          photo: row.lawyers.photo,
          firmName: row.lawyers.firm_name,
          isVerified: row.lawyers.is_verified,
        },
      })
    ),
    mediaReferences: mediaRows.map((row) => ({
      id: row.id,
      caseId: row.case_id,
      source: row.source,
      title: row.title,
      url: row.url,
      publishedAt: row.published_at ? new Date(row.published_at) : null,
      excerpt: row.excerpt,
      createdAt: new Date(row.created_at),
    })),
  } as CaseWithRelations;
}

export async function getAllCaseTags(): Promise<string[]> {
  const { data } = await createLegacyCasesClient()
    .from("cases")
    .select("tags")
    .eq("is_published", true);
  const tags = new Set<string>();
  for (const row of (data ?? []) as Array<{ tags: string[] | null }>) {
    for (const tag of row.tags ?? []) tags.add(tag);
  }
  return [...tags].sort();
}

export async function getCaseCountsByCategory(): Promise<
  { category: CaseCategory; count: number }[]
> {
  const { data } = await createLegacyCasesClient()
    .from("cases")
    .select("category")
    .eq("is_published", true);
  const counts = new Map<CaseCategory, number>();
  for (const row of (data ?? []) as Array<{ category: string }>) {
    const category = row.category as CaseCategory;
    counts.set(category, (counts.get(category) ?? 0) + 1);
  }
  return [...counts].map(([category, count]) => ({ category, count }));
}

export async function getCaseCountsByStatus(): Promise<{ status: CaseStatus; count: number }[]> {
  const { data } = await createLegacyCasesClient()
    .from("cases")
    .select("status")
    .eq("is_published", true);
  const counts = new Map<CaseStatus, number>();
  for (const row of (data ?? []) as Array<{ status: string }>) {
    const status = row.status as CaseStatus;
    counts.set(status, (counts.get(status) ?? 0) + 1);
  }
  return [...counts].map(([status, count]) => ({ status, count }));
}

const ROLE_PRIORITY: Record<LawyerRole, number> = {
  prosecution: 1,
  defense: 2,
  judge: 3,
  other: 4,
};

export async function searchCasesWithLawyers(
  params: CaseSearchParams
): Promise<CaseSearchResultWithLawyers> {
  const baseResult = await searchCases(params);
  if (baseResult.cases.length === 0) return { ...baseResult, cases: [] };

  const { data } = await createLegacyCasesClient()
    .from("case_lawyers")
    .select("case_id,lawyer_id,role,lawyers!inner(slug,name,photo,case_association_opt_out)")
    .in(
      "case_id",
      baseResult.cases.map((item) => item.id)
    )
    .eq("lawyers.case_association_opt_out", false);
  const rows = (data ?? []) as unknown as Array<{
    case_id: string;
    lawyer_id: string;
    role: string;
    lawyers: { slug: string; name: string; photo: string | null };
  }>;
  const lawyersByCaseId = new Map<string, CaseLawyerPreview[]>();

  for (const row of rows) {
    const current = lawyersByCaseId.get(row.case_id) ?? [];
    current.push({
      lawyerId: row.lawyer_id,
      slug: row.lawyers.slug,
      name: row.lawyers.name,
      photo: row.lawyers.photo,
      role: row.role as LawyerRole,
    });
    lawyersByCaseId.set(row.case_id, current);
  }

  return {
    ...baseResult,
    cases: baseResult.cases.map((item) => {
      const associatedLawyers = lawyersByCaseId.get(item.id) ?? [];
      associatedLawyers.sort((left, right) => ROLE_PRIORITY[left.role] - ROLE_PRIORITY[right.role]);
      return { ...item, lawyers: associatedLawyers };
    }),
  };
}

export async function getFeaturedCasesWithLawyers(limit = 6): Promise<CaseCardDataWithLawyers[]> {
  return (await searchCasesWithLawyers({ featured: true, limit })).cases;
}
