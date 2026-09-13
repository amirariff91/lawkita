import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { claims, lawyers, user } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import {
  sendClaimSubmittedNotification,
  sendClaimVerificationEmail,
  sendClaimVerificationWhatsApp,
  generateVerificationCode,
  verifyBarCertificate,
  sendAdminNotification,
} from "@/lib/integrations";

const SELF_SERVICE_VERIFICATION_TOKEN_PREFIX = "self-service:";

class AlreadyClaimedError extends Error {
  constructor() {
    super("already claimed");
    this.name = "AlreadyClaimedError";
  }
}

class ClaimStateChangedError extends Error {
  constructor() {
    super("claim state changed");
    this.name = "ClaimStateChangedError";
  }
}

function normalizeBarMembershipNumber(value: string | null | undefined): string | null {
  return value?.trim().toLowerCase() || null;
}

const claimSchema = z.object({
  barMembershipNumber: z.string().min(1, "Bar membership number is required"),
  firmEmail: z.string().email().optional().or(z.literal("")),
  verificationMethod: z.enum(["bar_lookup", "email", "document"]),
  verificationDocument: z.string().optional(), // Supabase storage URL
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
    const submittedBarMembershipNumber = data.barMembershipNumber.trim();

    if (!submittedBarMembershipNumber) {
      return NextResponse.json(
        { error: "Bar membership number is required" },
        { status: 400 }
      );
    }

    // Check if lawyer exists
    const lawyer = await db.query.lawyers.findFirst({
      where: eq(lawyers.id, lawyerId),
      columns: {
        id: true,
        name: true,
        isClaimed: true,
        barMembershipNumber: true,
        phone: true,
        email: true,
      },
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

    const storedBarMembershipNumber = normalizeBarMembershipNumber(
      lawyer.barMembershipNumber
    );

    // A stored Bar number must match exactly after trimming and case folding.
    // Profiles without a stored number remain admin-review only.
    if (
      storedBarMembershipNumber &&
      storedBarMembershipNumber !==
        normalizeBarMembershipNumber(submittedBarMembershipNumber)
    ) {
      return NextResponse.json(
        { error: "Bar membership number does not match our records" },
        { status: 400 }
      );
    }

    const barNumberMatches =
      Boolean(storedBarMembershipNumber) &&
      storedBarMembershipNumber ===
        normalizeBarMembershipNumber(submittedBarMembershipNumber);
    const onRecordPhone = lawyer.phone?.trim() || null;
    const onRecordEmail = lawyer.email?.trim() || null;
    const selfServiceContact = barNumberMatches
      ? onRecordPhone
        ? { channel: "whatsapp" as const, value: onRecordPhone }
        : onRecordEmail
          ? { channel: "email" as const, value: onRecordEmail }
          : null
      : null;

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

    if (data.verificationMethod === "document" && data.verificationDocument) {
      verificationResult = await verifyBarCertificate(
        data.verificationDocument,
        lawyer.name,
        lawyer.barMembershipNumber || submittedBarMembershipNumber
      );
    }

    // A self-service code is issued only when the Bar number matches and the
    // destination is already present on the lawyer's record.
    const verificationCode = selfServiceContact
      ? generateVerificationCode()
      : null;

    // Calculate expiry date (30 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    // Create claim
    const [claim] = await db
      .insert(claims)
      .values({
        lawyerId,
        userId: session.user.id,
        barMembershipNumber: submittedBarMembershipNumber,
        firmEmail: data.firmEmail || null,
        verificationMethod: data.verificationMethod,
        verificationDocument: data.verificationDocument || null,
        status: "pending",
        emailVerificationToken: null,
        emailVerificationExpires: null,
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

    let verificationSent = false;

    if (verificationCode && selfServiceContact) {
      try {
        const result =
          selfServiceContact.channel === "whatsapp"
            ? await sendClaimVerificationWhatsApp(selfServiceContact.value, {
                lawyerName: lawyer.name,
                verificationCode,
                claimId: claim.id,
              })
            : await sendClaimVerificationEmail(selfServiceContact.value, {
                lawyerName: lawyer.name,
                verificationCode,
                claimId: claim.id,
              });
        verificationSent = result.success;
      } catch (error) {
        console.error("Error sending claim verification code:", error);
      }

      // Store a usable token only after delivery succeeds.
      if (verificationSent) {
        await db
          .update(claims)
          .set({
            emailVerificationToken: `${SELF_SERVICE_VERIFICATION_TOKEN_PREFIX}${verificationCode}`,
            emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
            updatedAt: new Date(),
          })
          .where(eq(claims.id, claim.id));
      }
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
      nextSteps: verificationSent
        ? "A verification code has been sent to the contact on record. Enter it to complete verification."
        : "Your claim requires admin review. Our team will verify your information and contact you if needed.",
    });
  } catch (error) {
    console.error("Error creating claim:", error);
    return NextResponse.json(
      { error: "Failed to submit claim" },
      { status: 500 }
    );
  }
}

// PATCH: Update claim (for self-service verification response)
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
    const verificationCode =
      typeof body.verificationCode === "string"
        ? body.verificationCode.trim().toUpperCase()
        : "";

    if (!verificationCode) {
      return NextResponse.json(
        { error: "Verification code is required" },
        { status: 400 }
      );
    }

    // Find the pending claim for this user and lawyer.
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

    const lawyer = await db.query.lawyers.findFirst({
      where: eq(lawyers.id, lawyerId),
      columns: {
        barMembershipNumber: true,
        phone: true,
        email: true,
        isClaimed: true,
      },
    });

    if (!lawyer) {
      return NextResponse.json(
        { error: "Lawyer not found" },
        { status: 404 }
      );
    }

    const storedBarMembershipNumber = normalizeBarMembershipNumber(
      lawyer.barMembershipNumber
    );
    const claimBarMembershipNumber = normalizeBarMembershipNumber(
      claim.barMembershipNumber
    );

    // Self-service is unavailable without both a matching stored Bar number
    // and an on-record destination for the code.
    if (
      !storedBarMembershipNumber ||
      storedBarMembershipNumber !== claimBarMembershipNumber ||
      (!lawyer.phone?.trim() && !lawyer.email?.trim())
    ) {
      return NextResponse.json(
        { error: "This claim requires admin approval" },
        { status: 403 }
      );
    }

    const storedVerificationCode =
      claim.emailVerificationToken?.startsWith(
        SELF_SERVICE_VERIFICATION_TOKEN_PREFIX
      )
        ? claim.emailVerificationToken.slice(
            SELF_SERVICE_VERIFICATION_TOKEN_PREFIX.length
          )
        : null;

    // Only tokens issued by this self-service path can grant ownership.
    if (!storedVerificationCode || storedVerificationCode !== verificationCode) {
      return NextResponse.json(
        { error: "Invalid verification code" },
        { status: 400 }
      );
    }

    if (claim.emailVerificationExpires && new Date() > claim.emailVerificationExpires) {
      return NextResponse.json(
        { error: "Verification code has expired" },
        { status: 400 }
      );
    }

    if (lawyer.isClaimed) {
      return NextResponse.json(
        { error: "already claimed" },
        { status: 409 }
      );
    }

    try {
      await db.transaction(async (tx) => {
        const updatedClaims = await tx
          .update(claims)
          .set({
            status: "verified",
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(claims.id, claim.id),
              eq(claims.userId, session.user.id),
              eq(claims.status, "pending")
            )
          )
          .returning({ id: claims.id });

        if (updatedClaims.length === 0) {
          throw new ClaimStateChangedError();
        }

        const updatedLawyers = await tx
          .update(lawyers)
          .set({
            isClaimed: true,
            isVerified: true,
            userId: session.user.id,
            claimedAt: new Date(),
            verifiedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(lawyers.id, lawyerId),
              eq(lawyers.isClaimed, false)
            )
          )
          .returning({ id: lawyers.id });

        if (updatedLawyers.length === 0) {
          throw new AlreadyClaimedError();
        }
      });
    } catch (error) {
      if (error instanceof AlreadyClaimedError) {
        return NextResponse.json(
          { error: "already claimed" },
          { status: 409 }
        );
      }

      if (error instanceof ClaimStateChangedError) {
        return NextResponse.json(
          { error: "Claim is no longer pending" },
          { status: 409 }
        );
      }

      throw error;
    }

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
