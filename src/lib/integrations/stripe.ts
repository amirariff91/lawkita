/**
 * Stripe Integration
 * Handles subscription management for lawyer profiles
 */

interface StripeError {
  type: string;
  message: string;
  code?: string;
}

const STRIPE_API_URL = "https://api.stripe.com/v1";

function getConfig() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  return { secretKey, publishableKey, webhookSecret };
}

async function stripeRequest<T>(
  endpoint: string,
  options: {
    method?: "GET" | "POST" | "DELETE";
    body?: Record<string, unknown>;
  } = {}
): Promise<{ success: boolean; data?: T; error?: string }> {
  const { secretKey } = getConfig();

  if (!secretKey) {
    console.warn("STRIPE_SECRET_KEY not configured");
    return { success: false, error: "Stripe not configured" };
  }

  try {
    const response = await fetch(`${STRIPE_API_URL}${endpoint}`, {
      method: options.method || "GET",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: options.body
        ? new URLSearchParams(
            Object.entries(options.body).reduce(
              (acc, [key, value]) => {
                if (value !== undefined && value !== null) {
                  acc[key] = String(value);
                }
                return acc;
              },
              {} as Record<string, string>
            )
          ).toString()
        : undefined,
    });

    if (!response.ok) {
      const error = (await response.json()) as { error: StripeError };
      console.error("Stripe API error:", error);
      return { success: false, error: error.error?.message || "Stripe request failed" };
    }

    const data = (await response.json()) as T;
    return { success: true, data };
  } catch (error) {
    console.error("Stripe request failed:", error);
    return { success: false, error: "Failed to communicate with Stripe" };
  }
}

// ============================================================================
// Subscription Plans
// ============================================================================

export const SUBSCRIPTION_PLANS = {
  free: {
    name: "Free",
    price: 0,
    priceId: null,
    features: ["Basic profile", "Receive enquiries", "Public listing"],
  },
  premium: {
    name: "Premium",
    monthlyPrice: 299, // RM per spec
    annualPrice: 2990, // RM (2 months free)
    monthlyPriceId: process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID,
    annualPriceId: process.env.STRIPE_PREMIUM_ANNUAL_PRICE_ID,
    features: [
      "Featured badge",
      "Enquiry analytics",
      "Response templates",
      "Verified badge",
      "CRM features",
      "Priority in search",
    ],
  },
  featured: {
    name: "Featured",
    monthlyPrice: 1499, // RM per spec
    annualPrice: 14990, // RM (2 months free)
    monthlyPriceId: process.env.STRIPE_FEATURED_MONTHLY_PRICE_ID,
    annualPriceId: process.env.STRIPE_FEATURED_ANNUAL_PRICE_ID,
    features: [
      "All Premium features",
      "Video intro",
      "Testimonials carousel",
      "Case portfolio",
      "Priority support",
      "Homepage spotlight",
    ],
  },
  firm_premium: {
    name: "Firm Premium",
    monthlyPrice: 499, // RM
    annualPrice: 4990, // RM (2 months free)
    monthlyPriceId: process.env.STRIPE_FIRM_MONTHLY_PRICE_ID,
    annualPriceId: process.env.STRIPE_FIRM_ANNUAL_PRICE_ID,
    features: [
      "Featured placement in directory",
      "Firm logo displayed",
      "Analytics dashboard",
      "Priority in search results",
      "Priority support",
    ],
  },
} as const;

// ============================================================================
// Customer Management
// ============================================================================

interface StripeCustomer {
  id: string;
  email: string;
  name: string;
  metadata: Record<string, string>;
}

export async function createCustomer(params: {
  email: string;
  name: string;
  lawyerId: string;
}): Promise<{ success: boolean; customerId?: string; error?: string }> {
  const result = await stripeRequest<StripeCustomer>("/customers", {
    method: "POST",
    body: {
      email: params.email,
      name: params.name,
      "metadata[lawyerId]": params.lawyerId,
      "metadata[source]": "lawkita",
    },
  });

  if (result.success && result.data) {
    return { success: true, customerId: result.data.id };
  }

  return { success: false, error: result.error };
}

export async function getCustomer(
  customerId: string
): Promise<{ success: boolean; customer?: StripeCustomer; error?: string }> {
  const result = await stripeRequest<StripeCustomer>(`/customers/${customerId}`);

  if (result.success && result.data) {
    return { success: true, customer: result.data };
  }

  return { success: false, error: result.error };
}

// ============================================================================
// Checkout Sessions
// ============================================================================

interface CheckoutSession {
  id: string;
  url: string;
  payment_status: string;
  subscription: string;
  customer: string;
}

export async function createCheckoutSession(params: {
  customerId?: string;
  customerEmail?: string;
  priceId: string;
  lawyerId: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<{ success: boolean; url?: string; sessionId?: string; error?: string }> {
  const body: Record<string, unknown> = {
    mode: "subscription",
    "line_items[0][price]": params.priceId,
    "line_items[0][quantity]": 1,
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    "metadata[lawyerId]": params.lawyerId,
    allow_promotion_codes: true,
  };

  if (params.customerId) {
    body.customer = params.customerId;
  } else if (params.customerEmail) {
    body.customer_email = params.customerEmail;
  }

  const result = await stripeRequest<CheckoutSession>("/checkout/sessions", {
    method: "POST",
    body,
  });

  if (result.success && result.data) {
    return {
      success: true,
      url: result.data.url,
      sessionId: result.data.id,
    };
  }

  return { success: false, error: result.error };
}

export async function getCheckoutSession(
  sessionId: string
): Promise<{ success: boolean; session?: CheckoutSession; error?: string }> {
  const result = await stripeRequest<CheckoutSession>(`/checkout/sessions/${sessionId}`);

  if (result.success && result.data) {
    return { success: true, session: result.data };
  }

  return { success: false, error: result.error };
}

// ============================================================================
// Subscriptions
// ============================================================================

interface StripeSubscription {
  id: string;
  customer: string;
  status: "active" | "past_due" | "canceled" | "unpaid" | "trialing";
  current_period_start: number;
  current_period_end: number;
  cancel_at_period_end: boolean;
  canceled_at: number | null;
  items: {
    data: Array<{
      price: {
        id: string;
        product: string;
      };
    }>;
  };
  metadata: Record<string, string>;
}

export async function getSubscription(
  subscriptionId: string
): Promise<{ success: boolean; subscription?: StripeSubscription; error?: string }> {
  const result = await stripeRequest<StripeSubscription>(`/subscriptions/${subscriptionId}`);

  if (result.success && result.data) {
    return { success: true, subscription: result.data };
  }

  return { success: false, error: result.error };
}

export async function cancelSubscription(
  subscriptionId: string,
  immediately: boolean = false
): Promise<{ success: boolean; error?: string }> {
  if (immediately) {
    const result = await stripeRequest<StripeSubscription>(`/subscriptions/${subscriptionId}`, {
      method: "DELETE",
    });
    return { success: result.success, error: result.error };
  }

  // Cancel at period end (grace period)
  const result = await stripeRequest<StripeSubscription>(`/subscriptions/${subscriptionId}`, {
    method: "POST",
    body: {
      cancel_at_period_end: true,
    },
  });

  return { success: result.success, error: result.error };
}

export async function reactivateSubscription(
  subscriptionId: string
): Promise<{ success: boolean; error?: string }> {
  const result = await stripeRequest<StripeSubscription>(`/subscriptions/${subscriptionId}`, {
    method: "POST",
    body: {
      cancel_at_period_end: false,
    },
  });

  return { success: result.success, error: result.error };
}

export async function updateSubscription(
  subscriptionId: string,
  newPriceId: string
): Promise<{ success: boolean; error?: string }> {
  // First get the subscription to find the item ID
  const subResult = await getSubscription(subscriptionId);
  if (!subResult.success || !subResult.subscription) {
    return { success: false, error: subResult.error };
  }

  const itemId = subResult.subscription.items.data[0]?.price?.id;
  if (!itemId) {
    return { success: false, error: "No subscription item found" };
  }

  const result = await stripeRequest<StripeSubscription>(`/subscriptions/${subscriptionId}`, {
    method: "POST",
    body: {
      "items[0][id]": subResult.subscription.items.data[0]?.price?.id,
      "items[0][price]": newPriceId,
      proration_behavior: "create_prorations",
    },
  });

  return { success: result.success, error: result.error };
}

// ============================================================================
// Billing Portal
// ============================================================================

interface BillingPortalSession {
  id: string;
  url: string;
}

export async function createBillingPortalSession(params: {
  customerId: string;
  returnUrl: string;
}): Promise<{ success: boolean; url?: string; error?: string }> {
  const result = await stripeRequest<BillingPortalSession>("/billing_portal/sessions", {
    method: "POST",
    body: {
      customer: params.customerId,
      return_url: params.returnUrl,
    },
  });

  if (result.success && result.data) {
    return { success: true, url: result.data.url };
  }

  return { success: false, error: result.error };
}

// ============================================================================
// Webhook Handling
// ============================================================================

import { createHmac, timingSafeEqual } from "crypto";

export function verifyWebhookSignature(
  payload: string,
  signature: string
): boolean {
  const { webhookSecret } = getConfig();

  if (!webhookSecret) {
    console.warn("STRIPE_WEBHOOK_SECRET not configured");
    return false;
  }

  const parts = signature.split(",");
  let timestamp = "";
  let v1Signature = "";

  for (const part of parts) {
    const [key, value] = part.split("=");
    if (key === "t") timestamp = value;
    if (key === "v1") v1Signature = value;
  }

  if (!timestamp || !v1Signature) {
    return false;
  }

  // Check timestamp is within 5 minutes
  const eventTime = parseInt(timestamp) * 1000;
  const now = Date.now();
  if (Math.abs(now - eventTime) > 5 * 60 * 1000) {
    return false;
  }

  // Verify signature
  const signedPayload = `${timestamp}.${payload}`;
  const expectedSignature = createHmac("sha256", webhookSecret)
    .update(signedPayload)
    .digest("hex");

  try {
    return timingSafeEqual(Buffer.from(v1Signature), Buffer.from(expectedSignature));
  } catch {
    return false;
  }
}

export interface StripeWebhookEvent {
  id: string;
  type: string;
  data: {
    object: Record<string, unknown>;
  };
}

export function parseWebhookEvent(payload: string): StripeWebhookEvent | null {
  try {
    return JSON.parse(payload) as StripeWebhookEvent;
  } catch {
    return null;
  }
}

export function isStripeConfigured(): boolean {
  const { secretKey } = getConfig();
  return Boolean(secretKey);
}

// ============================================================================
// Subscription Tier Mapping
// ============================================================================

export function getTierFromPriceId(priceId: string): "free" | "premium" | "featured" | "firm_premium" {
  const premiumPrices = [
    process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID,
    process.env.STRIPE_PREMIUM_ANNUAL_PRICE_ID,
  ];

  const featuredPrices = [
    process.env.STRIPE_FEATURED_MONTHLY_PRICE_ID,
    process.env.STRIPE_FEATURED_ANNUAL_PRICE_ID,
  ];

  const firmPremiumPrices = [
    process.env.STRIPE_FIRM_MONTHLY_PRICE_ID,
    process.env.STRIPE_FIRM_ANNUAL_PRICE_ID,
  ];

  if (featuredPrices.includes(priceId)) {
    return "featured";
  }

  if (premiumPrices.includes(priceId)) {
    return "premium";
  }

  if (firmPremiumPrices.includes(priceId)) {
    return "firm_premium";
  }

  return "free";
}
