import { createServerSupabaseClient } from "@/lib/supabase/client";
import type { LawyerCardData } from "@/types/lawyer";

export interface FirmWithStats {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  state: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
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
}

/**
 * Normalizes an address for deduplication matching
 */
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

/**
 * Get firm by slug with full details and lawyers
 */
export async function getFirmBySlug(slug: string): Promise<FirmWithStats | null> {
  const supabase = createServerSupabaseClient();

  // Get firm details
  const { data: firm, error } = await supabase
    .from("firms")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error || !firm) {
    return null;
  }

  // Get lawyers for this firm
  const { data: lawyers } = await supabase
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
    .eq("primary_firm_id", firm.id)
    .eq("is_active", true)
    .order("years_at_bar", { ascending: false });

  const lawyerIds = lawyers?.map((l) => l.id) ?? [];

  // Get practice areas for lawyers
  const practiceAreaMap: Map<string, string[]> = new Map();
  const allPracticeAreas = new Set<string>();

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
        // @ts-expect-error - Supabase types
        const areaName = row.practice_areas.name;
        existing.push(areaName);
        allPracticeAreas.add(areaName);
        practiceAreaMap.set(row.lawyer_id, existing);
      }
    }
  }

  // Map lawyers to LawyerCardData
  const lawyerCards: LawyerCardData[] = (lawyers ?? []).map((lawyer) => ({
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

  // Calculate average years of experience
  const validYears = lawyerCards
    .map((l) => l.yearsAtBar)
    .filter((y): y is number => y !== null);
  const avgYears = validYears.length > 0
    ? validYears.reduce((a, b) => a + b, 0) / validYears.length
    : null;

  return {
    id: firm.id,
    name: firm.name,
    slug: firm.slug,
    address: firm.address,
    state: firm.state,
    city: firm.city,
    phone: firm.phone,
    email: firm.email,
    website: firm.website,
    lawyerCount: lawyerCards.length,
    avgYearsExperience: avgYears,
    practiceAreas: Array.from(allPracticeAreas),
    lawyers: lawyerCards,
  };
}

/**
 * Get or create a firm based on name and address
 * Uses normalized address for deduplication
 */
export async function getOrCreateFirm(
  firmName: string,
  firmAddress: string | null,
  state: string | null,
  city: string | null
): Promise<{ id: string; slug: string; isNew: boolean }> {
  const supabase = createServerSupabaseClient();
  const normalizedAddr = normalizeAddress(firmAddress);

  // Try to find existing firm by normalized address
  if (normalizedAddr) {
    const { data: existingFirm } = await supabase
      .from("firms")
      .select("id, slug")
      .eq("normalized_address", normalizedAddr)
      .single();

    if (existingFirm) {
      return { id: existingFirm.id, slug: existingFirm.slug, isNew: false };
    }
  }

  // Try to find by exact name match in same city
  if (city) {
    const { data: existingFirm } = await supabase
      .from("firms")
      .select("id, slug")
      .eq("name", firmName)
      .eq("city", city)
      .single();

    if (existingFirm) {
      return { id: existingFirm.id, slug: existingFirm.slug, isNew: false };
    }
  }

  // Create new firm
  const slug = generateFirmSlug(firmName, city);

  const { data: newFirm, error } = await supabase
    .from("firms")
    .insert({
      name: firmName,
      slug,
      address: firmAddress,
      normalized_address: normalizedAddr || null,
      state,
      city,
    })
    .select("id, slug")
    .single();

  if (error) {
    // Handle slug conflict by adding a random suffix
    const slugWithSuffix = `${slug}-${Date.now().toString(36)}`;
    const { data: retryFirm, error: retryError } = await supabase
      .from("firms")
      .insert({
        name: firmName,
        slug: slugWithSuffix,
        address: firmAddress,
        normalized_address: normalizedAddr || null,
        state,
        city,
      })
      .select("id, slug")
      .single();

    if (retryError) {
      throw new Error(`Failed to create firm: ${retryError.message}`);
    }

    return { id: retryFirm.id, slug: retryFirm.slug, isNew: true };
  }

  return { id: newFirm.id, slug: newFirm.slug, isNew: true };
}

/**
 * Generate a URL-friendly slug for a firm
 */
function generateFirmSlug(name: string, city: string | null): string {
  const baseSlug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);

  if (city) {
    const citySlug = city
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 20);
    return `${baseSlug}-${citySlug}`;
  }

  return baseSlug;
}

/**
 * Get lawyer's firm history
 */
export async function getLawyerFirmHistory(
  lawyerId: string
): Promise<{ firmName: string; firmSlug: string | null; isCurrent: boolean }[]> {
  const supabase = createServerSupabaseClient();

  const { data: history } = await supabase
    .from("lawyer_firm_history")
    .select(`
      firm_name,
      firm_id,
      is_current,
      firms(slug)
    `)
    .eq("lawyer_id", lawyerId)
    .order("is_current", { ascending: false })
    .order("last_seen", { ascending: false });

  if (!history) return [];

  return history.map((h) => ({
    firmName: h.firm_name,
    // @ts-expect-error - Supabase types
    firmSlug: h.firms?.slug ?? null,
    isCurrent: h.is_current,
  }));
}

export type FirmSortOption = "lawyers" | "experience" | "name";

/**
 * Search firms with pagination
 */
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
  const { query, state, city, practiceArea, sort = "lawyers", page = 1, limit = 20 } = params;
  const offset = (page - 1) * limit;
  const supabase = createServerSupabaseClient();

  // If filtering by practice area, get firm IDs that have lawyers in that practice area
  let practiceAreaFirmIds: Set<string> | null = null;
  if (practiceArea) {
    const { data: practiceAreaRecord } = await supabase
      .from("practice_areas")
      .select("id")
      .eq("slug", practiceArea)
      .single();

    if (practiceAreaRecord) {
      // Get lawyer IDs in this practice area
      const { data: lawyerIdsInArea } = await supabase
        .from("lawyer_practice_areas")
        .select("lawyer_id")
        .eq("practice_area_id", practiceAreaRecord.id);

      const lawyerIds = lawyerIdsInArea?.map((l) => l.lawyer_id) ?? [];

      if (lawyerIds.length > 0) {
        // Get firm IDs for these lawyers
        const { data: firmIdsData } = await supabase
          .from("lawyers")
          .select("primary_firm_id")
          .in("id", lawyerIds)
          .not("primary_firm_id", "is", null);

        practiceAreaFirmIds = new Set(
          firmIdsData?.map((l) => l.primary_firm_id).filter(Boolean) as string[] ?? []
        );
      } else {
        practiceAreaFirmIds = new Set();
      }
    } else {
      // Practice area not found - return empty results
      return { firms: [], total: 0, page, totalPages: 0 };
    }
  }

  let queryBuilder = supabase
    .from("firms")
    .select("id, name, slug, address, state, city, lawyer_count, avg_years_experience", {
      count: "exact",
    });

  // Filter by practice area firm IDs
  if (practiceAreaFirmIds !== null) {
    if (practiceAreaFirmIds.size === 0) {
      return { firms: [], total: 0, page, totalPages: 0 };
    }
    queryBuilder = queryBuilder.in("id", Array.from(practiceAreaFirmIds));
  }

  if (query) {
    queryBuilder = queryBuilder.or(`name.ilike.%${query}%,address.ilike.%${query}%`);
  }

  if (state) {
    queryBuilder = queryBuilder.eq("state", state);
  }

  if (city) {
    queryBuilder = queryBuilder.eq("city", city);
  }

  // Apply sorting
  switch (sort) {
    case "experience":
      queryBuilder = queryBuilder.order("avg_years_experience", { ascending: false, nullsFirst: false });
      break;
    case "name":
      queryBuilder = queryBuilder.order("name", { ascending: true });
      break;
    case "lawyers":
    default:
      queryBuilder = queryBuilder.order("lawyer_count", { ascending: false, nullsFirst: false });
      break;
  }

  queryBuilder = queryBuilder.range(offset, offset + limit - 1);

  const { data, count, error } = await queryBuilder;

  if (error) {
    console.error("Error searching firms:", error);
    return { firms: [], total: 0, page, totalPages: 0 };
  }

  const total = count ?? 0;
  const totalPages = Math.ceil(total / limit);

  const firms: FirmCardData[] = (data ?? []).map((firm) => ({
    id: firm.id,
    name: firm.name,
    slug: firm.slug,
    address: firm.address,
    state: firm.state,
    city: firm.city,
    lawyerCount: firm.lawyer_count ?? 0,
    avgYearsExperience: firm.avg_years_experience
      ? parseFloat(firm.avg_years_experience)
      : null,
  }));

  return { firms, total, page, totalPages };
}

/**
 * Update firm contact info by aggregating from its lawyers
 * Uses the most common phone/email from active lawyers at the firm
 */
export async function updateFirmContactInfo(firmId: string): Promise<void> {
  const supabase = createServerSupabaseClient();

  // Get all active lawyers at this firm
  const { data: lawyers } = await supabase
    .from("lawyers")
    .select("phone, email")
    .eq("primary_firm_id", firmId)
    .eq("is_active", true);

  if (!lawyers || lawyers.length === 0) {
    return;
  }

  // Find most common phone (excluding nulls)
  const phones = lawyers.map((l) => l.phone).filter(Boolean) as string[];
  const phoneCounts = new Map<string, number>();
  for (const phone of phones) {
    phoneCounts.set(phone, (phoneCounts.get(phone) ?? 0) + 1);
  }
  const mostCommonPhone = [...phoneCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  // Find most common email (excluding nulls)
  const emails = lawyers.map((l) => l.email).filter(Boolean) as string[];
  const emailCounts = new Map<string, number>();
  for (const email of emails) {
    emailCounts.set(email, (emailCounts.get(email) ?? 0) + 1);
  }
  const mostCommonEmail = [...emailCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  // Update firm with aggregated contact info (only if firm doesn't already have them)
  const { data: firm } = await supabase
    .from("firms")
    .select("phone, email")
    .eq("id", firmId)
    .single();

  const updates: Record<string, string | null> = {};
  if (!firm?.phone && mostCommonPhone) {
    updates.phone = mostCommonPhone;
  }
  if (!firm?.email && mostCommonEmail) {
    updates.email = mostCommonEmail;
  }

  if (Object.keys(updates).length > 0) {
    await supabase.from("firms").update(updates).eq("id", firmId);
  }
}

/**
 * Update cached lawyer count and average years experience for a firm
 */
export async function updateFirmCachedStats(firmId: string): Promise<void> {
  const supabase = createServerSupabaseClient();

  // Get all active lawyers at this firm
  const { data: lawyers } = await supabase
    .from("lawyers")
    .select("years_at_bar")
    .eq("primary_firm_id", firmId)
    .eq("is_active", true);

  const lawyerCount = lawyers?.length ?? 0;
  const yearsArray = lawyers
    ?.map((l) => l.years_at_bar)
    .filter((y): y is number => y !== null) ?? [];
  const avgYearsExperience =
    yearsArray.length > 0
      ? yearsArray.reduce((a, b) => a + b, 0) / yearsArray.length
      : null;

  await supabase
    .from("firms")
    .update({
      lawyer_count: lawyerCount,
      avg_years_experience: avgYearsExperience,
      updated_at: new Date().toISOString(),
    })
    .eq("id", firmId);
}

/**
 * Get firm by ID
 */
export async function getFirmById(firmId: string): Promise<FirmWithStats | null> {
  const supabase = createServerSupabaseClient();

  const { data: firm } = await supabase
    .from("firms")
    .select("slug")
    .eq("id", firmId)
    .single();

  if (!firm) return null;

  return getFirmBySlug(firm.slug);
}

/**
 * Get firm for dashboard (with ownership info)
 */
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

export async function getFirmForDashboard(
  firmId: string,
  userId: string
): Promise<FirmDashboardData | null> {
  const supabase = createServerSupabaseClient();

  const { data: firm, error } = await supabase
    .from("firms")
    .select("*")
    .eq("id", firmId)
    .eq("owner_id", userId)
    .single();

  if (error || !firm) {
    return null;
  }

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
    isClaimed: firm.is_claimed,
    subscriptionTier: firm.subscription_tier as "free" | "firm_premium",
    subscriptionExpiresAt: firm.subscription_expires_at
      ? new Date(firm.subscription_expires_at)
      : null,
    lawyerCount: firm.lawyer_count ?? 0,
    avgYearsExperience: firm.avg_years_experience
      ? parseFloat(firm.avg_years_experience)
      : null,
  };
}

/**
 * Get user's claimed firm (if any)
 */
export async function getUserFirm(userId: string): Promise<FirmDashboardData | null> {
  const supabase = createServerSupabaseClient();

  const { data: firm, error } = await supabase
    .from("firms")
    .select("*")
    .eq("owner_id", userId)
    .single();

  if (error || !firm) {
    return null;
  }

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
    isClaimed: firm.is_claimed,
    subscriptionTier: firm.subscription_tier as "free" | "firm_premium",
    subscriptionExpiresAt: firm.subscription_expires_at
      ? new Date(firm.subscription_expires_at)
      : null,
    lawyerCount: firm.lawyer_count ?? 0,
    avgYearsExperience: firm.avg_years_experience
      ? parseFloat(firm.avg_years_experience)
      : null,
  };
}

/**
 * Update firm profile
 */
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
  const supabase = createServerSupabaseClient();

  // Verify ownership
  const { data: firm } = await supabase
    .from("firms")
    .select("id, owner_id")
    .eq("id", firmId)
    .single();

  if (!firm || firm.owner_id !== userId) {
    return { success: false, error: "Not authorized" };
  }

  const { error } = await supabase
    .from("firms")
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    })
    .eq("id", firmId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
