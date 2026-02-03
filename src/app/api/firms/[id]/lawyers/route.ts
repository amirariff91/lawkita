import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/client";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET: Get lawyers at a firm
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: firmId } = await params;
    const supabase = createServerSupabaseClient();

    // Check if firm exists
    const { data: firm } = await supabase
      .from("firms")
      .select("id, name")
      .eq("id", firmId)
      .single();

    if (!firm) {
      return NextResponse.json({ error: "Firm not found" }, { status: 404 });
    }

    // Get lawyers for this firm
    const { data: lawyers, error } = await supabase
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
        bar_status
      `)
      .eq("primary_firm_id", firmId)
      .eq("is_active", true)
      .order("years_at_bar", { ascending: false });

    if (error) {
      console.error("Error fetching firm lawyers:", error);
      return NextResponse.json({ error: "Failed to fetch lawyers" }, { status: 500 });
    }

    // Get practice areas for each lawyer
    const lawyerIds = lawyers?.map((l) => l.id) ?? [];
    const practiceAreaMap = new Map<string, string[]>();

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
          existing.push(row.practice_areas.name);
          practiceAreaMap.set(row.lawyer_id, existing);
        }
      }
    }

    const lawyerCards = (lawyers ?? []).map((lawyer) => ({
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
      subscriptionTier: lawyer.subscription_tier,
      yearsAtBar: lawyer.years_at_bar,
      reviewCount: lawyer.review_count ?? 0,
      averageRating: lawyer.average_rating,
      barStatus: lawyer.bar_status,
      practiceAreas: practiceAreaMap.get(lawyer.id) ?? [],
    }));

    return NextResponse.json({
      firmName: firm.name,
      lawyers: lawyerCards,
      total: lawyerCards.length,
    });
  } catch (error) {
    console.error("Error in firm lawyers API:", error);
    return NextResponse.json({ error: "Failed to fetch lawyers" }, { status: 500 });
  }
}
