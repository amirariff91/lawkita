"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  Crown,
  Zap,
  Star,
  Video,
  BarChart3,
  MessageSquare,
  Shield,
  Clock,
  ExternalLink,
} from "lucide-react";

interface SubscriptionData {
  tier: "free" | "premium" | "featured";
  status?: "active" | "past_due" | "canceled" | "expired" | "grace_period";
  currentPeriodEnd?: string;
  cancelAtPeriodEnd?: boolean;
}

const plans = [
  {
    id: "free",
    name: "Free",
    price: "RM0",
    period: "",
    description: "Basic listing and enquiry management",
    features: [
      { text: "Basic profile", included: true },
      { text: "Receive enquiries", included: true },
      { text: "Public listing", included: true },
      { text: "Featured badge", included: false },
      { text: "Analytics dashboard", included: false },
      { text: "Video intro", included: false },
    ],
    cta: "Current Plan",
    popular: false,
  },
  {
    id: "premium",
    name: "Premium",
    price: "RM299",
    period: "/month",
    annualPrice: "RM2,990/year (Save RM598)",
    description: "Enhanced visibility and client management",
    features: [
      { text: "Everything in Free", included: true },
      { text: "Featured badge", included: true, icon: Star },
      { text: "Enquiry analytics", included: true, icon: BarChart3 },
      { text: "Response templates", included: true, icon: MessageSquare },
      { text: "Verified badge", included: true, icon: Shield },
      { text: "Priority in search", included: true },
    ],
    cta: "Upgrade to Premium",
    popular: true,
  },
  {
    id: "featured",
    name: "Featured",
    price: "RM1,499",
    period: "/month",
    annualPrice: "RM14,990/year (Save RM2,998)",
    description: "Maximum visibility and premium features",
    features: [
      { text: "Everything in Premium", included: true },
      { text: "Video intro", included: true, icon: Video },
      { text: "Testimonials carousel", included: true },
      { text: "Case portfolio", included: true },
      { text: "Priority support", included: true },
      { text: "Homepage spotlight", included: true, icon: Crown },
    ],
    cta: "Upgrade to Featured",
    popular: false,
  },
];

export default function SubscriptionPage() {
  const searchParams = useSearchParams();
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">("monthly");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    fetchSubscription();

    // Check for success/cancel from checkout
    if (searchParams.get("success") === "true") {
      setSuccessMessage("Subscription activated successfully!");
      // Refresh subscription data
      setTimeout(() => {
        fetchSubscription();
        setSuccessMessage("");
      }, 3000);
    }
  }, [searchParams]);

  async function fetchSubscription() {
    try {
      const response = await fetch("/api/subscription");
      if (response.ok) {
        const data = await response.json();
        setSubscription(data.subscription);
      }
    } catch (error) {
      console.error("Failed to fetch subscription:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpgrade(planId: string) {
    if (planId === "free") return;

    setProcessing(true);
    try {
      const response = await fetch("/api/subscription/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planId, billingPeriod }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.url) {
          window.location.href = data.url;
        }
      } else {
        const data = await response.json();
        alert(data.error || "Failed to start checkout");
      }
    } catch (error) {
      console.error("Checkout error:", error);
      alert("Failed to start checkout");
    } finally {
      setProcessing(false);
    }
  }

  async function handleManageBilling() {
    setProcessing(true);
    try {
      const response = await fetch("/api/subscription/portal", {
        method: "POST",
      });

      if (response.ok) {
        const data = await response.json();
        if (data.url) {
          window.location.href = data.url;
        }
      } else {
        const data = await response.json();
        alert(data.error || "Failed to open billing portal");
      }
    } catch (error) {
      console.error("Portal error:", error);
      alert("Failed to open billing portal");
    } finally {
      setProcessing(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const currentTier = subscription?.tier || "free";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Subscription</h1>
        <p className="text-muted-foreground">
          Manage your subscription and billing
        </p>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 flex items-center gap-3">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <p className="text-green-800">{successMessage}</p>
        </div>
      )}

      {/* Current Subscription */}
      <div className="rounded-lg border bg-background p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold">Current Plan</h2>
              {currentTier === "featured" && (
                <Badge className="bg-yellow-100 text-yellow-800">
                  <Crown className="h-3 w-3 mr-1" />
                  Featured
                </Badge>
              )}
              {currentTier === "premium" && (
                <Badge className="bg-purple-100 text-purple-800">
                  <Zap className="h-3 w-3 mr-1" />
                  Premium
                </Badge>
              )}
              {currentTier === "free" && (
                <Badge className="bg-gray-100 text-gray-800">Free</Badge>
              )}
            </div>
            {subscription?.status && subscription.status !== "active" && (
              <Badge
                className={
                  subscription.status === "past_due"
                    ? "bg-red-100 text-red-800 mt-2"
                    : subscription.status === "grace_period"
                      ? "bg-orange-100 text-orange-800 mt-2"
                      : "bg-gray-100 text-gray-800 mt-2"
                }
              >
                {subscription.status.replace("_", " ")}
              </Badge>
            )}
            {subscription?.currentPeriodEnd && (
              <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {subscription.cancelAtPeriodEnd
                  ? `Cancels on ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}`
                  : `Renews on ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}`}
              </p>
            )}
          </div>
          {currentTier !== "free" && (
            <Button onClick={handleManageBilling} disabled={processing} variant="outline">
              <ExternalLink className="h-4 w-4 mr-2" />
              Manage Billing
            </Button>
          )}
        </div>
      </div>

      {/* Billing Period Toggle */}
      <div className="flex justify-center">
        <div className="inline-flex items-center gap-2 rounded-lg border bg-background p-1">
          <button
            onClick={() => setBillingPeriod("monthly")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              billingPeriod === "monthly"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingPeriod("annual")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              billingPeriod === "annual"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Annual
            <Badge className="ml-2 bg-green-100 text-green-800">Save 17%</Badge>
          </button>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="grid md:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const isCurrentPlan = plan.id === currentTier;
          const isDowngrade =
            (plan.id === "free" && currentTier !== "free") ||
            (plan.id === "premium" && currentTier === "featured");

          return (
            <div
              key={plan.id}
              className={`rounded-lg border bg-background p-6 relative ${
                plan.popular ? "border-primary ring-2 ring-primary ring-offset-2" : ""
              } ${isCurrentPlan ? "border-green-500 bg-green-50/50" : ""}`}
            >
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary">
                  Most Popular
                </Badge>
              )}
              {isCurrentPlan && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-600">
                  Current Plan
                </Badge>
              )}

              <div className="text-center mb-6">
                <h3 className="text-xl font-semibold">{plan.name}</h3>
                <div className="mt-2">
                  <span className="text-3xl font-bold">
                    {billingPeriod === "annual" && plan.id !== "free"
                      ? plan.annualPrice?.split("/")[0]
                      : plan.price}
                  </span>
                  <span className="text-muted-foreground">
                    {billingPeriod === "annual" && plan.id !== "free" ? "/year" : plan.period}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">{plan.description}</p>
              </div>

              <ul className="space-y-3 mb-6">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-2">
                    {feature.included ? (
                      <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
                    ) : (
                      <div className="h-4 w-4 rounded-full border-2 border-gray-300 shrink-0" />
                    )}
                    <span
                      className={feature.included ? "" : "text-muted-foreground line-through"}
                    >
                      {feature.text}
                    </span>
                  </li>
                ))}
              </ul>

              <Button
                onClick={() => handleUpgrade(plan.id)}
                disabled={processing || isCurrentPlan || isDowngrade}
                className="w-full"
                variant={plan.popular && !isCurrentPlan ? "default" : "outline"}
              >
                {isCurrentPlan
                  ? "Current Plan"
                  : isDowngrade
                    ? "Contact Support"
                    : plan.cta}
              </Button>
            </div>
          );
        })}
      </div>

      {/* FAQ or Support */}
      <div className="text-center text-sm text-muted-foreground">
        <p>
          Questions about billing?{" "}
          <a href="mailto:support@lawkita.my" className="text-primary hover:underline">
            Contact support
          </a>
        </p>
      </div>
    </div>
  );
}
