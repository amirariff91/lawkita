import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { firmClaims, firms, user, auditLogs } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { sendFirmClaimStatusNotification } from "@/lib/integrations/resend-firms";

interface RouteParams {
  params: Promise<{ id: string }>;
}

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

// GET: Fetch firm claim details
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user || !(await isAdmin(session.user.id))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get claim with related data
    const claim = await db.query.firmClaims.findFirst({
      where: eq(firmClaims.id, id),
    });

    if (!claim) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    // Get firm and user separately
    const [firm, claimUser] = await Promise.all([
      db.query.firms.findFirst({
        where: eq(firms.id, claim.firmId),
        columns: {
          id: true,
          name: true,
          slug: true,
          address: true,
          city: true,
          state: true,
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
        firm,
        user: claimUser,
      },
    });
  } catch (error) {
    console.error("Error fetching firm claim:", error);
    return NextResponse.json({ error: "Failed to fetch claim" }, { status: 500 });
  }
}

// PATCH: Update firm claim status (approve/reject)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user || !(await isAdmin(session.user.id))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action, adminNotes, rejectionReason } = body;

    if (!["approve", "reject"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    // Get current claim
    const claim = await db.query.firmClaims.findFirst({
      where: eq(firmClaims.id, id),
    });

    if (!claim) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    // Get firm and user
    const [firm, claimUser] = await Promise.all([
      db.query.firms.findFirst({
        where: eq(firms.id, claim.firmId),
        columns: { id: true, name: true, slug: true },
      }),
      db.query.user.findFirst({
        where: eq(user.id, claim.userId),
        columns: { id: true, name: true, email: true },
      }),
    ]);

    if (!firm || !claimUser) {
      return NextResponse.json({ error: "Related data not found" }, { status: 404 });
    }

    const beforeData = {
      status: claim.status,
    };

    if (action === "approve") {
      try {
        await db.transaction(async (tx) => {
          const [currentClaim] = await tx
            .select({ status: firmClaims.status })
            .from(firmClaims)
            .where(eq(firmClaims.id, id))
            .limit(1);

          if (!currentClaim || currentClaim.status !== "pending") {
            throw new ClaimNotApprovableError();
          }

          beforeData.status = currentClaim.status;

          const updatedClaims = await tx
            .update(firmClaims)
            .set({
              status: "verified",
              reviewedBy: session.user.id,
              reviewedAt: new Date(),
              adminNotes: adminNotes || claim.adminNotes,
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(firmClaims.id, id),
                eq(firmClaims.status, currentClaim.status)
              )
            )
            .returning({ id: firmClaims.id });

          if (updatedClaims.length === 0) {
            throw new ClaimNotApprovableError();
          }

          const updatedFirms = await tx
            .update(firms)
            .set({
              isClaimed: true,
              ownerId: claim.userId,
              claimedAt: new Date(),
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(firms.id, claim.firmId),
                eq(firms.isClaimed, false)
              )
            )
            .returning({ id: firms.id });

          if (updatedFirms.length === 0) {
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

      // Send notification
      await sendFirmClaimStatusNotification({
        firmName: firm.name,
        firmSlug: firm.slug,
        userEmail: claimUser.email,
        userName: claimUser.name || claimUser.email.split("@")[0],
        status: "verified",
      });

      // Create audit log
      await db.insert(auditLogs).values({
        userId: session.user.id,
        action: "firm_claim.approve",
        entityType: "firm_claim",
        entityId: id,
        beforeData,
        afterData: { status: "verified" },
        metadata: { adminNotes, firmId: firm.id },
      });

      return NextResponse.json({
        success: true,
        message: "Firm claim approved successfully",
      });
    }
    if (action === "reject") {
      if (!rejectionReason) {
        return NextResponse.json({ error: "Rejection reason required" }, { status: 400 });
      }

      // Update claim to rejected
      await db
        .update(firmClaims)
        .set({
          status: "rejected",
          rejectionReason,
          reviewedBy: session.user.id,
          reviewedAt: new Date(),
          adminNotes: adminNotes || claim.adminNotes,
          updatedAt: new Date(),
        })
        .where(eq(firmClaims.id, id));

      // Send notification
      await sendFirmClaimStatusNotification({
        firmName: firm.name,
        firmSlug: firm.slug,
        userEmail: claimUser.email,
        userName: claimUser.name || claimUser.email.split("@")[0],
        status: "rejected",
        reason: rejectionReason,
      });

      // Create audit log
      await db.insert(auditLogs).values({
        userId: session.user.id,
        action: "firm_claim.reject",
        entityType: "firm_claim",
        entityId: id,
        beforeData,
        afterData: { status: "rejected", rejectionReason },
        metadata: { adminNotes, firmId: firm.id },
      });

      return NextResponse.json({
        success: true,
        message: "Firm claim rejected",
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error updating firm claim:", error);
    return NextResponse.json({ error: "Failed to update claim" }, { status: 500 });
  }
}
