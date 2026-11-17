import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { claims, lawyers, user } from "@/lib/db/schema";
import { eq, and, desc, lt, sql } from "drizzle-orm";
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
import {
  SELF_SERVICE_CODE_TTL_MS,
  SELF_SERVICE_MAX_ATTEMPTS,
  SELF_SERVICE_REISSUE_COOLDOWN_MS,
  attemptsAfterFailure,
  formatSelfServiceToken,
  isAttemptLimitReached,
  isReissueRateLimited,
  isSelfServiceTokenExpired,
  isVerificationCodeMatch,
  parseSelfServiceToken,
} from "@/lib/claims/verification-token";

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
  verificationDocument: z.string().optional(), // Object storage URL
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
    // Only a pending claim blocks a new one; take the newest if several exist.
    const existingClaim = await db.query.claims.findFirst({
      where: and(
        eq(claims.lawyerId, lawyerId),
        eq(claims.userId, session.user.id),
        eq(claims.status, "pending")
      ),
      orderBy: [desc(claims.createdAt)],
    });

    if (existingClaim) {
      const now = new Date();
      const parsedExisting = parseSelfServiceToken(
        existingClaim.emailVerificationToken
      );
      const tokenExpired = isSelfServiceTokenExpired(
        existingClaim.emailVerificationExpires,
        now
      );
      // Re-issue only when no code is outstanding (none ever issued, or the
      // last one was exhausted) or the last self-service code expired. A
      // token from another path (e.g. admin-sent WhatsApp code) is left alone.
      const reissueEligible =
        !existingClaim.emailVerificationToken ||
        (parsedExisting !== null && tokenExpired);
      // PATCH validates against the Bar number stored on THIS claim, so a
      // code is only useful if that number matches the record too.
      const claimBarNumberMatches =
        Boolean(storedBarMembershipNumber) &&
        normalizeBarMembershipNumber(existingClaim.barMembershipNumber) ===
          storedBarMembershipNumber;

      // A valid code is still outstanding (e.g. the user refreshed the
      // page): let the form resume code entry without sending another.
      if (
        parsedExisting !== null &&
        !tokenExpired &&
        selfServiceContact &&
        claimBarNumberMatches
      ) {
        return NextResponse.json({
          success: true,
          claimId: existingClaim.id,
          message: "Claim submitted successfully",
          verificationMethod:
            existingClaim.verificationMethod ?? data.verificationMethod,
          verificationResult: null,
          verificationSent: true,
          resumed: true,
          nextSteps:
            "A verification code has already been sent to the contact on record. Enter it to complete verification.",
        });
      }

      if (!reissueEligible || !selfServiceContact || !claimBarNumberMatches) {
        return NextResponse.json(
          { error: "You already have a pending claim for this profile" },
          { status: 400 }
        );
      }

      if (isReissueRateLimited(existingClaim.updatedAt, now)) {
        return NextResponse.json(
          { error: "Please wait a moment before requesting a new code" },
          { status: 429 }
        );
      }

      // Take the cooldown atomically before sending, so parallel POSTs
      // cannot all pass the check above and each send a message.
      const cooldownTaken = await db
        .update(claims)
        .set({ updatedAt: now })
        .where(
          and(
            eq(claims.id, existingClaim.id),
            eq(claims.status, "pending"),
            lt(
              claims.updatedAt,
              new Date(now.getTime() - SELF_SERVICE_REISSUE_COOLDOWN_MS)
            )
          )
        )
        .returning({ id: claims.id });

      if (cooldownTaken.length === 0) {
        return NextResponse.json(
          { error: "Please wait a moment before requesting a new code" },
          { status: 429 }
        );
      }

      const reissuedCode = generateVerificationCode();
      let reissueSent = false;

      try {
        const result =
          selfServiceContact.channel === "whatsapp"
            ? await sendClaimVerificationWhatsApp(selfServiceContact.value, {
                lawyerName: lawyer.name,
                verificationCode: reissuedCode,
                expiresIn: "30 minutes",
                entry: "site",
                claimId: existingClaim.id,
              })
            : await sendClaimVerificationEmail(selfServiceContact.value, {
                lawyerName: lawyer.name,
                verificationCode: reissuedCode,
                claimId: existingClaim.id,
              });
        reissueSent = result.success;
      } catch (error) {
        console.error("Error resending claim verification code:", error);
      }

      let reissueStored = false;
      if (reissueSent) {
        // Store only if nothing touched the claim since we took the
        // cooldown (same updatedAt stamp): an admin action or status change
        // in between wins, and the response then reports no code.
        const stored = await db
          .update(claims)
          .set({
            emailVerificationToken: formatSelfServiceToken(reissuedCode, 0),
            emailVerificationExpires: new Date(
              now.getTime() + SELF_SERVICE_CODE_TTL_MS
            ),
            updatedAt: now,
          })
          .where(
            and(
              eq(claims.id, existingClaim.id),
              eq(claims.status, "pending"),
              eq(claims.updatedAt, now)
            )
          )
          .returning({ id: claims.id });
        reissueStored = stored.length > 0;
      }

      return NextResponse.json({
        success: true,
        claimId: existingClaim.id,
        message: "Claim submitted successfully",
        verificationMethod:
          existingClaim.verificationMethod ?? data.verificationMethod,
        verificationResult: null,
        verificationSent: reissueStored,
        nextSteps: reissueStored
          ? "A verification code has been sent to the contact on record. Enter it to complete verification."
          : "Your claim requires admin review. Our team will verify your information and contact you if needed.",
      });
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
    // Serialise claim creation per (lawyer, user) with a transaction-scoped
    // advisory lock, then re-check, so parallel first submissions cannot
    // create duplicate pending claims or send duplicate codes. No schema
    // change needed (a partial unique index would be the long-term fix).
    const claim = await db.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT pg_advisory_xact_lock(hashtext(${lawyer.id}), hashtext(${session.user.id}))`
      );
      const concurrent = await tx.query.claims.findFirst({
        where: and(
          eq(claims.lawyerId, lawyerId),
          eq(claims.userId, session.user.id),
          eq(claims.status, "pending")
        ),
        columns: { id: true },
      });
      if (concurrent) return null;

      const [inserted] = await tx
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
      return inserted;
    });

    if (!claim) {
      return NextResponse.json(
        { error: "A claim for this profile is already being processed. Please wait a moment and try again." },
        { status: 429 }
      );
    }

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
                expiresIn: "30 minutes",
                entry: "site",
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
            emailVerificationToken: formatSelfServiceToken(verificationCode, 0),
            emailVerificationExpires: new Date(
              Date.now() + SELF_SERVICE_CODE_TTL_MS
            ),
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
      verificationSent,
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
      orderBy: [desc(claims.createdAt)],
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

    const parsedToken = parseSelfServiceToken(
      claim.emailVerificationToken
    );
    const tooManyAttempts = () =>
      NextResponse.json(
        { error: "Too many incorrect attempts. Please request a new code." },
        { status: 429 }
      );

    // Only tokens issued by this self-service path can grant ownership.
    if (!parsedToken) {
      return NextResponse.json(
        { error: "Invalid verification code" },
        { status: 400 }
      );
    }

    // Reserve one attempt BEFORE comparing, using compare-and-swap on the
    // token string. Every guess, including parallel ones, must win its own
    // swap, so a burst of concurrent requests cannot share a single attempt.
    let currentToken = claim.emailVerificationToken ?? "";
    let currentExpires = claim.emailVerificationExpires;
    let current = parsedToken;
    let reserved = false;

    for (let i = 0; i < SELF_SERVICE_MAX_ATTEMPTS && !reserved; i++) {
      if (isAttemptLimitReached(current.attempts)) break;

      const nextAttempts = attemptsAfterFailure(current.attempts);
      const nextToken = formatSelfServiceToken(current.code, nextAttempts);
      const swapped = await db
        .update(claims)
        .set({ emailVerificationToken: nextToken, updatedAt: new Date() })
        .where(
          and(
            eq(claims.id, claim.id),
            eq(claims.status, "pending"),
            eq(claims.emailVerificationToken, currentToken)
          )
        )
        .returning({ id: claims.id });

      if (swapped.length > 0) {
        reserved = true;
        currentToken = nextToken;
        current = { code: current.code, attempts: nextAttempts };
        break;
      }

      // Lost the race: re-read the latest token and try again.
      const latest = await db.query.claims.findFirst({
        where: eq(claims.id, claim.id),
        columns: {
          emailVerificationToken: true,
          emailVerificationExpires: true,
          status: true,
        },
      });
      const latestParsed =
        latest?.status === "pending"
          ? parseSelfServiceToken(latest.emailVerificationToken)
          : null;
      if (!latest?.emailVerificationToken || !latestParsed) {
        return tooManyAttempts();
      }
      currentToken = latest.emailVerificationToken;
      currentExpires = latest.emailVerificationExpires;
      current = latestParsed;
    }

    if (!reserved) {
      if (isAttemptLimitReached(current.attempts)) {
        await db
          .update(claims)
          .set({
            emailVerificationToken: null,
            emailVerificationExpires: null,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(claims.id, claim.id),
              eq(claims.emailVerificationToken, currentToken)
            )
          );
        return tooManyAttempts();
      }
      return NextResponse.json(
        { error: "Please try again in a moment" },
        { status: 429 }
      );
    }

    if (!isVerificationCodeMatch(verificationCode, current.code)) {
      if (isAttemptLimitReached(current.attempts)) {
        await db
          .update(claims)
          .set({
            emailVerificationToken: null,
            emailVerificationExpires: null,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(claims.id, claim.id),
              eq(claims.emailVerificationToken, currentToken)
            )
          );
        return tooManyAttempts();
      }
      return NextResponse.json(
        { error: "Invalid verification code" },
        { status: 400 }
      );
    }

    if (isSelfServiceTokenExpired(currentExpires)) {
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
            // Consume the verified code so it cannot be replayed.
            emailVerificationToken: null,
            emailVerificationExpires: null,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(claims.id, claim.id),
              eq(claims.userId, session.user.id),
              eq(claims.status, "pending"),
              // Grant only for the exact code generation verified above; a
              // re-issue or revocation in between makes this match nothing.
              eq(claims.emailVerificationToken, currentToken)
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
