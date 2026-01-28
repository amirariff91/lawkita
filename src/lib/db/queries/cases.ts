import { db } from "@/lib/db";
import {
  cases,
  caseTimeline,
  caseLawyers,
  caseMediaReferences,
  lawyers,
} from "@/lib/db/schema";
import { eq, and, ilike, or, desc, asc, count, sql } from "drizzle-orm";
import type {
  CaseCardData,
  CaseSearchParams,
  CaseSearchResult,
  CaseWithRelations,
  CaseCategory,
  CaseStatus,
  TimelineEvent,
  CaseLawyerWithDetails,
} from "@/types/case";

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

  // Build where conditions
  const conditions = [eq(cases.isPublished, true)];

  if (query) {
    conditions.push(
      or(
        ilike(cases.title, `%${query}%`),
        ilike(cases.subtitle, `%${query}%`),
        ilike(cases.description, `%${query}%`)
      )!
    );
  }

  if (category) {
    conditions.push(eq(cases.category, category));
  }

  if (status) {
    conditions.push(eq(cases.status, status));
  }

  if (featured) {
    conditions.push(eq(cases.isFeatured, true));
  }

  if (tag) {
    // PostgreSQL array contains operator with NULL safety
    conditions.push(sql`COALESCE(${cases.tags}, '[]'::jsonb) @> ${JSON.stringify([tag])}`);
  }

  // Get total count
  const totalResult = await db
    .select({ count: count() })
    .from(cases)
    .where(and(...conditions));

  const total = totalResult[0]?.count ?? 0;

  // Get cases, ordered by featured first then by verdict date
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
    .where(and(...conditions))
    .orderBy(desc(cases.isFeatured), desc(cases.verdictDate), desc(cases.createdAt))
    .limit(limit)
    .offset(offset);

  const caseCards: CaseCardData[] = caseResults.map((c) => ({
    ...c,
    category: c.category as CaseCategory,
    status: c.status as CaseStatus,
    tags: (c.tags as string[]) || [],
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
  const caseResult = await db
    .select()
    .from(cases)
    .where(and(eq(cases.slug, slug), eq(cases.isPublished, true)))
    .limit(1);

  if (caseResult.length === 0) {
    return null;
  }

  const caseData = caseResult[0];

  // Get timeline events
  const timelineResult = await db
    .select({
      id: caseTimeline.id,
      date: caseTimeline.date,
      title: caseTimeline.title,
      description: caseTimeline.description,
      court: caseTimeline.court,
      image: caseTimeline.image,
      sortOrder: caseTimeline.sortOrder,
    })
    .from(caseTimeline)
    .where(eq(caseTimeline.caseId, caseData.id))
    .orderBy(asc(caseTimeline.date), asc(caseTimeline.sortOrder));

  const timeline: TimelineEvent[] = timelineResult;

  // Get lawyers with their details
  const lawyersResult = await db
    .select({
      lawyerId: caseLawyers.lawyerId,
      role: caseLawyers.role,
      roleDescription: caseLawyers.roleDescription,
      isVerified: caseLawyers.isVerified,
      lawyer: {
        slug: lawyers.slug,
        name: lawyers.name,
        photo: lawyers.photo,
        firmName: lawyers.firmName,
        isVerified: lawyers.isVerified,
      },
    })
    .from(caseLawyers)
    .innerJoin(lawyers, eq(caseLawyers.lawyerId, lawyers.id))
    .where(eq(caseLawyers.caseId, caseData.id));

  const caseLawyersList: CaseLawyerWithDetails[] = lawyersResult.map((l) => ({
    ...l,
    role: l.role as CaseLawyerWithDetails["role"],
  }));

  // Get media references
  const mediaResult = await db
    .select()
    .from(caseMediaReferences)
    .where(eq(caseMediaReferences.caseId, caseData.id))
    .orderBy(desc(caseMediaReferences.publishedAt));

  return {
    ...caseData,
    timeline,
    lawyers: caseLawyersList,
    mediaReferences: mediaResult,
  };
}

// Get all unique tags from published cases
export async function getAllCaseTags(): Promise<string[]> {
  const result = await db
    .selectDistinct({ tags: cases.tags })
    .from(cases)
    .where(eq(cases.isPublished, true));

  const allTags = new Set<string>();
  for (const row of result) {
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
  const results = await db
    .select({
      category: cases.category,
      count: count(),
    })
    .from(cases)
    .where(eq(cases.isPublished, true))
    .groupBy(cases.category);

  return results.map((r) => ({
    category: r.category as CaseCategory,
    count: r.count,
  }));
}

// Get case counts by status
export async function getCaseCountsByStatus(): Promise<
  { status: CaseStatus; count: number }[]
> {
  const results = await db
    .select({
      status: cases.status,
      count: count(),
    })
    .from(cases)
    .where(eq(cases.isPublished, true))
    .groupBy(cases.status);

  return results.map((r) => ({
    status: r.status as CaseStatus,
    count: r.count,
  }));
}
