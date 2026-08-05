import {
  and,
  count,
  desc,
  eq,
  ilike,
  inArray,
  sql,
} from "drizzle-orm";
import { db } from "@/lib/db";
import {
  cases,
  caseLawyers,
  caseMediaReferences,
  caseTimeline,
  lawyers,
} from "@/lib/db/schema";
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

export interface CaseSearchResultWithLawyers {
  cases: CaseCardDataWithLawyers[];
  total: number;
  page: number;
  totalPages: number;
  hasMore: boolean;
}

function pageResult<T>(items: T[], total: number, page: number, limit: number) {
  const totalPages = Math.ceil(total / limit);
  return {
    items,
    total,
    page,
    totalPages,
    hasMore: page < totalPages,
  };
}

function toCaseCard(row: {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  category: string;
  status: string;
  isFeatured: boolean;
  outcome: string | null;
  verdictDate: Date | null;
  tags: string[] | null;
  ogImage: string | null;
}): CaseCardData {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    subtitle: row.subtitle,
    description: row.description,
    category: row.category as CaseCategory,
    status: row.status as CaseStatus,
    isFeatured: row.isFeatured,
    outcome: row.outcome as CaseCardData["outcome"],
    verdictDate: row.verdictDate?.toISOString() ?? null,
    tags: row.tags ?? [],
    ogImage: row.ogImage,
  };
}

function caseConditions(params: CaseSearchParams) {
  const conditions = [eq(cases.isPublished, true)];

  if (params.query) {
    const pattern = `%${params.query}%`;
    conditions.push(sql`(
      ${ilike(cases.title, pattern)} OR
      ${ilike(cases.subtitle, pattern)} OR
      ${ilike(cases.description, pattern)}
    )` as typeof conditions[number]);
  }

  if (params.category) conditions.push(eq(cases.category, params.category));
  if (params.status) conditions.push(eq(cases.status, params.status));
  if (params.featured) conditions.push(eq(cases.isFeatured, true));
  if (params.tag) {
    conditions.push(
      sql`${cases.tags} @> ${JSON.stringify([params.tag])}::jsonb` as typeof conditions[number]
    );
  }

  return and(...conditions);
}

export async function searchCases(
  params: CaseSearchParams
): Promise<CaseSearchResult> {
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.max(1, params.limit ?? 12);
  const offset = (page - 1) * limit;
  const where = caseConditions(params);

  const [{ total }] = await db
    .select({ total: count() })
    .from(cases)
    .where(where);

  const caseResults = await db
    .select({
      id: cases.id,
      slug: cases.slug,
      title: cases.title,
      subtitle: cases.subtitle,
      description: cases.description,
      category: cases.category,
      status: cases.status,
      isFeatured: cases.isFeatured,
      outcome: cases.outcome,
      verdictDate: cases.verdictDate,
      tags: cases.tags,
      ogImage: cases.ogImage,
    })
    .from(cases)
    .where(where)
    .orderBy(
      desc(cases.isFeatured),
      sql`${cases.verdictDate} DESC NULLS LAST`,
      desc(cases.createdAt)
    )
    .limit(limit)
    .offset(offset);

  return {
    ...pageResult(
      caseResults.map(toCaseCard),
      Number(total),
      page,
      limit
    ),
    cases: caseResults.map(toCaseCard),
  };
}

export async function getFeaturedCases(limit = 6): Promise<CaseCardData[]> {
  const result = await searchCases({ featured: true, limit });
  return result.cases;
}

export async function getCaseBySlug(
  slug: string
): Promise<CaseWithRelations | null> {
  const [caseData] = await db
    .select()
    .from(cases)
    .where(and(eq(cases.slug, slug), eq(cases.isPublished, true)))
    .limit(1);

  if (!caseData) return null;

  const [timelineData, lawyersData, mediaData] = await Promise.all([
    db
      .select()
      .from(caseTimeline)
      .where(eq(caseTimeline.caseId, caseData.id))
      .orderBy(caseTimeline.date, caseTimeline.sortOrder),
    db
      .select({
        lawyerId: caseLawyers.lawyerId,
        role: caseLawyers.role,
        roleDescription: caseLawyers.roleDescription,
        isVerified: caseLawyers.isVerified,
        slug: lawyers.slug,
        name: lawyers.name,
        photo: lawyers.photo,
        firmName: lawyers.firmName,
        lawyerIsVerified: lawyers.isVerified,
      })
      .from(caseLawyers)
      .innerJoin(lawyers, eq(caseLawyers.lawyerId, lawyers.id))
      .where(eq(caseLawyers.caseId, caseData.id)),
    db
      .select()
      .from(caseMediaReferences)
      .where(eq(caseMediaReferences.caseId, caseData.id))
      .orderBy(desc(caseMediaReferences.publishedAt))
  ]);

  const timeline: TimelineEvent[] = timelineData.map((event) => ({
    id: event.id,
    date: event.date,
    title: event.title,
    description: event.description,
    court: event.court,
    image: event.image,
    sortOrder: event.sortOrder,
  }));

  const caseLawyersList: CaseLawyerWithDetails[] = lawyersData.map((row) => ({
    lawyerId: row.lawyerId,
    role: row.role as LawyerRole,
    roleDescription: row.roleDescription,
    isVerified: row.isVerified,
    lawyer: {
      slug: row.slug,
      name: row.name,
      photo: row.photo,
      firmName: row.firmName,
      isVerified: row.lawyerIsVerified,
    },
  }));

  return {
    ...caseData,
    timeline,
    lawyers: caseLawyersList,
    mediaReferences: mediaData,
  };
}

export async function getAllCaseTags(): Promise<string[]> {
  const rows = await db
    .select({ tags: cases.tags })
    .from(cases)
    .where(eq(cases.isPublished, true));
  const tags = new Set<string>();

  for (const row of rows) {
    for (const tag of row.tags ?? []) tags.add(tag);
  }

  return [...tags].sort();
}

export async function getCaseCountsByCategory(): Promise<
  { category: CaseCategory; count: number }[]
> {
  const rows = await db
    .select({ category: cases.category })
    .from(cases)
    .where(eq(cases.isPublished, true));
  const counts = new Map<CaseCategory, number>();

  for (const row of rows) {
    const category = row.category as CaseCategory;
    counts.set(category, (counts.get(category) ?? 0) + 1);
  }

  return [...counts].map(([category, count]) => ({ category, count }));
}

export async function getCaseCountsByStatus(): Promise<
  { status: CaseStatus; count: number }[]
> {
  const rows = await db
    .select({ status: cases.status })
    .from(cases)
    .where(eq(cases.isPublished, true));
  const counts = new Map<CaseStatus, number>();

  for (const row of rows) {
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

  const caseIds = baseResult.cases.map((item) => item.id);
  const lawyerRows = await db
    .select({
      caseId: caseLawyers.caseId,
      lawyerId: caseLawyers.lawyerId,
      role: caseLawyers.role,
      slug: lawyers.slug,
      name: lawyers.name,
      photo: lawyers.photo,
    })
    .from(caseLawyers)
    .innerJoin(lawyers, eq(caseLawyers.lawyerId, lawyers.id))
    .where(
      and(
        inArray(caseLawyers.caseId, caseIds),
        eq(lawyers.caseAssociationOptOut, false)
      )
    );

  const lawyersByCaseId = new Map<string, CaseLawyerPreview[]>();
  for (const row of lawyerRows) {
    const preview: CaseLawyerPreview = {
      lawyerId: row.lawyerId,
      slug: row.slug,
      name: row.name,
      photo: row.photo,
      role: row.role as LawyerRole,
    };
    const current = lawyersByCaseId.get(row.caseId) ?? [];
    current.push(preview);
    lawyersByCaseId.set(row.caseId, current);
  }

  const casesWithLawyers = baseResult.cases.map((item) => {
    const associatedLawyers = lawyersByCaseId.get(item.id) ?? [];
    associatedLawyers.sort((a, b) => ROLE_PRIORITY[a.role] - ROLE_PRIORITY[b.role]);
    return { ...item, lawyers: associatedLawyers };
  });

  return { ...baseResult, cases: casesWithLawyers };
}

export async function getFeaturedCasesWithLawyers(
  limit = 6
): Promise<CaseCardDataWithLawyers[]> {
  const result = await searchCasesWithLawyers({ featured: true, limit });
  return result.cases;
}
