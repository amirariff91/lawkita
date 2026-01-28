import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { lawyers, subscriptions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { createBillingPortalSession } from "@/lib/integrations/stripe";

export async function POST(request: NextRequest) {
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
    });

    if (!lawyer) {
      return NextResponse.json(
        { error: "No lawyer profile found" },
        { status: 400 }
      );
    }

    // Get subscription with Stripe customer ID
    const subscription = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.lawyerId, lawyer.id),
    });

    if (!subscription?.stripeCustomerId) {
      return NextResponse.json(
        { error: "No subscription found" },
        { status: 400 }
      );
    }

    // Create billing portal session
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const portalResult = await createBillingPortalSession({
      customerId: subscription.stripeCustomerId,
      returnUrl: `${appUrl}/dashboard/subscription`,
    });

    if (!portalResult.success || !portalResult.url) {
      return NextResponse.json(
        { error: portalResult.error || "Failed to create portal session" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      url: portalResult.url,
    });
  } catch (error) {
    console.error("Portal error:", error);
    return NextResponse.json(
      { error: "Failed to create portal session" },
      { status: 500 }
    );
  }
}
