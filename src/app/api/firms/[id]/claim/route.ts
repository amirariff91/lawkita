import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase/client";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { sendFirmClaimSubmittedNotification, sendAdminFirmClaimNotification } from "@/lib/integrations/resend-firms";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const claimSchema = z.object({
  position: z.string().min(1, "Position is required").max(200),
  verificationDocument: z.string().url("Invalid document URL").optional(),
});

// POST: Submit a claim for a firm
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: firmId } = await params;

    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validationResult = claimSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const { position, verificationDocument } = validationResult.data;
    const supabase = createServerSupabaseClient();

    // Check if firm exists
    const { data: firm } = await supabase
      .from("firms")
      .select("id, name, slug, is_claimed")
      .eq("id", firmId)
      .single();

    if (!firm) {
      return NextResponse.json({ error: "Firm not found" }, { status: 404 });
    }

    // Check if already claimed
    if (firm.is_claimed) {
      return NextResponse.json(
        { error: "This firm has already been claimed" },
        { status: 400 }
      );
    }

    // Check if user already has a pending claim for this firm
    const { data: existingClaim } = await supabase
      .from("firm_claims")
      .select("id")
      .eq("firm_id", firmId)
      .eq("user_id", session.user.id)
      .eq("status", "pending")
      .single();

    if (existingClaim) {
      return NextResponse.json(
        { error: "You already have a pending claim for this firm" },
        { status: 400 }
      );
    }

    // Create the claim
    const { data: claim, error: claimError } = await supabase
      .from("firm_claims")
      .insert({
        firm_id: firmId,
        user_id: session.user.id,
        position,
        verification_document: verificationDocument,
        status: "pending",
      })
      .select("id")
      .single();

    if (claimError) {
      console.error("Error creating firm claim:", claimError);
      return NextResponse.json({ error: "Failed to submit claim" }, { status: 500 });
    }

    // Send notification emails
    try {
      await sendFirmClaimSubmittedNotification({
        firmName: firm.name,
        userEmail: session.user.email,
        userName: session.user.name || session.user.email.split("@")[0],
        claimId: claim.id,
        position,
      });

      await sendAdminFirmClaimNotification({
        firmName: firm.name,
        firmSlug: firm.slug,
        claimId: claim.id,
        userName: session.user.name || session.user.email.split("@")[0],
        position,
      });
    } catch (emailError) {
      // Don't fail the request if email fails
      console.error("Failed to send notification emails:", emailError);
    }

    return NextResponse.json({
      success: true,
      claimId: claim.id,
    });
  } catch (error) {
    console.error("Error submitting firm claim:", error);
    return NextResponse.json({ error: "Failed to submit claim" }, { status: 500 });
  }
}
