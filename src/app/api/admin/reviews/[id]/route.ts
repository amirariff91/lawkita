import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { reviews, lawyers, user, auditLogs } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { sendReviewPublishedNotification } from "@/lib/integrations";

async function isAdmin(userId: string): Promise<boolean> {
  const currentUser = await db.query.user.findFirst({
    where: eq(user.id, userId),
    columns: { role: true },
  });
  return currentUser?.role === "admin";
}

// GET: Fetch review details
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

    const review = await db.query.reviews.findFirst({
      where: eq(reviews.id, id),
      with: {
        lawyer: {
          columns: { id: true, name: true, slug: true },
        },
      },
    });

    if (!review) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }

    return NextResponse.json({ review });
  } catch (error) {
    console.error("Error fetching review:", error);
    return NextResponse.json({ error: "Failed to fetch review" }, { status: 500 });
  }
}

// PATCH: Update review status (approve/reject/flag)
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
    const { action, adminNotes } = body;

    if (!["approve", "reject", "flag"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    // Get current review
    const review = await db.query.reviews.findFirst({
      where: eq(reviews.id, id),
      with: {
        lawyer: {
          columns: { id: true, name: true, slug: true },
        },
      },
    });

    if (!review) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }

    const beforeData = {
      verificationStatus: review.verificationStatus,
      isPublished: review.isPublished,
      isVerified: review.isVerified,
    };

    // Determine new status based on action
    let newStatus: "approved" | "rejected" | "flagged_for_review";
    let isPublished = false;
    let isVerified = false;

    switch (action) {
      case "approve":
        newStatus = "approved";
        isPublished = true;
        isVerified = true;
        break;
      case "reject":
        newStatus = "rejected";
        break;
      case "flag":
        newStatus = "flagged_for_review";
        break;
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    // Update review
    await db
      .update(reviews)
      .set({
        verificationStatus: newStatus,
        isPublished,
        isVerified,
        verificationNotes: adminNotes || review.verificationNotes,
        verifiedAt: action === "approve" ? new Date() : review.verifiedAt,
        updatedAt: new Date(),
      })
      .where(eq(reviews.id, id));

    // If approved, update lawyer review count
    if (action === "approve" && !review.isPublished) {
      await db
        .update(lawyers)
        .set({
          reviewCount: sql`COALESCE(${lawyers.reviewCount}, 0) + 1`,
          updatedAt: new Date(),
        })
        .where(eq(lawyers.id, review.lawyerId));

      // Send notification to reviewer
      await sendReviewPublishedNotification({
        reviewerEmail: review.reviewerEmail,
        reviewerName: review.reviewerName || "",
        lawyerName: review.lawyer?.name || "",
        lawyerSlug: review.lawyer?.slug || "",
      });
    }

    // If rejected and was previously published, decrement count
    if (action === "reject" && review.isPublished) {
      await db
        .update(lawyers)
        .set({
          reviewCount: sql`GREATEST(COALESCE(${lawyers.reviewCount}, 0) - 1, 0)`,
          updatedAt: new Date(),
        })
        .where(eq(lawyers.id, review.lawyerId));
    }

    // Create audit log
    await db.insert(auditLogs).values({
      userId: session.user.id,
      action: `review.${action}`,
      entityType: "review",
      entityId: id,
      beforeData,
      afterData: {
        verificationStatus: newStatus,
        isPublished,
        isVerified,
      },
      metadata: { adminNotes },
    });

    return NextResponse.json({
      success: true,
      message: `Review ${action}d successfully`,
    });
  } catch (error) {
    console.error("Error updating review:", error);
    return NextResponse.json({ error: "Failed to update review" }, { status: 500 });
  }
}
