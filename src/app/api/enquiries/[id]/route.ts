import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { enquiries, lawyers, messages } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";

// GET: Fetch enquiry details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the user's lawyer profile
    const lawyer = await db.query.lawyers.findFirst({
      where: eq(lawyers.userId, session.user.id),
      columns: { id: true, subscriptionTier: true },
    });

    if (!lawyer) {
      return NextResponse.json({ error: "No lawyer profile found" }, { status: 403 });
    }

    // Get the enquiry
    const enquiry = await db.query.enquiries.findFirst({
      where: and(eq(enquiries.id, id), eq(enquiries.lawyerId, lawyer.id)),
    });

    if (!enquiry) {
      return NextResponse.json({ error: "Enquiry not found" }, { status: 404 });
    }

    // Get messages for this enquiry
    const enquiryMessages = await db.query.messages.findMany({
      where: eq(messages.enquiryId, id),
      orderBy: (messages, { asc }) => [asc(messages.createdAt)],
    });

    // Check if premium for full details
    const isPremium = lawyer.subscriptionTier !== "free";

    return NextResponse.json({
      enquiry: {
        id: enquiry.id,
        status: enquiry.status,
        caseType: enquiry.caseType,
        urgency: enquiry.urgency,
        description: enquiry.description,
        budgetRange: enquiry.budgetRange,
        timeline: enquiry.timeline,
        isFirstLawyer: enquiry.isFirstLawyer,
        createdAt: enquiry.createdAt,
        viewedAt: enquiry.viewedAt,
        firstResponseAt: enquiry.firstResponseAt,
        responseTimeHours: enquiry.responseTimeHours,
        // Only show contact info for premium users
        ...(isPremium
          ? {
              senderName: enquiry.senderName,
              senderEmail: enquiry.senderEmail,
              senderPhone: enquiry.senderPhone,
            }
          : {}),
      },
      messages: isPremium ? enquiryMessages : [],
      isPremium,
    });
  } catch (error) {
    console.error("Error fetching enquiry:", error);
    return NextResponse.json({ error: "Failed to fetch enquiry" }, { status: 500 });
  }
}

const updateSchema = z.object({
  action: z.enum(["mark_viewed", "respond", "close"]),
  message: z.string().optional(),
});

// PATCH: Update enquiry (mark viewed, respond, close)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validationResult = updateSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const { action, message } = validationResult.data;

    // Get the user's lawyer profile
    const lawyer = await db.query.lawyers.findFirst({
      where: eq(lawyers.userId, session.user.id),
      columns: { id: true, subscriptionTier: true },
    });

    if (!lawyer) {
      return NextResponse.json({ error: "No lawyer profile found" }, { status: 403 });
    }

    // Require premium for responding
    if (action === "respond" && lawyer.subscriptionTier === "free") {
      return NextResponse.json(
        { error: "Upgrade to Premium to respond to enquiries" },
        { status: 403 }
      );
    }

    // Get the enquiry
    const enquiry = await db.query.enquiries.findFirst({
      where: and(eq(enquiries.id, id), eq(enquiries.lawyerId, lawyer.id)),
    });

    if (!enquiry) {
      return NextResponse.json({ error: "Enquiry not found" }, { status: 404 });
    }

    const now = new Date();

    switch (action) {
      case "mark_viewed":
        if (enquiry.status === "pending") {
          await db
            .update(enquiries)
            .set({
              status: "viewed",
              viewedAt: now,
              updatedAt: now,
            })
            .where(eq(enquiries.id, id));
        }
        break;

      case "respond":
        if (!message?.trim()) {
          return NextResponse.json({ error: "Message is required" }, { status: 400 });
        }

        // Create message
        await db.insert(messages).values({
          enquiryId: id,
          senderId: lawyer.id,
          senderType: "lawyer",
          content: message,
        });

        // Update enquiry status
        const updateData: Record<string, unknown> = {
          status: "responded",
          updatedAt: now,
        };

        // Calculate response time if this is the first response
        if (!enquiry.firstResponseAt) {
          updateData.firstResponseAt = now;
          const responseTimeMs = now.getTime() - new Date(enquiry.createdAt).getTime();
          updateData.responseTimeHours = (responseTimeMs / (1000 * 60 * 60)).toFixed(2);
        }

        if (!enquiry.viewedAt) {
          updateData.viewedAt = now;
        }

        await db.update(enquiries).set(updateData).where(eq(enquiries.id, id));
        break;

      case "close":
        await db
          .update(enquiries)
          .set({
            status: "closed",
            updatedAt: now,
          })
          .where(eq(enquiries.id, id));
        break;
    }

    return NextResponse.json({
      success: true,
      message: `Enquiry ${action === "mark_viewed" ? "marked as viewed" : action === "respond" ? "responded" : "closed"}`,
    });
  } catch (error) {
    console.error("Error updating enquiry:", error);
    return NextResponse.json({ error: "Failed to update enquiry" }, { status: 500 });
  }
}
