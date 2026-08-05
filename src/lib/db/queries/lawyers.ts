import {
  and,
  count,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  isNotNull,
  lte,
  lt,
  sql,
} from "drizzle-orm";
import { db } from "@/lib/db";
import {
  cases,
  caseLawyers,
  lawyerEducation,
  lawyerQualifications,
  lawyerPracticeAreas,
  lawyers,
  practiceAreas,
  reviews,
} from "@/lib/db/schema";
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

type LawyerCardRow = {
  id: string;
  slug: string;
  name: string;
  photo: string | null;
  bio: string | null;
  state: string | null;
  city: string | null;
  firmName: string | null;
  isVerified: boolean;
  isClaimed: boolean;
  subscriptionTier: "free" | "premium" | "featured";
  yearsAtBar: number | null;
  reviewCount: number | null;
  averageRating: string | null;
  responseRate: string | null;
  barStatus: "active" | "inactive" | "suspended" | "deceased" | null;
  barMembershipNumber: string | null;
  lastScrapedAt: Date | null;
};

const lawyerCardSelection = {
  id: lawyers.id,
  slug: lawyers.slug,
  name: lawyers.name,
  photo: lawyers.photo,
  bio: lawyers.bio,
  state: lawyers.state,
  city: lawyers.city,
  firmName: lawyers.firmName,
  isVerified: lawyers.isVerified,
  isClaimed: lawyers.isClaimed,
  subscriptionTier: lawyers.subscriptionTier,
  yearsAtBar: lawyers.yearsAtBar,
  reviewCount: lawyers.reviewCount,
  averageRating: lawyers.averageRating,
  responseRate: lawyers.responseRate,
  barStatus: lawyers.barStatus,
  barMembershipNumber: lawyers.barMembershipNumber,
  lastScrapedAt: lawyers.lastScrapedAt,
};

function toLawyerCard(
  lawyer: LawyerCardRow,
  practiceAreaMap: Map<string, string[]>
): LawyerCardData {
  return {
    id: lawyer.id,
    slug: lawyer.slug,
    name: lawyer.name,
    photo: lawyer.photo,
    bio: lawyer.bio,
    state: lawyer.state,
    city: lawyer.city,
    firmName: lawyer.firmName,
    isVerified: lawyer.isVerified,
    isClaimed: lawyer.isClaimed,
    subscriptionTier: lawyer.subscriptionTier,
    yearsAtBar: lawyer.yearsAtBar,
    reviewCount: lawyer.reviewCount ?? 0,
    averageRating: lawyer.averageRating,
    responseRate: lawyer.responseRate,
    practiceAreas: practiceAreaMap.get(lawyer.id) ?? [],
    barStatus: lawyer.barStatus,
    barMembershipNumber: lawyer.barMembershipNumber,
    lastScrapedAt: lawyer.lastScrapedAt,
  };
}

async function getPracticeAreaMap(lawyerIds: string[]): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  if (lawyerIds.length === 0) return map;

  const rows = await db
    .select({ lawyerId: lawyerPracticeAreas.lawyerId, name: practiceAreas.name })
    .from(lawyerPracticeAreas)
    .innerJoin(
      practiceAreas,
      eq(lawyerPracticeAreas.practiceAreaId, practiceAreas.id)
    )
    .where(inArray(lawyerPracticeAreas.lawyerId, lawyerIds));

  for (const row of rows) {
    const current = map.get(row.lawyerId) ?? [];
    current.push(row.name);
    map.set(row.lawyerId, current);
  }

  return map;
}

function emptySearchResult(page: number): LawyerSearchResult {
  return { lawyers: [], total: 0, page, totalPages: 0, hasMore: false };
}

export async function searchLawyers(
  params: LawyerSearchParams
): Promise<LawyerSearchResult> {
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.max(1, params.limit ?? 20);
  const offset = (page - 1) * limit;
  const conditions = [];

  if (!params.showInactive) conditions.push(eq(lawyers.isActive, true));

  if (params.practiceArea) {
    const [practiceArea] = await db
      .select({ id: practiceAreas.id })
      .from(practiceAreas)
      .where(eq(practiceAreas.slug, params.practiceArea))
      .limit(1);

    if (!practiceArea) return emptySearchResult(page);

    const associations = await db
      .select({ lawyerId: lawyerPracticeAreas.lawyerId })
      .from(lawyerPracticeAreas)
      .where(eq(lawyerPracticeAreas.practiceAreaId, practiceArea.id));
    const ids = associations.map((row) => row.lawyerId);
    if (ids.length === 0) return emptySearchResult(page);
    conditions.push(inArray(lawyers.id, ids));
  }

  if (params.query) {
    const pattern = `%${params.query}%`;
    conditions.push(
      sql`(
        ${ilike(lawyers.name, pattern)} OR
        ${ilike(lawyers.firmName, pattern)} OR
        ${ilike(lawyers.bio, pattern)}
      )`
    );
  }

  if (params.state) conditions.push(eq(lawyers.state, params.state));
  if (params.city) conditions.push(eq(lawyers.city, params.city));

  if (params.experienceLevel) {
    const threshold = EXPERIENCE_THRESHOLDS[params.experienceLevel];
    conditions.push(gte(lawyers.yearsAtBar, threshold.min));
    if (threshold.max !== Infinity) conditions.push(lte(lawyers.yearsAtBar, threshold.max));
  }

  const where = and(...conditions);
  const [{ total }] = await db
    .select({ total: count() })
    .from(lawyers)
    .where(where);

  const query = db
    .select(lawyerCardSelection)
    .from(lawyers)
    .where(where);

  switch (params.sort ?? "relevance") {
    case "experience":
      query.orderBy(sql`${lawyers.yearsAtBar} DESC NULLS LAST`);
      break;
    case "rating":
      query.orderBy(sql`${lawyers.averageRating} DESC NULLS LAST`);
      break;
    case "reviews":
      query.orderBy(sql`${lawyers.reviewCount} DESC NULLS LAST`);
      break;
    case "relevance":
    default:
      query.orderBy(desc(lawyers.subscriptionTier), sql`${lawyers.reviewCount} DESC NULLS LAST`);
      break;
  }

  const lawyerResults = await query.limit(limit).offset(offset);
  const practiceAreaMap = await getPracticeAreaMap(lawyerResults.map((row) => row.id));
  const lawyerCards = lawyerResults.map((row) =>
    toLawyerCard(row as LawyerCardRow, practiceAreaMap)
  );
  const numericTotal = Number(total);
  const totalPages = Math.ceil(numericTotal / limit);

  return {
    lawyers: lawyerCards,
    total: numericTotal,
    page,
    totalPages,
    hasMore: page < totalPages,
  };
}

export async function getLawyerBySlug(
  slug: string
): Promise<LawyerWithRelations | null> {
  const lawyer = await db.query.lawyers.findFirst({
    where: and(eq(lawyers.slug, slug), eq(lawyers.isActive, true)),
  });

  if (!lawyer) return null;

  const [practiceAreasData, reviewsData, educationData, qualificationsData, casesData] =
    await Promise.all([
      db
        .select({
          experienceLevel: lawyerPracticeAreas.experienceLevel,
          yearsExperience: lawyerPracticeAreas.yearsExperience,
          practiceArea: practiceAreas,
        })
        .from(lawyerPracticeAreas)
        .innerJoin(
          practiceAreas,
          eq(lawyerPracticeAreas.practiceAreaId, practiceAreas.id)
        )
        .where(eq(lawyerPracticeAreas.lawyerId, lawyer.id)),
      db
        .select()
        .from(reviews)
        .where(and(eq(reviews.lawyerId, lawyer.id), eq(reviews.isPublished, true)))
        .orderBy(desc(reviews.createdAt)),
      db
        .select({
          id: lawyerEducation.id,
          institution: lawyerEducation.institution,
          degree: lawyerEducation.degree,
          field: lawyerEducation.field,
          graduationYear: lawyerEducation.graduationYear,
        })
        .from(lawyerEducation)
        .where(eq(lawyerEducation.lawyerId, lawyer.id))
        .orderBy(sql`${lawyerEducation.graduationYear} DESC NULLS LAST`),
      db
        .select({
          id: lawyerQualifications.id,
          title: lawyerQualifications.title,
          issuingBody: lawyerQualifications.issuingBody,
          issuedAt: lawyerQualifications.issuedAt,
        })
        .from(lawyerQualifications)
        .where(eq(lawyerQualifications.lawyerId, lawyer.id)),
      db
        .select({
          caseId: caseLawyers.caseId,
          role: caseLawyers.role,
          roleDescription: caseLawyers.roleDescription,
          id: cases.id,
          slug: cases.slug,
          title: cases.title,
          category: cases.category,
          status: cases.status,
        })
        .from(caseLawyers)
        .innerJoin(cases, eq(caseLawyers.caseId, cases.id))
        .where(
          and(eq(caseLawyers.lawyerId, lawyer.id), eq(cases.isPublished, true))
        ),
    ]);

  return {
    ...lawyer,
    practiceAreas: practiceAreasData.map((row) => ({
      practiceArea: row.practiceArea,
      experienceLevel: row.experienceLevel,
      yearsExperience: row.yearsExperience,
    })),
    reviews: reviewsData,
    education: educationData,
    qualifications: qualificationsData,
    cases: casesData.map((row) => ({
      caseId: row.caseId,
      role: row.role,
      roleDescription: row.roleDescription,
      case: {
        id: row.id,
        slug: row.slug,
        title: row.title,
        category: row.category,
        status: row.status,
      },
    })),
  };
}

export async function getLawyersByPracticeArea(
  practiceAreaSlug: string,
  limit = 20,
  page = 1
): Promise<LawyerSearchResult> {
  return searchLawyers({ practiceArea: practiceAreaSlug, limit, page });
}

export async function getLawyersByLocation(
  state: string,
  city?: string,
  limit = 20,
  page = 1
): Promise<LawyerSearchResult> {
  return searchLawyers({ state, city, limit, page });
}

export async function getFeaturedLawyers(limit = 6): Promise<LawyerCardData[]> {
  const rows = await db
    .select(lawyerCardSelection)
    .from(lawyers)
    .where(and(eq(lawyers.isActive, true), isNotNull(lawyers.averageRating)))
    .orderBy(
      desc(lawyers.subscriptionTier),
      desc(lawyers.averageRating),
      desc(lawyers.reviewCount)
    )
    .limit(Math.max(1, limit));
  const practiceAreaMap = await getPracticeAreaMap(rows.map((row) => row.id));
  return rows.map((row) => toLawyerCard(row as LawyerCardRow, practiceAreaMap));
}

export async function getLawyerCountsByState(): Promise<
  { state: string; count: number }[]
> {
  const rows = await db
    .select({ state: lawyers.state })
    .from(lawyers)
    .where(and(eq(lawyers.isActive, true), isNotNull(lawyers.state)));
  const counts = new Map<string, number>();

  for (const row of rows) {
    if (row.state) counts.set(row.state, (counts.get(row.state) ?? 0) + 1);
  }

  return [...counts].map(([state, count]) => ({ state, count }));
}

export async function getLawyerCountsByPracticeArea(): Promise<
  { slug: string; name: string; count: number }[]
> {
  const rows = await db
    .select({
      slug: practiceAreas.slug,
      name: practiceAreas.name,
      isUserFacing: practiceAreas.isUserFacing,
    })
    .from(lawyerPracticeAreas)
    .innerJoin(
      practiceAreas,
      eq(lawyerPracticeAreas.practiceAreaId, practiceAreas.id)
    );
  const counts = new Map<string, { name: string; count: number }>();

  for (const row of rows) {
    if (!row.isUserFacing) continue;
    const current = counts.get(row.slug) ?? { name: row.name, count: 0 };
    current.count++;
    counts.set(row.slug, current);
  }

  return [...counts]
    .map(([slug, value]) => ({ slug, ...value }))
    .sort((a, b) => b.count - a.count);
}

export async function getNewlyAdmittedLawyers(
  limit = 20,
  page = 1
): Promise<LawyerSearchResult> {
  const safePage = Math.max(1, page);
  const safeLimit = Math.max(1, limit);
  const offset = (safePage - 1) * safeLimit;
  const where = and(eq(lawyers.isActive, true), lt(lawyers.yearsAtBar, 1));
  const [{ total }] = await db
    .select({ total: count() })
    .from(lawyers)
    .where(where);
  const rows = await db
    .select(lawyerCardSelection)
    .from(lawyers)
    .where(where)
    .orderBy(sql`${lawyers.yearsAtBar} ASC NULLS LAST`)
    .limit(safeLimit)
    .offset(offset);
  const practiceAreaMap = await getPracticeAreaMap(rows.map((row) => row.id));
  const lawyerCards = rows.map((row) => toLawyerCard(row as LawyerCardRow, practiceAreaMap));
  const numericTotal = Number(total);
  const totalPages = Math.ceil(numericTotal / safeLimit);

  return {
    lawyers: lawyerCards,
    total: numericTotal,
    page: safePage,
    totalPages,
    hasMore: safePage < totalPages,
  };
}

export async function getSimilarLawyers(
  lawyerSlug: string,
  limit = 4
): Promise<LawyerCardData[]> {
  const target = await db.query.lawyers.findFirst({
    where: eq(lawyers.slug, lawyerSlug),
    columns: { id: true, state: true, city: true, yearsAtBar: true },
  });
  if (!target) return [];

  const targetPracticeAreas = await db
    .select({ practiceAreaId: lawyerPracticeAreas.practiceAreaId })
    .from(lawyerPracticeAreas)
    .where(eq(lawyerPracticeAreas.lawyerId, target.id));
  const targetPracticeAreaIds = targetPracticeAreas.map((row) => row.practiceAreaId);

  const conditions = [
    eq(lawyers.isActive, true),
    eq(lawyers.barStatus, "active"),
    sql`${lawyers.id} <> ${target.id}`,
  ];
  if (target.state) conditions.push(eq(lawyers.state, target.state));

  const candidates = await db
    .select(lawyerCardSelection)
    .from(lawyers)
    .where(and(...conditions))
    .limit(50);
  if (candidates.length === 0) return [];

  const candidateIds = candidates.map((row) => row.id);
  const practiceRows = await db
    .select({
      lawyerId: lawyerPracticeAreas.lawyerId,
      practiceAreaId: lawyerPracticeAreas.practiceAreaId,
      name: practiceAreas.name,
    })
    .from(lawyerPracticeAreas)
    .innerJoin(
      practiceAreas,
      eq(lawyerPracticeAreas.practiceAreaId, practiceAreas.id)
    )
    .where(inArray(lawyerPracticeAreas.lawyerId, candidateIds));
  const names = new Map<string, string[]>();
  const ids = new Map<string, string[]>();

  for (const row of practiceRows) {
    const currentNames = names.get(row.lawyerId) ?? [];
    const currentIds = ids.get(row.lawyerId) ?? [];
    currentNames.push(row.name);
    currentIds.push(row.practiceAreaId);
    names.set(row.lawyerId, currentNames);
    ids.set(row.lawyerId, currentIds);
  }

  const ranked = candidates
    .map((lawyer) => {
      const candidatePracticeAreaIds = ids.get(lawyer.id) ?? [];
      const overlap = candidatePracticeAreaIds.filter((id) =>
        targetPracticeAreaIds.includes(id)
      ).length;
      const practiceScore = targetPracticeAreaIds.length
        ? overlap / targetPracticeAreaIds.length
        : 0;
      const locationScore =
        lawyer.city === target.city ? 1 : lawyer.state === target.state ? 0.6 : 0;
      let experienceScore = 0.5;

      if (target.yearsAtBar !== null && lawyer.yearsAtBar !== null) {
        const difference = Math.abs(target.yearsAtBar - lawyer.yearsAtBar);
        experienceScore =
          difference <= 2 ? 1 : difference <= 5 ? 0.7 : difference <= 10 ? 0.4 : 0.2;
      }

      return {
        lawyer,
        score: locationScore * 0.33 + practiceScore * 0.34 + experienceScore * 0.33,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return ranked.map(({ lawyer }) =>
    toLawyerCard(lawyer as LawyerCardRow, names)
  );
}
