import {
  and,
  count,
  desc,
  eq,
  ilike,
  inArray,
  isNotNull,
  or,
  sql,
} from "drizzle-orm";
import { db } from "@/lib/db";
import {
  firms,
  lawyerFirmHistory,
  lawyerPracticeAreas,
  lawyers,
  practiceAreas,
} from "@/lib/db/schema";
import type { LawyerCardData } from "@/types/lawyer";

export interface FirmWithStats {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  logo?: string | null;
  address: string | null;
  state: string | null;
  city: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  isClaimed?: boolean;
  subscriptionTier?: "free" | "firm_premium";
  lawyerCount: number;
  avgYearsExperience: number | null;
  practiceAreas: string[];
  lawyers: LawyerCardData[];
}

export interface FirmCardData {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  state: string | null;
  city: string | null;
  lawyerCount: number;
  avgYearsExperience: number | null;
  subscriptionTier?: "free" | "firm_premium";
}

export function normalizeAddress(address: string | null | undefined): string {
  if (!address) return "";
  return address
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[.,]/g, "")
    .replace(/\b(jalan|jln)\b/g, "jln")
    .replace(/\b(lorong|lrg)\b/g, "lrg")
    .replace(/\b(taman|tmn)\b/g, "tmn")
    .replace(/\b(suite|ste)\b/g, "ste")
    .replace(/\b(level|lvl)\b/g, "lvl")
    .replace(/\b(floor|flr)\b/g, "flr")
    .trim();
}

function toNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toLawyerCard(
  lawyer: typeof lawyers.$inferSelect,
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

async function getFirmLawyers(firmId: string): Promise<{
  lawyers: LawyerCardData[];
  practiceAreas: string[];
}> {
  const lawyerRows = await db
    .select()
    .from(lawyers)
    .where(and(eq(lawyers.primaryFirmId, firmId), eq(lawyers.isActive, true)))
    .orderBy(sql`${lawyers.yearsAtBar} DESC NULLS LAST`);
  const practiceAreaMap = new Map<string, string[]>();
  const allPracticeAreas = new Set<string>();

  if (lawyerRows.length > 0) {
    const areaRows = await db
      .select({ lawyerId: lawyerPracticeAreas.lawyerId, name: practiceAreas.name })
      .from(lawyerPracticeAreas)
      .innerJoin(
        practiceAreas,
        eq(lawyerPracticeAreas.practiceAreaId, practiceAreas.id)
      )
      .where(inArray(lawyerPracticeAreas.lawyerId, lawyerRows.map((row) => row.id)));

    for (const row of areaRows) {
      const names = practiceAreaMap.get(row.lawyerId) ?? [];
      names.push(row.name);
      practiceAreaMap.set(row.lawyerId, names);
      allPracticeAreas.add(row.name);
    }
  }

  return {
    lawyers: lawyerRows.map((row) => toLawyerCard(row, practiceAreaMap)),
    practiceAreas: [...allPracticeAreas],
  };
}

export async function getFirmBySlug(slug: string): Promise<FirmWithStats | null> {
  const [firm] = await db
    .select()
    .from(firms)
    .where(eq(firms.slug, slug))
    .limit(1);
  if (!firm) return null;

  const firmLawyers = await getFirmLawyers(firm.id);
  const years = firmLawyers.lawyers
    .map((lawyer) => lawyer.yearsAtBar)
    .filter((year): year is number => year !== null);

  return {
    id: firm.id,
    name: firm.name,
    slug: firm.slug,
    description: firm.description,
    logo: firm.logo,
    address: firm.address,
    state: firm.state,
    city: firm.city,
    phone: firm.phone,
    email: firm.email,
    website: firm.website,
    isClaimed: firm.isClaimed,
    subscriptionTier: firm.subscriptionTier ?? "free",
    lawyerCount: firmLawyers.lawyers.length,
    avgYearsExperience: years.length
      ? years.reduce((total, year) => total + year, 0) / years.length
      : null,
    practiceAreas: firmLawyers.practiceAreas,
    lawyers: firmLawyers.lawyers,
  };
}

export async function getOrCreateFirm(
  firmName: string,
  firmAddress: string | null,
  state: string | null,
  city: string | null
): Promise<{ id: string; slug: string; isNew: boolean }> {
  const normalizedAddress = normalizeAddress(firmAddress);

  if (normalizedAddress) {
    const [existingFirm] = await db
      .select({ id: firms.id, slug: firms.slug })
      .from(firms)
      .where(eq(firms.normalizedAddress, normalizedAddress))
      .limit(1);
    if (existingFirm) return { ...existingFirm, isNew: false };
  }

  if (city) {
    const [existingFirm] = await db
      .select({ id: firms.id, slug: firms.slug })
      .from(firms)
      .where(and(eq(firms.name, firmName), eq(firms.city, city)))
      .limit(1);
    if (existingFirm) return { ...existingFirm, isNew: false };
  }

  const slug = generateFirmSlug(firmName, city);
  try {
    const [newFirm] = await db
      .insert(firms)
      .values({
        name: firmName,
        slug,
        address: firmAddress,
        normalizedAddress: normalizedAddress || null,
        state,
        city,
      })
      .returning({ id: firms.id, slug: firms.slug });
    return { ...newFirm, isNew: true };
  } catch {
    const slugWithSuffix = `${slug}-${Date.now().toString(36)}`;
    const [retryFirm] = await db
      .insert(firms)
      .values({
        name: firmName,
        slug: slugWithSuffix,
        address: firmAddress,
        normalizedAddress: normalizedAddress || null,
        state,
        city,
      })
      .returning({ id: firms.id, slug: firms.slug });
    return { ...retryFirm, isNew: true };
  }
}

function generateFirmSlug(name: string, city: string | null): string {
  const baseSlug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);
  if (!city) return baseSlug;

  const citySlug = city
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 20);
  return `${baseSlug}-${citySlug}`;
}

export async function getLawyerFirmHistory(
  lawyerId: string
): Promise<{ firmName: string; firmSlug: string | null; isCurrent: boolean }[]> {
  const rows = await db
    .select({
      firmName: lawyerFirmHistory.firmName,
      firmSlug: firms.slug,
      isCurrent: lawyerFirmHistory.isCurrent,
    })
    .from(lawyerFirmHistory)
    .leftJoin(firms, eq(lawyerFirmHistory.firmId, firms.id))
    .where(eq(lawyerFirmHistory.lawyerId, lawyerId))
    .orderBy(desc(lawyerFirmHistory.isCurrent), desc(lawyerFirmHistory.lastSeen));

  return rows.map((row) => ({
    firmName: row.firmName,
    firmSlug: row.firmSlug,
    isCurrent: row.isCurrent,
  }));
}

export type FirmSortOption = "lawyers" | "experience" | "name";

export async function searchFirms(params: {
  query?: string;
  state?: string;
  city?: string;
  practiceArea?: string;
  sort?: FirmSortOption;
  page?: number;
  limit?: number;
}): Promise<{
  firms: FirmCardData[];
  total: number;
  page: number;
  totalPages: number;
}> {
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.max(1, params.limit ?? 20);
  const offset = (page - 1) * limit;
  const conditions = [];

  if (params.practiceArea) {
    const [area] = await db
      .select({ id: practiceAreas.id })
      .from(practiceAreas)
      .where(eq(practiceAreas.slug, params.practiceArea))
      .limit(1);
    if (!area) return { firms: [], total: 0, page, totalPages: 0 };

    const firmIds = await db
      .selectDistinct({ firmId: lawyers.primaryFirmId })
      .from(lawyers)
      .innerJoin(
        lawyerPracticeAreas,
        eq(lawyers.id, lawyerPracticeAreas.lawyerId)
      )
      .where(
        and(
          eq(lawyerPracticeAreas.practiceAreaId, area.id),
          isNotNull(lawyers.primaryFirmId)
        )
      );
    const ids = firmIds
      .map((row) => row.firmId)
      .filter((id): id is string => id !== null);
    if (ids.length === 0) return { firms: [], total: 0, page, totalPages: 0 };
    conditions.push(inArray(firms.id, ids));
  }

  if (params.query) {
    const pattern = `%${params.query}%`;
    conditions.push(or(ilike(firms.name, pattern), ilike(firms.address, pattern))!);
  }
  if (params.state) conditions.push(eq(firms.state, params.state));
  if (params.city) conditions.push(eq(firms.city, params.city));

  const where = and(...conditions);
  const [{ total }] = await db
    .select({ total: count() })
    .from(firms)
    .where(where);
  const query = db.select().from(firms).where(where);

  switch (params.sort ?? "lawyers") {
    case "experience":
      query.orderBy(sql`${firms.avgYearsExperience} DESC NULLS LAST`);
      break;
    case "name":
      query.orderBy(firms.name);
      break;
    case "lawyers":
    default:
      query.orderBy(sql`${firms.lawyerCount} DESC NULLS LAST`);
      break;
  }

  const rows = await query.limit(limit).offset(offset);
  const numericTotal = Number(total);

  return {
    firms: rows.map((firm) => ({
      id: firm.id,
      name: firm.name,
      slug: firm.slug,
      address: firm.address,
      state: firm.state,
      city: firm.city,
      lawyerCount: firm.lawyerCount ?? 0,
      avgYearsExperience: toNumber(firm.avgYearsExperience),
      subscriptionTier: firm.subscriptionTier ?? "free",
    })),
    total: numericTotal,
    page,
    totalPages: Math.ceil(numericTotal / limit),
  };
}

export async function updateFirmContactInfo(firmId: string): Promise<void> {
  const lawyerRows = await db
    .select({ phone: lawyers.phone, email: lawyers.email })
    .from(lawyers)
    .where(and(eq(lawyers.primaryFirmId, firmId), eq(lawyers.isActive, true)));
  if (lawyerRows.length === 0) return;

  const mostCommon = (values: (string | null)[]) => {
    const counts = new Map<string, number>();
    for (const value of values) {
      if (value) counts.set(value, (counts.get(value) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  };
  const [firm] = await db
    .select({ phone: firms.phone, email: firms.email })
    .from(firms)
    .where(eq(firms.id, firmId))
    .limit(1);
  if (!firm) return;

  const phone = !firm.phone ? mostCommon(lawyerRows.map((row) => row.phone)) : null;
  const email = !firm.email ? mostCommon(lawyerRows.map((row) => row.email)) : null;
  if (phone || email) {
    await db
      .update(firms)
      .set({ ...(phone ? { phone } : {}), ...(email ? { email } : {}), updatedAt: new Date() })
      .where(eq(firms.id, firmId));
  }
}

export async function updateFirmCachedStats(firmId: string): Promise<void> {
  const rows = await db
    .select({ yearsAtBar: lawyers.yearsAtBar })
    .from(lawyers)
    .where(and(eq(lawyers.primaryFirmId, firmId), eq(lawyers.isActive, true)));
  const years = rows
    .map((row) => row.yearsAtBar)
    .filter((year): year is number => year !== null);

  await db
    .update(firms)
    .set({
      lawyerCount: rows.length,
      avgYearsExperience: years.length
        ? String(years.reduce((total, year) => total + year, 0) / years.length)
        : null,
      updatedAt: new Date(),
    })
    .where(eq(firms.id, firmId));
}

export async function getFirmById(firmId: string): Promise<FirmWithStats | null> {
  const [firm] = await db
    .select({ slug: firms.slug })
    .from(firms)
    .where(eq(firms.id, firmId))
    .limit(1);
  return firm ? getFirmBySlug(firm.slug) : null;
}

export interface FirmDashboardData {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo: string | null;
  address: string | null;
  state: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  isClaimed: boolean;
  subscriptionTier: "free" | "firm_premium";
  subscriptionExpiresAt: Date | null;
  lawyerCount: number;
  avgYearsExperience: number | null;
}

function toDashboardFirm(firm: typeof firms.$inferSelect): FirmDashboardData {
  return {
    id: firm.id,
    name: firm.name,
    slug: firm.slug,
    description: firm.description,
    logo: firm.logo,
    address: firm.address,
    state: firm.state,
    city: firm.city,
    phone: firm.phone,
    email: firm.email,
    website: firm.website,
    isClaimed: firm.isClaimed,
    subscriptionTier: firm.subscriptionTier ?? "free",
    subscriptionExpiresAt: firm.subscriptionExpiresAt,
    lawyerCount: firm.lawyerCount ?? 0,
    avgYearsExperience: toNumber(firm.avgYearsExperience),
  };
}

export async function getFirmForDashboard(
  firmId: string,
  userId: string
): Promise<FirmDashboardData | null> {
  const [firm] = await db
    .select()
    .from(firms)
    .where(and(eq(firms.id, firmId), eq(firms.ownerId, userId)))
    .limit(1);
  return firm ? toDashboardFirm(firm) : null;
}

export async function getUserFirm(userId: string): Promise<FirmDashboardData | null> {
  const [firm] = await db
    .select()
    .from(firms)
    .where(eq(firms.ownerId, userId))
    .limit(1);
  return firm ? toDashboardFirm(firm) : null;
}

export async function updateFirmProfile(
  firmId: string,
  userId: string,
  data: {
    name?: string;
    description?: string;
    address?: string;
    state?: string;
    city?: string;
    phone?: string;
    email?: string;
    website?: string;
    logo?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  const [firm] = await db
    .select({ id: firms.id, ownerId: firms.ownerId })
    .from(firms)
    .where(eq(firms.id, firmId))
    .limit(1);
  if (!firm) return { success: false, error: "Firm not found" };
  if (firm.ownerId !== userId) return { success: false, error: "Not authorized" };

  await db.update(firms).set({ ...data, updatedAt: new Date() }).where(eq(firms.id, firmId));
  return { success: true };
}
