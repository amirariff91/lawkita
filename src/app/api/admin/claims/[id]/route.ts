import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { claims, lawyers, user, auditLogs } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import {
  sendClaimStatusNotification,
  sendClaimApprovedWhatsApp,
  sendClaimRejectedWhatsApp,
  sendClaimVerificationWhatsApp,
  generateVerificationCode,
} from "@/lib/integrations";

async function isAdmin(userId: string): Promise<boolean> {
  const currentUser = await db.query.user.findFirst({
    where: eq(user.id, userId),
    columns: { role: true },
  });
  return currentUser?.role === "admin";
}
class AlreadyClaimedError extends Error {
  constructor() {
    super("already claimed");
    this.name = "AlreadyClaimedError";
  }
}

class ClaimNotApprovableError extends Error {
  constructor() {
    super("claim is not approvable");
    this.name = "ClaimNotApprovableError";
  }
}

// GET: Fetch claim details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user || !(await isAdmin(session.user.id))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get claim with related data
    const claim = await db.query.claims.findFirst({
      where: eq(claims.id, id),
    });

    if (!claim) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    // Get lawyer and user separately
    const [lawyer, claimUser] = await Promise.all([
      db.query.lawyers.findFirst({
        where: eq(lawyers.id, claim.lawyerId),
        columns: {
          id: true,
          name: true,
          slug: true,
          barMembershipNumber: true,
          phone: true,
          email: true,
        },
      }),
      db.query.user.findFirst({
        where: eq(user.id, claim.userId),
        columns: { id: true, name: true, email: true },
      }),
    ]);

    return NextResponse.json({
      claim: {
        ...claim,
        lawyer,
        user: claimUser,
      },
    });
  } catch (error) {
    console.error("Error fetching claim:", error);
    return NextResponse.json({ error: "Failed to fetch claim" }, { status: 500 });
  }
}

// PATCH: Update claim status (approve/reject/send_whatsapp)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user || !(await isAdmin(session.user.id))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action, adminNotes, rejectionReason, whatsappNumber } = body;

    if (!["approve", "reject", "send_whatsapp"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    // Get current claim
    const claim = await db.query.claims.findFirst({
      where: eq(claims.id, id),
    });

    if (!claim) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    // Get lawyer and user
    const [lawyer, claimUser] = await Promise.all([
      db.query.lawyers.findFirst({
        where: eq(lawyers.id, claim.lawyerId),
        columns: { id: true, name: true, slug: true, phone: true },
      }),
      db.query.user.findFirst({
        where: eq(user.id, claim.userId),
        columns: { id: true, name: true, email: true },
      }),
    ]);

    if (!lawyer || !claimUser) {
      return NextResponse.json({ error: "Related data not found" }, { status: 404 });
    }

    const beforeData = {
      status: claim.status,
    };

    if (action === "send_whatsapp") {
      // Send WhatsApp verification
      const verificationCode = generateVerificationCode();

      await db
        .update(claims)
        .set({
          emailVerificationToken: verificationCode,
          emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
          adminNotes: adminNotes || claim.adminNotes,
          updatedAt: new Date(),
        })
        .where(eq(claims.id, id));

      await sendClaimVerificationWhatsApp(whatsappNumber, {
        lawyerName: lawyer.name,
        verificationCode,
        claimId: claim.id,
      });

      return NextResponse.json({
        success: true,
        message: "WhatsApp verification sent",
      });
    }

    if (action === "approve") {
      try {
        await db.transaction(async (tx) => {
          const [currentClaim] = await tx
            .select({ status: claims.status })
            .from(claims)
            .where(eq(claims.id, id))
            .limit(1);

          if (
            !currentClaim ||
            (currentClaim.status !== "pending" &&
              currentClaim.status !== "email_sent")
          ) {
            throw new ClaimNotApprovableError();
          }

          beforeData.status = currentClaim.status;

          const updatedClaims = await tx
            .update(claims)
            .set({
              status: "verified",
              reviewedBy: session.user.id,
              reviewedAt: new Date(),
              adminNotes: adminNotes || claim.adminNotes,
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(claims.id, id),
                eq(claims.status, currentClaim.status)
              )
            )
            .returning({ id: claims.id });

          if (updatedClaims.length === 0) {
            throw new ClaimNotApprovableError();
          }

          const updatedLawyers = await tx
            .update(lawyers)
            .set({
              isClaimed: true,
              isVerified: true,
              userId: claim.userId,
              claimedAt: new Date(),
              verifiedAt: new Date(),
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(lawyers.id, claim.lawyerId),
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

        if (error instanceof ClaimNotApprovableError) {
          return NextResponse.json(
            { error: "Claim is not in an approvable pending state" },
            { status: 409 }
          );
        }

        throw error;
      }

      // Send notifications
      await sendClaimStatusNotification({
        lawyerName: lawyer.name,
        userEmail: claimUser.email,
        userName: claimUser.name,
        status: "verified",
      });

      if (lawyer.phone) {
        await sendClaimApprovedWhatsApp(lawyer.phone, lawyer.name);
      }

      // Create audit log
      await db.insert(auditLogs).values({
        userId: session.user.id,
        action: "claim.approve",
        entityType: "claim",
        entityId: id,
        beforeData,
        afterData: { status: "verified" },
        metadata: { adminNotes },
      });

      return NextResponse.json({
        success: true,
        message: "Claim approved successfully",
      });
    }

    if (action === "reject") {
      if (!rejectionReason) {
        return NextResponse.json({ error: "Rejection reason required" }, { status: 400 });
      }

      // Update claim to rejected
      await db
        .update(claims)
        .set({
          status: "rejected",
          rejectionReason,
          reviewedBy: session.user.id,
          reviewedAt: new Date(),
          adminNotes: adminNotes || claim.adminNotes,
          updatedAt: new Date(),
        })
        .where(eq(claims.id, id));

      // Send notifications
      await sendClaimStatusNotification({
        lawyerName: lawyer.name,
        userEmail: claimUser.email,
        userName: claimUser.name,
        status: "rejected",
        reason: rejectionReason,
      });

      if (lawyer.phone) {
        await sendClaimRejectedWhatsApp(lawyer.phone, lawyer.name, rejectionReason);
      }

      // Create audit log
      await db.insert(auditLogs).values({
        userId: session.user.id,
        action: "claim.reject",
        entityType: "claim",
        entityId: id,
        beforeData,
        afterData: { status: "rejected", rejectionReason },
        metadata: { adminNotes },
      });

      return NextResponse.json({
        success: true,
        message: "Claim rejected",
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error updating claim:", error);
    return NextResponse.json({ error: "Failed to update claim" }, { status: 500 });
  }
}
