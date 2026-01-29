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

/**
 * Search firms with pagination
 */
export async function searchFirms(params: {
  query?: string;
  state?: string;
  city?: string;
  page?: number;
  limit?: number;
}): Promise<{
  firms: FirmCardData[];
  total: number;
  page: number;
  totalPages: number;
}> {
  const { query, state, city, page = 1, limit = 20 } = params;
  const offset = (page - 1) * limit;
  const supabase = createServerSupabaseClient();

  let queryBuilder = supabase
    .from("firms")
    .select("id, name, slug, address, state, city, lawyer_count, avg_years_experience", {
      count: "exact",
    });

  if (query) {
    queryBuilder = queryBuilder.or(`name.ilike.%${query}%,address.ilike.%${query}%`);
  }

  if (state) {
    queryBuilder = queryBuilder.eq("state", state);
  }

  if (city) {
    queryBuilder = queryBuilder.eq("city", city);
  }

  queryBuilder = queryBuilder
    .order("lawyer_count", { ascending: false, nullsFirst: false })
    .range(offset, offset + limit - 1);

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
