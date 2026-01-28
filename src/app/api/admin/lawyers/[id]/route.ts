import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { lawyers, user, auditLogs } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { z } from "zod";

async function isAdmin(userId: string): Promise<boolean> {
  const currentUser = await db.query.user.findFirst({
    where: eq(user.id, userId),
    columns: { role: true },
  });
  return currentUser?.role === "admin";
}

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  email: z.string().email().nullable().optional(),
  phone: z.string().nullable().optional(),
  bio: z.string().nullable().optional(),
  barMembershipNumber: z.string().nullable().optional(),
  barStatus: z.enum(["active", "inactive", "suspended", "deceased"]).nullable().optional(),
  state: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  firmName: z.string().nullable().optional(),
  isVerified: z.boolean().optional(),
  isClaimed: z.boolean().optional(),
  isActive: z.boolean().optional(),
  subscriptionTier: z.enum(["free", "premium", "featured"]).optional(),
  yearsAtBar: z.number().nullable().optional(),
});

// GET: Fetch lawyer details
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

    const lawyer = await db.query.lawyers.findFirst({
      where: eq(lawyers.id, id),
    });

    if (!lawyer) {
      return NextResponse.json({ error: "Lawyer not found" }, { status: 404 });
    }

    return NextResponse.json({ lawyer });
  } catch (error) {
    console.error("Error fetching lawyer:", error);
    return NextResponse.json({ error: "Failed to fetch lawyer" }, { status: 500 });
  }
}

// PATCH: Update lawyer
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
    const validationResult = updateSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Get current lawyer for audit
    const currentLawyer = await db.query.lawyers.findFirst({
      where: eq(lawyers.id, id),
    });

    if (!currentLawyer) {
      return NextResponse.json({ error: "Lawyer not found" }, { status: 404 });
    }

    // Update lawyer
    await db
      .update(lawyers)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(lawyers.id, id));

    // Create audit log
    await db.insert(auditLogs).values({
      userId: session.user.id,
      action: "lawyer.update",
      entityType: "lawyer",
      entityId: id,
      beforeData: currentLawyer,
      afterData: data,
    });

    return NextResponse.json({
      success: true,
      message: "Lawyer updated successfully",
    });
  } catch (error) {
    console.error("Error updating lawyer:", error);
    return NextResponse.json({ error: "Failed to update lawyer" }, { status: 500 });
  }
}

// DELETE: Delete lawyer
export async function DELETE(
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

    // Get current lawyer for audit
    const currentLawyer = await db.query.lawyers.findFirst({
      where: eq(lawyers.id, id),
    });

    if (!currentLawyer) {
      return NextResponse.json({ error: "Lawyer not found" }, { status: 404 });
    }

    // Delete lawyer (cascades to related records)
    await db.delete(lawyers).where(eq(lawyers.id, id));

    // Create audit log
    await db.insert(auditLogs).values({
      userId: session.user.id,
      action: "lawyer.delete",
      entityType: "lawyer",
      entityId: id,
      beforeData: currentLawyer,
      afterData: null,
    });

    return NextResponse.json({
      success: true,
      message: "Lawyer deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting lawyer:", error);
    return NextResponse.json({ error: "Failed to delete lawyer" }, { status: 500 });
  }
}
