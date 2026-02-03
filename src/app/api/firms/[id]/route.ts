import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase/client";
import { auth } from "@/lib/auth";
import { z } from "zod";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET: Get firm by ID
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = createServerSupabaseClient();

    const { data: firm, error } = await supabase
      .from("firms")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !firm) {
      return NextResponse.json({ error: "Firm not found" }, { status: 404 });
    }

    // Get lawyers for this firm
    const { data: lawyers } = await supabase
      .from("lawyers")
      .select(`
        id,
        slug,
        name,
        photo,
        state,
        city,
        is_verified,
        years_at_bar
      `)
      .eq("primary_firm_id", firm.id)
      .eq("is_active", true)
      .order("years_at_bar", { ascending: false });

    return NextResponse.json({
      firm: {
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
        subscriptionTier: firm.subscription_tier,
        lawyerCount: firm.lawyer_count ?? 0,
        avgYearsExperience: firm.avg_years_experience
          ? parseFloat(firm.avg_years_experience)
          : null,
      },
      lawyers: lawyers ?? [],
    });
  } catch (error) {
    console.error("Error fetching firm:", error);
    return NextResponse.json({ error: "Failed to fetch firm" }, { status: 500 });
  }
}

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  address: z.string().max(500).optional(),
  state: z.string().max(100).optional(),
  city: z.string().max(100).optional(),
  phone: z.string().max(50).optional(),
  email: z.string().email().max(200).optional(),
  website: z.string().url().max(500).optional(),
  logo: z.string().url().max(500).optional(),
});

// PATCH: Update firm profile (requires ownership)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServerSupabaseClient();

    // Verify ownership
    const { data: firm } = await supabase
      .from("firms")
      .select("id, owner_id")
      .eq("id", id)
      .single();

    if (!firm) {
      return NextResponse.json({ error: "Firm not found" }, { status: 404 });
    }

    if (firm.owner_id !== session.user.id) {
      return NextResponse.json({ error: "Not authorized to edit this firm" }, { status: 403 });
    }

    const body = await request.json();
    const validationResult = updateSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const updates = {
      ...validationResult.data,
      updated_at: new Date().toISOString(),
    };

    const { error: updateError } = await supabase
      .from("firms")
      .update(updates)
      .eq("id", id);

    if (updateError) {
      console.error("Error updating firm:", updateError);
      return NextResponse.json({ error: "Failed to update firm" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating firm:", error);
    return NextResponse.json({ error: "Failed to update firm" }, { status: 500 });
  }
}
