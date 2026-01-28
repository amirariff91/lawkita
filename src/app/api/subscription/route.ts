import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { lawyers, subscriptions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the user's lawyer profile
    const lawyer = await db.query.lawyers.findFirst({
      where: eq(lawyers.userId, session.user.id),
      columns: {
        id: true,
        subscriptionTier: true,
        subscriptionExpiresAt: true,
      },
    });

    if (!lawyer) {
      return NextResponse.json({ subscription: null });
    }

    // Get detailed subscription info
    const subscription = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.lawyerId, lawyer.id),
    });

    if (!subscription) {
      return NextResponse.json({
        subscription: {
          tier: lawyer.subscriptionTier,
          status: "active",
        },
      });
    }

    return NextResponse.json({
      subscription: {
        tier: subscription.tier,
        status: subscription.status,
        billingPeriod: subscription.billingPeriod,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        cancelAtPeriodEnd: subscription.graceEndsAt ? true : false,
        canceledAt: subscription.canceledAt,
      },
    });
  } catch (error) {
    console.error("Subscription fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch subscription" },
      { status: 500 }
    );
  }
}
