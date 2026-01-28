import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { enquiries, lawyers, messages } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { sendEnquiryNotification, sendEnquiryWhatsApp } from "@/lib/integrations";

const enquirySchema = z.object({
  senderName: z.string().min(1, "Name is required"),
  senderEmail: z.string().email("Invalid email address"),
  senderPhone: z.string().optional(),
  caseType: z.string().min(1, "Case type is required"),
  urgency: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  // New fields per spec
  budgetRange: z.enum(["under_5k", "5k_to_20k", "above_20k", "not_specified"]).optional(),
  timeline: z.enum(["court_date_soon", "ready_to_hire", "just_researching", "not_specified"]).optional(),
  isFirstLawyer: z.boolean().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: lawyerId } = await params;
    const body = await request.json();

    // Validate input
    const validationResult = enquirySchema.safeParse(body);
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
      columns: {
        id: true,
        name: true,
        email: true,
        phone: true,
        isActive: true,
        isClaimed: true,
        subscriptionTier: true,
      },
    });

    if (!lawyer) {
      return NextResponse.json(
        { error: "Lawyer not found" },
        { status: 404 }
      );
    }

    if (!lawyer.isActive) {
      return NextResponse.json(
        { error: "This lawyer is not currently accepting enquiries" },
        { status: 400 }
      );
    }

    // Per spec: Don't store enquiries for unclaimed profiles
    // Show alternatives instead
    if (!lawyer.isClaimed) {
      return NextResponse.json(
        {
          error: "This lawyer hasn't claimed their profile yet",
          suggestion: "Consider contacting one of our verified lawyers instead",
          showAlternatives: true,
        },
        { status: 400 }
      );
    }

    // Create enquiry
    const [enquiry] = await db
      .insert(enquiries)
      .values({
        lawyerId,
        senderName: data.senderName,
        senderEmail: data.senderEmail,
        senderPhone: data.senderPhone || null,
        caseType: data.caseType,
        urgency: data.urgency,
        description: data.description,
        budgetRange: data.budgetRange || "not_specified",
        timeline: data.timeline || "not_specified",
        isFirstLawyer: data.isFirstLawyer ?? null,
        status: "pending",
      })
      .returning();

    // Create initial message from the enquiry
    await db.insert(messages).values({
      enquiryId: enquiry.id,
      senderId: null,
      senderType: "visitor",
      content: data.description,
    });

    // Send email notification to lawyer
    if (lawyer.email) {
      await sendEnquiryNotification(lawyer.email, {
        lawyerName: lawyer.name,
        senderName: data.senderName,
        senderEmail: data.senderEmail,
        senderPhone: data.senderPhone,
        caseType: data.caseType,
        urgency: data.urgency,
        description: data.description,
        enquiryId: enquiry.id,
      });
    }

    // For premium/featured lawyers, also send WhatsApp notification
    if (
      lawyer.phone &&
      (lawyer.subscriptionTier === "premium" || lawyer.subscriptionTier === "featured")
    ) {
      await sendEnquiryWhatsApp(lawyer.phone, {
        lawyerName: lawyer.name,
        senderName: data.senderName,
        caseType: data.caseType,
        urgency: data.urgency,
      });
    }

    return NextResponse.json({
      success: true,
      enquiryId: enquiry.id,
      message: "Enquiry submitted successfully",
    });
  } catch (error) {
    console.error("Error creating enquiry:", error);
    return NextResponse.json(
      { error: "Failed to submit enquiry" },
      { status: 500 }
    );
  }
}
