"use client";

import { useState } from "react";
import Link from "next/link";
import { PageHeader, PricingCard } from "@/components/static";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, Star, Video, BarChart3, MessageSquare, Shield, Crown } from "lucide-react";

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
    cta: "Get Started",
    ctaHref: "/auth/signup",
    popular: false,
  },
  {
    id: "premium",
    name: "Premium",
    price: "RM299",
    period: "/month",
    annualPrice: "RM2,990/year",
    description: "Enhanced visibility and client management",
    features: [
      { text: "Everything in Free", included: true },
      { text: "Featured badge", included: true, icon: Star },
      { text: "Enquiry analytics", included: true, icon: BarChart3 },
      { text: "Response templates", included: true, icon: MessageSquare },
      { text: "Verified badge", included: true, icon: Shield },
      { text: "Priority in search", included: true },
    ],
    cta: "Start Premium",
    ctaHref: "/auth/signup?plan=premium",
    popular: true,
  },
  {
    id: "featured",
    name: "Featured",
    price: "RM1,499",
    period: "/month",
    annualPrice: "RM14,990/year",
    description: "Maximum visibility and premium features",
    features: [
      { text: "Everything in Premium", included: true },
      { text: "Video intro", included: true, icon: Video },
      { text: "Testimonials carousel", included: true },
      { text: "Case portfolio", included: true },
      { text: "Priority support", included: true },
      { text: "Homepage spotlight", included: true, icon: Crown },
    ],
    cta: "Go Featured",
    ctaHref: "/auth/signup?plan=featured",
    popular: false,
  },
];

const featureComparison = [
  { feature: "Profile listing", free: true, premium: true, featured: true },
  { feature: "Receive enquiries", free: true, premium: true, featured: true },
  { feature: "Basic profile customization", free: true, premium: true, featured: true },
  { feature: "Verified badge", free: false, premium: true, featured: true },
  { feature: "Featured badge", free: false, premium: true, featured: true },
  { feature: "Priority search ranking", free: false, premium: true, featured: true },
  { feature: "Enquiry analytics", free: false, premium: true, featured: true },
  { feature: "Response templates", free: false, premium: true, featured: true },
  { feature: "Profile video intro", free: false, premium: false, featured: true },
  { feature: "Testimonials carousel", free: false, premium: false, featured: true },
  { feature: "Case portfolio", free: false, premium: false, featured: true },
  { feature: "Homepage spotlight", free: false, premium: false, featured: true },
  { feature: "Priority support", free: false, premium: false, featured: true },
];

export default function PricingPage() {
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">("monthly");

  return (
    <div>
      <PageHeader
        title="Simple, Transparent Pricing"
        description="Choose the plan that's right for your practice"
        centered
      />

      <div className="container mx-auto px-4 py-12">
        {/* Billing Period Toggle */}
        <div className="flex justify-center mb-12">
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
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto mb-16">
          {plans.map((plan) => (
            <PricingCard
              key={plan.id}
              name={plan.name}
              price={plan.price}
              period={plan.period}
              annualPrice={plan.annualPrice}
              description={plan.description}
              features={plan.features}
              cta={plan.cta}
              ctaHref={plan.ctaHref}
              popular={plan.popular}
              billingPeriod={billingPeriod}
            />
          ))}
        </div>

        {/* Feature Comparison Table */}
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">Feature Comparison</h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-4 px-4 font-medium">Feature</th>
                  <th className="text-center py-4 px-4 font-medium">Free</th>
                  <th className="text-center py-4 px-4 font-medium">Premium</th>
                  <th className="text-center py-4 px-4 font-medium">Featured</th>
                </tr>
              </thead>
              <tbody>
                {featureComparison.map((row) => (
                  <tr key={row.feature} className="border-b">
                    <td className="py-4 px-4 text-sm">{row.feature}</td>
                    <td className="py-4 px-4 text-center">
                      {row.free ? (
                        <CheckCircle className="h-5 w-5 text-green-600 mx-auto" />
                      ) : (
                        <div className="h-5 w-5 rounded-full border-2 border-gray-300 mx-auto" />
                      )}
                    </td>
                    <td className="py-4 px-4 text-center">
                      {row.premium ? (
                        <CheckCircle className="h-5 w-5 text-green-600 mx-auto" />
                      ) : (
                        <div className="h-5 w-5 rounded-full border-2 border-gray-300 mx-auto" />
                      )}
                    </td>
                    <td className="py-4 px-4 text-center">
                      {row.featured ? (
                        <CheckCircle className="h-5 w-5 text-green-600 mx-auto" />
                      ) : (
                        <div className="h-5 w-5 rounded-full border-2 border-gray-300 mx-auto" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-16 text-center">
          <h2 className="text-2xl font-bold mb-4">Ready to grow your practice?</h2>
          <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
            Join thousands of Malaysian lawyers who use LawKita to connect with potential clients.
            Start with our free plan and upgrade anytime.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg">
              <Link href="/lawyers">Find Your Profile</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/contact">Contact Sales</Link>
            </Button>
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-16 max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">Frequently Asked Questions</h2>
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold mb-2">Can I switch plans anytime?</h3>
              <p className="text-muted-foreground text-sm">
                Yes, you can upgrade or downgrade your plan at any time. Changes take effect at the
                start of your next billing cycle.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Do I need to claim my profile first?</h3>
              <p className="text-muted-foreground text-sm">
                Yes, you need to claim and verify your lawyer profile before subscribing to a paid
                plan. This ensures only verified lawyers can access premium features.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">What payment methods do you accept?</h3>
              <p className="text-muted-foreground text-sm">
                We accept all major credit and debit cards through our secure payment processor,
                Stripe. We also support FPX for Malaysian bank transfers.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Is there a refund policy?</h3>
              <p className="text-muted-foreground text-sm">
                We offer a 14-day money-back guarantee for new subscribers. If you're not satisfied,
                contact our support team within 14 days of your first payment for a full refund.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
