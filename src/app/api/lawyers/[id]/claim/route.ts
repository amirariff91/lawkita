import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { claims, lawyers, user } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import {
  sendClaimSubmittedNotification,
  sendClaimVerificationWhatsApp,
  generateVerificationCode,
  verifyBarCertificate,
  sendAdminNotification,
} from "@/lib/integrations";

const claimSchema = z.object({
  barMembershipNumber: z.string().min(1, "Bar membership number is required"),
  firmEmail: z.string().email().optional().or(z.literal("")),
  verificationMethod: z.enum(["bar_lookup", "email", "document"]),
  verificationDocument: z.string().optional(), // Supabase storage URL
  phoneNumber: z.string().optional(), // For WhatsApp verification
});

// GET: Check claim status
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: lawyerId } = await params;

    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get the user's claim for this lawyer
    const claim = await db.query.claims.findFirst({
      where: and(
        eq(claims.lawyerId, lawyerId),
        eq(claims.userId, session.user.id)
      ),
    });

    if (!claim) {
      return NextResponse.json({ claim: null });
    }

    return NextResponse.json({
      claim: {
        id: claim.id,
        status: claim.status,
        verificationMethod: claim.verificationMethod,
        createdAt: claim.createdAt,
        expiresAt: claim.expiresAt,
        rejectionReason: claim.rejectionReason,
      },
    });
  } catch (error) {
    console.error("Error fetching claim:", error);
    return NextResponse.json(
      { error: "Failed to fetch claim status" },
      { status: 500 }
    );
  }
}

// POST: Submit new claim
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: lawyerId } = await params;

    // Get the session
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: "You must be logged in to claim a profile" },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Validate input
    const validationResult = claimSchema.safeParse(body);
    if (!validationResult.success) {
      const firstIssue = validationResult.error.issues[0];
      return NextResponse.json(
        { error: firstIssue?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Check if lawyer exists
    const lawyer = await db.query.lawyers.findFirst({
      where: eq(lawyers.id, lawyerId),
      columns: { id: true, name: true, isClaimed: true, userId: true, barMembershipNumber: true },
    });

    if (!lawyer) {
      return NextResponse.json(
        { error: "Lawyer not found" },
        { status: 404 }
      );
    }

    if (lawyer.isClaimed) {
      return NextResponse.json(
        { error: "This profile has already been claimed" },
        { status: 400 }
      );
    }

    // Check if user already has a pending claim for this lawyer
    const existingClaim = await db.query.claims.findFirst({
      where: and(
        eq(claims.lawyerId, lawyerId),
        eq(claims.userId, session.user.id)
      ),
    });

    if (existingClaim && existingClaim.status === "pending") {
      return NextResponse.json(
        { error: "You already have a pending claim for this profile" },
        { status: 400 }
      );
    }

    // If document verification, verify the document first
    let verificationResult = null;
    let initialStatus: "pending" | "email_sent" = "pending";

    if (data.verificationMethod === "document" && data.verificationDocument) {
      verificationResult = await verifyBarCertificate(
        data.verificationDocument,
        lawyer.name,
        lawyer.barMembershipNumber || data.barMembershipNumber
      );

      // If high confidence (90%+), mark as pending for quick approval
      // If lower confidence, still pending but requires human review
      if (verificationResult.confidence >= 90 && verificationResult.isValid) {
        // Auto-verification candidate - will still need WhatsApp confirmation
        initialStatus = "pending";
      }
    }

    // Generate verification code for WhatsApp/phone callback
    const verificationCode = generateVerificationCode();

    // Calculate expiry date (30 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    // Create claim
    const [claim] = await db
      .insert(claims)
      .values({
        lawyerId,
        userId: session.user.id,
        barMembershipNumber: data.barMembershipNumber,
        firmEmail: data.firmEmail || null,
        verificationMethod: data.verificationMethod,
        verificationDocument: data.verificationDocument || null,
        status: data.verificationMethod === "email" ? "email_sent" : initialStatus,
        emailVerificationToken: verificationCode, // Reusing for WhatsApp verification
        emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        expiresAt,
      })
      .returning();

    // Get user info for notifications
    const claimUser = await db.query.user.findFirst({
      where: eq(user.id, session.user.id),
      columns: { email: true, name: true },
    });

    // Send email notification to user
    if (claimUser?.email) {
      await sendClaimSubmittedNotification({
        lawyerName: lawyer.name,
        userEmail: claimUser.email,
        userName: claimUser.name || "there",
        claimId: claim.id,
        verificationMethod: data.verificationMethod,
      });
    }

    // If phone number provided, send WhatsApp verification
    if (data.phoneNumber) {
      await sendClaimVerificationWhatsApp(data.phoneNumber, {
        lawyerName: lawyer.name,
        verificationCode,
        claimId: claim.id,
      });
    }

    // Notify admin of new claim
    await sendAdminNotification({
      type: "claim",
      entityId: claim.id,
      summary: `New claim for ${lawyer.name} by ${claimUser?.name || session.user.id}. Verification method: ${data.verificationMethod}${verificationResult ? `. AI confidence: ${verificationResult.confidence}%` : ""}`,
    });

    return NextResponse.json({
      success: true,
      claimId: claim.id,
      message: "Claim submitted successfully",
      verificationMethod: data.verificationMethod,
      verificationResult: verificationResult
        ? {
            confidence: verificationResult.confidence,
            isValid: verificationResult.isValid,
            issues: verificationResult.issues,
          }
        : null,
      nextSteps:
        data.verificationMethod === "document"
          ? "Your bar certificate is being verified. You will receive a WhatsApp message or phone call within 24-48 hours."
          : data.verificationMethod === "email"
            ? "A verification email has been sent to your firm email address."
            : "Your claim is being processed. Please allow 24-48 hours for verification.",
    });
  } catch (error) {
    console.error("Error creating claim:", error);
    return NextResponse.json(
      { error: "Failed to submit claim" },
      { status: 500 }
    );
  }
}

// PATCH: Update claim (for admin verification response)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: lawyerId } = await params;

    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { verificationCode } = body;

    if (!verificationCode) {
      return NextResponse.json(
        { error: "Verification code is required" },
        { status: 400 }
      );
    }

    // Find the pending claim with matching verification code
    const claim = await db.query.claims.findFirst({
      where: and(
        eq(claims.lawyerId, lawyerId),
        eq(claims.userId, session.user.id),
        eq(claims.status, "pending")
      ),
    });

    if (!claim) {
      return NextResponse.json(
        { error: "No pending claim found" },
        { status: 404 }
      );
    }

    // Verify the code
    if (claim.emailVerificationToken !== verificationCode.toUpperCase()) {
      return NextResponse.json(
        { error: "Invalid verification code" },
        { status: 400 }
      );
    }

    // Check if code has expired
    if (claim.emailVerificationExpires && new Date() > claim.emailVerificationExpires) {
      return NextResponse.json(
        { error: "Verification code has expired" },
        { status: 400 }
      );
    }

    // Update claim status to verified
    await db
      .update(claims)
      .set({
        status: "verified",
        updatedAt: new Date(),
      })
      .where(eq(claims.id, claim.id));

    // Update lawyer profile to claimed
    await db
      .update(lawyers)
      .set({
        isClaimed: true,
        isVerified: true,
        userId: session.user.id,
        claimedAt: new Date(),
        verifiedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(lawyers.id, lawyerId));

    return NextResponse.json({
      success: true,
      message: "Profile verified successfully",
    });
  } catch (error) {
    console.error("Error verifying claim:", error);
    return NextResponse.json(
      { error: "Failed to verify claim" },
      { status: 500 }
    );
  }
}
