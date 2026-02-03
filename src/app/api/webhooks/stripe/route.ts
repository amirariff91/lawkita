import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { lawyers, firms, subscriptions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  verifyWebhookSignature,
  parseWebhookEvent,
  getTierFromPriceId,
  getSubscription,
} from "@/lib/integrations/stripe";

export async function POST(request: NextRequest) {
  try {
    const payload = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }

    // Verify webhook signature
    if (!verifyWebhookSignature(payload, signature)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const event = parseWebhookEvent(payload);
    if (!event) {
      return NextResponse.json({ error: "Invalid event" }, { status: 400 });
    }

    console.log(`[Stripe Webhook] Processing ${event.type}`);

    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object);
        break;

      case "customer.subscription.created":
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object);
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object);
        break;

      case "invoice.payment_succeeded":
        await handlePaymentSucceeded(event.data.object);
        break;

      case "invoice.payment_failed":
        await handlePaymentFailed(event.data.object);
        break;

      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[Stripe Webhook] Error:", error);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}

async function handleCheckoutCompleted(session: Record<string, unknown>) {
  const lawyerId = (session.metadata as Record<string, string>)?.lawyerId;
  const customerId = session.customer as string;
  const subscriptionId = session.subscription as string;

  if (!lawyerId || !subscriptionId) {
    console.error("[Stripe Webhook] Missing lawyerId or subscriptionId in checkout");
    return;
  }

  // Get subscription details
  const subResult = await getSubscription(subscriptionId);
  if (!subResult.success || !subResult.subscription) {
    console.error("[Stripe Webhook] Failed to get subscription details");
    return;
  }

  const sub = subResult.subscription;
  const priceId = sub.items.data[0]?.price?.id;
  const tier = priceId ? getTierFromPriceId(priceId) : "premium";

  // Determine if this is a firm or lawyer subscription
  const isFirmSubscription = tier === "firm_premium";

  if (isFirmSubscription) {
    // Handle firm subscription - entityId is the firm ID
    const firmId = lawyerId; // We're using lawyerId field to store firmId for firm subscriptions

    const existingSubscription = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.firmId, firmId),
    });

    if (existingSubscription) {
      await db
        .update(subscriptions)
        .set({
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscriptionId,
          stripePriceId: priceId,
          tier,
          status: "active",
          currentPeriodStart: new Date(sub.current_period_start * 1000),
          currentPeriodEnd: new Date(sub.current_period_end * 1000),
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.id, existingSubscription.id));
    } else {
      await db.insert(subscriptions).values({
        firmId,
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId,
        stripePriceId: priceId,
        tier,
        billingPeriod: "monthly",
        status: "active",
        currentPeriodStart: new Date(sub.current_period_start * 1000),
        currentPeriodEnd: new Date(sub.current_period_end * 1000),
      });
    }

    // Update firm profile
    await db
      .update(firms)
      .set({
        subscriptionTier: "firm_premium",
        subscriptionExpiresAt: new Date(sub.current_period_end * 1000),
        updatedAt: new Date(),
      })
      .where(eq(firms.id, firmId));

    console.log(`[Stripe Webhook] Subscription activated for firm ${firmId}`);
  } else {
    // Handle lawyer subscription
    const existingSubscription = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.lawyerId, lawyerId),
    });

    if (existingSubscription) {
      await db
        .update(subscriptions)
        .set({
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscriptionId,
          stripePriceId: priceId,
          tier,
          status: "active",
          currentPeriodStart: new Date(sub.current_period_start * 1000),
          currentPeriodEnd: new Date(sub.current_period_end * 1000),
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.id, existingSubscription.id));
    } else {
      await db.insert(subscriptions).values({
        lawyerId,
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId,
        stripePriceId: priceId,
        tier,
        billingPeriod: "monthly",
        status: "active",
        currentPeriodStart: new Date(sub.current_period_start * 1000),
        currentPeriodEnd: new Date(sub.current_period_end * 1000),
      });
    }

    // Update lawyer profile - only for lawyer tiers
    const lawyerTier = tier as "free" | "premium" | "featured";
    await db
      .update(lawyers)
      .set({
        subscriptionTier: lawyerTier,
        subscriptionExpiresAt: new Date(sub.current_period_end * 1000),
        updatedAt: new Date(),
      })
      .where(eq(lawyers.id, lawyerId));

    console.log(`[Stripe Webhook] Subscription activated for lawyer ${lawyerId}`);
  }
}

async function handleSubscriptionUpdated(subscription: Record<string, unknown>) {
  const subscriptionId = subscription.id as string;
  const status = subscription.status as string;
  const cancelAtPeriodEnd = subscription.cancel_at_period_end as boolean;
  const currentPeriodEnd = subscription.current_period_end as number;
  const priceId = (
    (subscription.items as { data: Array<{ price: { id: string } }> })?.data?.[0]?.price?.id
  );

  // Find subscription by Stripe ID
  const existingSubscription = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.stripeSubscriptionId, subscriptionId),
  });

  if (!existingSubscription) {
    console.error(`[Stripe Webhook] Subscription ${subscriptionId} not found`);
    return;
  }

  const tier = priceId ? getTierFromPriceId(priceId) : existingSubscription.tier;

  // Map Stripe status to our status
  let dbStatus: "active" | "past_due" | "canceled" | "expired" | "grace_period" = "active";
  if (status === "past_due") {
    dbStatus = "past_due";
  } else if (status === "canceled" || status === "unpaid") {
    dbStatus = "canceled";
  } else if (cancelAtPeriodEnd) {
    dbStatus = "grace_period";
  }

  await db
    .update(subscriptions)
    .set({
      tier,
      stripePriceId: priceId,
      status: dbStatus,
      currentPeriodEnd: new Date(currentPeriodEnd * 1000),
      canceledAt: cancelAtPeriodEnd ? new Date() : null,
      graceEndsAt: cancelAtPeriodEnd ? new Date(currentPeriodEnd * 1000) : null,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.id, existingSubscription.id));

  // Update profile based on subscription type
  if (existingSubscription.firmId && tier === "firm_premium") {
    // Update firm profile
    await db
      .update(firms)
      .set({
        subscriptionTier: "firm_premium",
        subscriptionExpiresAt: new Date(currentPeriodEnd * 1000),
        updatedAt: new Date(),
      })
      .where(eq(firms.id, existingSubscription.firmId));
  } else if (existingSubscription.lawyerId && tier !== "firm_premium") {
    // Update lawyer profile - only for valid lawyer tiers
    const lawyerTier = tier as "free" | "premium" | "featured";
    await db
      .update(lawyers)
      .set({
        subscriptionTier: lawyerTier,
        subscriptionExpiresAt: new Date(currentPeriodEnd * 1000),
        updatedAt: new Date(),
      })
      .where(eq(lawyers.id, existingSubscription.lawyerId));
  }

  console.log(`[Stripe Webhook] Subscription ${subscriptionId} updated to ${status}`);
}

async function handleSubscriptionDeleted(subscription: Record<string, unknown>) {
  const subscriptionId = subscription.id as string;

  // Find subscription by Stripe ID
  const existingSubscription = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.stripeSubscriptionId, subscriptionId),
  });

  if (!existingSubscription) {
    console.error(`[Stripe Webhook] Subscription ${subscriptionId} not found`);
    return;
  }

  await db
    .update(subscriptions)
    .set({
      status: "canceled",
      canceledAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.id, existingSubscription.id));

  // Downgrade to free tier
  if (existingSubscription.firmId) {
    await db
      .update(firms)
      .set({
        subscriptionTier: "free",
        subscriptionExpiresAt: null,
        updatedAt: new Date(),
      })
      .where(eq(firms.id, existingSubscription.firmId));
  } else if (existingSubscription.lawyerId) {
    await db
      .update(lawyers)
      .set({
        subscriptionTier: "free",
        subscriptionExpiresAt: null,
        updatedAt: new Date(),
      })
      .where(eq(lawyers.id, existingSubscription.lawyerId));
  }

  console.log(`[Stripe Webhook] Subscription ${subscriptionId} deleted`);
}

async function handlePaymentSucceeded(invoice: Record<string, unknown>) {
  const subscriptionId = invoice.subscription as string;
  if (!subscriptionId) return;

  // Find subscription
  const existingSubscription = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.stripeSubscriptionId, subscriptionId),
  });

  if (existingSubscription && existingSubscription.status === "past_due") {
    await db
      .update(subscriptions)
      .set({
        status: "active",
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.id, existingSubscription.id));

    console.log(`[Stripe Webhook] Payment succeeded for subscription ${subscriptionId}`);
  }
}

async function handlePaymentFailed(invoice: Record<string, unknown>) {
  const subscriptionId = invoice.subscription as string;
  if (!subscriptionId) return;

  // Find subscription
  const existingSubscription = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.stripeSubscriptionId, subscriptionId),
  });

  if (existingSubscription) {
    await db
      .update(subscriptions)
      .set({
        status: "past_due",
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.id, existingSubscription.id));

    console.log(`[Stripe Webhook] Payment failed for subscription ${subscriptionId}`);
  }
}
