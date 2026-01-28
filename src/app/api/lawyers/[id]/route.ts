import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { lawyers, lawyerPracticeAreas } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";

const updateLawyerSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  bio: z.string().optional(),
  firmName: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  practiceAreaIds: z.array(z.string().uuid()).optional(),
});

export async function PATCH(
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
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Validate input
    const validationResult = updateLawyerSchema.safeParse(body);
    if (!validationResult.success) {
      const firstIssue = validationResult.error.issues[0];
      return NextResponse.json(
        { error: firstIssue?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Check if user owns this lawyer profile
    const lawyer = await db.query.lawyers.findFirst({
      where: eq(lawyers.id, lawyerId),
      columns: { id: true, userId: true },
    });

    if (!lawyer) {
      return NextResponse.json(
        { error: "Lawyer not found" },
        { status: 404 }
      );
    }

    if (lawyer.userId !== session.user.id) {
      return NextResponse.json(
        { error: "You can only edit your own profile" },
        { status: 403 }
      );
    }

    // Update lawyer profile
    const { practiceAreaIds, ...lawyerData } = data;

    await db
      .update(lawyers)
      .set({
        ...lawyerData,
        email: lawyerData.email || null,
        updatedAt: new Date(),
      })
      .where(eq(lawyers.id, lawyerId));

    // Update practice areas if provided
    if (practiceAreaIds) {
      // Delete existing practice areas
      await db
        .delete(lawyerPracticeAreas)
        .where(eq(lawyerPracticeAreas.lawyerId, lawyerId));

      // Insert new practice areas
      if (practiceAreaIds.length > 0) {
        await db.insert(lawyerPracticeAreas).values(
          practiceAreaIds.map((practiceAreaId) => ({
            lawyerId,
            practiceAreaId,
          }))
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully",
    });
  } catch (error) {
    console.error("Error updating lawyer:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: lawyerId } = await params;

    const lawyer = await db.query.lawyers.findFirst({
      where: eq(lawyers.id, lawyerId),
      with: {
        practiceAreas: {
          with: {
            practiceArea: true,
          },
        },
      },
    });

    if (!lawyer) {
      return NextResponse.json(
        { error: "Lawyer not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(lawyer);
  } catch (error) {
    console.error("Error fetching lawyer:", error);
    return NextResponse.json(
      { error: "Failed to fetch lawyer" },
      { status: 500 }
    );
  }
}
