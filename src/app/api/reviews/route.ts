import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { reviews, lawyers } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import {
  verifyInvoiceReceipt,
  moderateContent,
  analyzeReviewQuality,
  sendReviewSubmittedNotification,
  sendReviewPublishedNotification,
  sendAdminNotification,
} from "@/lib/integrations";

const reviewSchema = z.object({
  lawyerId: z.string().uuid("Invalid lawyer ID"),
  reviewerName: z.string().min(1, "Name is required").optional(),
  reviewerEmail: z.string().email("Invalid email address"),
  title: z.string().min(1, "Title is required"),
  content: z.string().min(10, "Review must be at least 10 characters"),
  overallRating: z.number().min(1).max(5),
  communicationRating: z.number().min(0).max(5).optional(),
  expertiseRating: z.number().min(0).max(5).optional(),
  responsivenessRating: z.number().min(0).max(5).optional(),
  valueRating: z.number().min(0).max(5).optional(),
  pros: z.string().optional(),
  cons: z.string().optional(),
  verificationDocument: z.string().optional(), // Supabase storage URL for invoice/receipt
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validationResult = reviewSchema.safeParse(body);
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
      where: eq(lawyers.id, data.lawyerId),
      columns: { id: true, name: true, slug: true, isActive: true },
    });

    if (!lawyer) {
      return NextResponse.json(
        { error: "Lawyer not found" },
        { status: 404 }
      );
    }

    // Content moderation check
    const fullContent = [data.title, data.content, data.pros, data.cons]
      .filter(Boolean)
      .join(" ");

    const moderationResult = await moderateContent(fullContent);
    if (moderationResult.flagged) {
      return NextResponse.json(
        {
          error: "Your review contains content that violates our community guidelines",
          flagged: true,
        },
        { status: 400 }
      );
    }

    // Analyze review quality
    const qualityResult = await analyzeReviewQuality({
      content: data.content,
      pros: data.pros,
      cons: data.cons,
      rating: data.overallRating,
    });

    // Verify invoice/receipt if provided
    let documentVerification = null;
    let verificationStatus: "pending" | "approved" | "flagged_for_review" = "pending";
    let isAutoPublished = false;

    if (data.verificationDocument) {
      documentVerification = await verifyInvoiceReceipt(
        data.verificationDocument,
        lawyer.name
      );

      // Per spec: 90%+ confidence for auto-publish
      if (documentVerification.confidence >= 90 && documentVerification.isValid) {
        verificationStatus = "approved";
        isAutoPublished = true;
      } else if (documentVerification.confidence >= 70) {
        verificationStatus = "flagged_for_review";
      } else {
        verificationStatus = "pending";
      }
    }

    // If quality analysis flags issues, send to review
    if (!qualityResult.isGenuine || qualityResult.issues.length > 0) {
      verificationStatus = "flagged_for_review";
      isAutoPublished = false;
    }

    // Create review
    const [review] = await db
      .insert(reviews)
      .values({
        lawyerId: data.lawyerId,
        reviewerName: data.reviewerName || null,
        reviewerEmail: data.reviewerEmail,
        title: data.title,
        content: data.content,
        overallRating: data.overallRating,
        communicationRating: data.communicationRating || null,
        expertiseRating: data.expertiseRating || null,
        responsivenessRating: data.responsivenessRating || null,
        valueRating: data.valueRating || null,
        pros: data.pros || null,
        cons: data.cons || null,
        verificationDocument: data.verificationDocument || null,
        isVerified: isAutoPublished,
        verificationStatus,
        verificationNotes: documentVerification
          ? `AI confidence: ${documentVerification.confidence}%. ${documentVerification.issues.join("; ")}`
          : qualityResult.issues.length > 0
            ? `Quality issues: ${qualityResult.issues.join("; ")}`
            : null,
        verifiedAt: isAutoPublished ? new Date() : null,
        isPublished: isAutoPublished,
      })
      .returning();

    // If auto-published, update lawyer metrics
    if (isAutoPublished) {
      await db
        .update(lawyers)
        .set({
          reviewCount: sql`COALESCE(${lawyers.reviewCount}, 0) + 1`,
          updatedAt: new Date(),
        })
        .where(eq(lawyers.id, data.lawyerId));

      // Send published notification
      await sendReviewPublishedNotification({
        reviewerEmail: data.reviewerEmail,
        reviewerName: data.reviewerName || "",
        lawyerName: lawyer.name,
        lawyerSlug: lawyer.slug,
      });
    } else {
      // Send submission confirmation
      await sendReviewSubmittedNotification({
        reviewerEmail: data.reviewerEmail,
        reviewerName: data.reviewerName || "",
        lawyerName: lawyer.name,
        reviewId: review.id,
      });

      // Notify admin if needs review
      if (verificationStatus === "flagged_for_review" || verificationStatus === "pending") {
        await sendAdminNotification({
          type: "review",
          entityId: review.id,
          summary: `Review for ${lawyer.name} needs moderation. Status: ${verificationStatus}. ${documentVerification ? `Document confidence: ${documentVerification.confidence}%` : "No document uploaded"}.`,
        });
      }
    }

    return NextResponse.json({
      success: true,
      reviewId: review.id,
      isPublished: isAutoPublished,
      message: isAutoPublished
        ? "Review published successfully!"
        : "Review submitted successfully. It will be published after verification.",
      verificationResult: documentVerification
        ? {
            confidence: documentVerification.confidence,
            isValid: documentVerification.isValid,
          }
        : null,
    });
  } catch (error) {
    console.error("Error creating review:", error);
    return NextResponse.json(
      { error: "Failed to submit review" },
      { status: 500 }
    );
  }
}
