"use server";

import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { lawyers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function updateCaseAssociationOptOut(
  lawyerId: string,
  optOut: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    // Verify the user owns this lawyer profile
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return { success: false, error: "Not authenticated" };
    }

    const lawyer = await db.query.lawyers.findFirst({
      where: eq(lawyers.id, lawyerId),
    });

    if (!lawyer) {
      return { success: false, error: "Lawyer profile not found" };
    }

    if (lawyer.userId !== session.user.id) {
      return { success: false, error: "Not authorized to update this profile" };
    }

    // Update the opt-out setting
    await db
      .update(lawyers)
      .set({
        caseAssociationOptOut: optOut,
        optOutRequestedAt: optOut ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(lawyers.id, lawyerId));

    // Revalidate relevant pages
    revalidatePath("/dashboard/settings/case-associations");
    revalidatePath("/cases");

    return { success: true };
  } catch (error) {
    console.error("Failed to update case association opt-out:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
