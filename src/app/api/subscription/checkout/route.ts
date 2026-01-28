import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { lawyers, subscriptions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import {
  createCheckoutSession,
  createCustomer,
  SUBSCRIPTION_PLANS,
} from "@/lib/integrations/stripe";

const checkoutSchema = z.object({
  plan: z.enum(["premium", "featured"]),
  billingPeriod: z.enum(["monthly", "annual"]),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validationResult = checkoutSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const { plan, billingPeriod } = validationResult.data;

    // Get the user's lawyer profile
    const lawyer = await db.query.lawyers.findFirst({
      where: eq(lawyers.userId, session.user.id),
    });

    if (!lawyer) {
      return NextResponse.json(
        { error: "No lawyer profile found. Please claim a profile first." },
        { status: 400 }
      );
    }

    // Get the price ID based on plan and billing period
    const planConfig = SUBSCRIPTION_PLANS[plan];
    const priceId =
      billingPeriod === "annual" ? planConfig.annualPriceId : planConfig.monthlyPriceId;

    if (!priceId) {
      return NextResponse.json(
        { error: "Subscription plan not configured" },
        { status: 500 }
      );
    }

    // Check for existing subscription
    const existingSubscription = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.lawyerId, lawyer.id),
    });

    let customerId = existingSubscription?.stripeCustomerId;

    // Create customer if needed
    if (!customerId && lawyer.email) {
      const customerResult = await createCustomer({
        email: lawyer.email,
        name: lawyer.name,
        lawyerId: lawyer.id,
      });

      if (customerResult.success && customerResult.customerId) {
        customerId = customerResult.customerId;
      }
    }

    // Create checkout session
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const checkoutResult = await createCheckoutSession({
      customerId: customerId || undefined,
      customerEmail: !customerId && lawyer.email ? lawyer.email : undefined,
      priceId,
      lawyerId: lawyer.id,
      successUrl: `${appUrl}/dashboard/subscription?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${appUrl}/dashboard/subscription?canceled=true`,
    });

    if (!checkoutResult.success || !checkoutResult.url) {
      return NextResponse.json(
        { error: checkoutResult.error || "Failed to create checkout session" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      url: checkoutResult.url,
    });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
