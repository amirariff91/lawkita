import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/client";
import { z } from "zod";

const searchSchema = z.object({
  query: z.string().optional(),
  state: z.string().optional(),
  city: z.string().optional(),
  practiceArea: z.string().optional(),
  sort: z.enum(["lawyers", "experience", "name"]).optional(),
  page: z.coerce.number().min(1).optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
});

// GET: List/search firms
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const params = searchSchema.parse({
      query: searchParams.get("query") || undefined,
      state: searchParams.get("state") || undefined,
      city: searchParams.get("city") || undefined,
      practiceArea: searchParams.get("practiceArea") || undefined,
      sort: searchParams.get("sort") || undefined,
      page: searchParams.get("page") || undefined,
      limit: searchParams.get("limit") || undefined,
    });

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
        const { data: lawyerIdsInArea } = await supabase
          .from("lawyer_practice_areas")
          .select("lawyer_id")
          .eq("practice_area_id", practiceAreaRecord.id);

        const lawyerIds = lawyerIdsInArea?.map((l) => l.lawyer_id) ?? [];

        if (lawyerIds.length > 0) {
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
        return NextResponse.json({ firms: [], total: 0, page, totalPages: 0 });
      }
    }

    let queryBuilder = supabase
      .from("firms")
      .select("id, name, slug, address, state, city, lawyer_count, avg_years_experience, subscription_tier", {
        count: "exact",
      });

    if (practiceAreaFirmIds !== null) {
      if (practiceAreaFirmIds.size === 0) {
        return NextResponse.json({ firms: [], total: 0, page, totalPages: 0 });
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
      return NextResponse.json({ error: "Failed to search firms" }, { status: 500 });
    }

    const total = count ?? 0;
    const totalPages = Math.ceil(total / limit);

    const firms = (data ?? []).map((firm) => ({
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
      subscriptionTier: firm.subscription_tier,
    }));

    return NextResponse.json({ firms, total, page, totalPages });
  } catch (error) {
    console.error("Error in firms API:", error);
    return NextResponse.json({ error: "Failed to fetch firms" }, { status: 500 });
  }
}
