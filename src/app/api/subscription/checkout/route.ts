import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { lawyers, firms, subscriptions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import {
  createCheckoutSession,
  createCustomer,
  SUBSCRIPTION_PLANS,
} from "@/lib/integrations/stripe";

const checkoutSchema = z.object({
  plan: z.enum(["premium", "featured", "firm_premium"]),
  billingPeriod: z.enum(["monthly", "annual"]),
  firmId: z.string().uuid().optional(), // Required for firm_premium
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

    const { plan, billingPeriod, firmId } = validationResult.data;

    // Handle firm subscription
    if (plan === "firm_premium") {
      if (!firmId) {
        return NextResponse.json(
          { error: "Firm ID is required for firm subscription" },
          { status: 400 }
        );
      }

      // Get the firm and verify ownership
      const firm = await db.query.firms.findFirst({
        where: eq(firms.id, firmId),
      });

      if (!firm) {
        return NextResponse.json(
          { error: "Firm not found" },
          { status: 404 }
        );
      }

      if (firm.ownerId !== session.user.id) {
        return NextResponse.json(
          { error: "Not authorized to manage this firm's subscription" },
          { status: 403 }
        );
      }

      // Get the price ID
      const planConfig = SUBSCRIPTION_PLANS.firm_premium;
      const priceId =
        billingPeriod === "annual" ? planConfig.annualPriceId : planConfig.monthlyPriceId;

      if (!priceId) {
        return NextResponse.json(
          { error: "Firm subscription plan not configured" },
          { status: 500 }
        );
      }

      // Check for existing subscription
      const existingSubscription = await db.query.subscriptions.findFirst({
        where: eq(subscriptions.firmId, firm.id),
      });

      let customerId = existingSubscription?.stripeCustomerId;

      // Create customer if needed
      if (!customerId && firm.email) {
        const customerResult = await createCustomer({
          email: firm.email,
          name: firm.name,
          lawyerId: firm.id, // Using firm ID in the metadata
        });

        if (customerResult.success && customerResult.customerId) {
          customerId = customerResult.customerId;
        }
      }

      const appUrl = process.env.NEXT_PUBLIC_APP_URL;
      if (!appUrl) {
        return NextResponse.json(
          { error: "Server configuration error" },
          { status: 500 }
        );
      }

      const checkoutResult = await createCheckoutSession({
        customerId: customerId || undefined,
        customerEmail: !customerId && firm.email ? firm.email : session.user.email,
        priceId,
        lawyerId: firm.id, // Using firm ID as the entity ID
        successUrl: `${appUrl}/firm-dashboard/subscription?success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${appUrl}/firm-dashboard/subscription?canceled=true`,
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
    }

    // Handle lawyer subscription (existing logic)
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
    const planConfig = SUBSCRIPTION_PLANS[plan as "premium" | "featured"];
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
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!appUrl) {
      console.error("NEXT_PUBLIC_APP_URL not configured");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

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
