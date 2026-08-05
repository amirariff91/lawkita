import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { firmClaims, firms } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
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

    // Check if firm exists
    const [firm] = await db
      .select({ id: firms.id, name: firms.name, slug: firms.slug, isClaimed: firms.isClaimed })
      .from(firms)
      .where(eq(firms.id, firmId))
      .limit(1);

    if (!firm) {
      return NextResponse.json({ error: "Firm not found" }, { status: 404 });
    }

    // Check if already claimed
    if (firm.isClaimed) {
      return NextResponse.json(
        { error: "This firm has already been claimed" },
        { status: 400 }
      );
    }

    // Check if user already has a pending claim for this firm
    const [existingClaim] = await db
      .select({ id: firmClaims.id })
      .from(firmClaims)
      .where(
        and(
          eq(firmClaims.firmId, firmId),
          eq(firmClaims.userId, session.user.id),
          eq(firmClaims.status, "pending")
        )
      )
      .limit(1);

    if (existingClaim) {
      return NextResponse.json(
        { error: "You already have a pending claim for this firm" },
        { status: 400 }
      );
    }

    // Create the claim
    const [claim] = await db
      .insert(firmClaims)
      .values({
        firmId,
        userId: session.user.id,
        position,
        verificationDocument,
        status: "pending",
      })
      .returning({ id: firmClaims.id });

    if (!claim) {
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
