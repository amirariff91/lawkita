import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getUserFirm } from "@/lib/db/queries/firms";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Building2, BarChart3, Users, Sparkles, ArrowRight } from "lucide-react";
import { FirmSubscriptionButtons } from "@/components/firms/firm-subscription-buttons";

export default async function FirmSubscriptionPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/auth/signin?callbackUrl=/firm-dashboard/subscription");
  }

  const firm = await getUserFirm(session.user.id);

  if (!firm) {
    redirect("/firms");
  }

  const isPremium = firm.subscriptionTier === "firm_premium";

  const premiumFeatures = [
    { icon: Building2, text: "Featured placement in directory" },
    { icon: Sparkles, text: "Firm logo displayed on profile" },
    { icon: BarChart3, text: "Analytics dashboard" },
    { icon: Users, text: "Priority in search results" },
    { icon: Crown, text: "Premium support" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Subscription</h1>
        <p className="text-muted-foreground mt-1">
          Manage your firm's subscription plan
        </p>
      </div>

      {/* Current Plan */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Current Plan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-lg ${isPremium ? "bg-amber-100 dark:bg-amber-900/30" : "bg-muted"}`}>
                {isPremium ? (
                  <Crown className="h-6 w-6 text-amber-600" />
                ) : (
                  <Building2 className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
              <div>
                <p className="font-semibold text-lg">
                  {isPremium ? "Firm Premium" : "Free Plan"}
                </p>
                {isPremium && firm.subscriptionExpiresAt && (
                  <p className="text-sm text-muted-foreground">
                    Renews on {firm.subscriptionExpiresAt.toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
            {isPremium && (
              <Badge className="bg-amber-500">Active</Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Upgrade Section */}
      {!isPremium && (
        <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-amber-600" />
              <CardTitle className="text-lg">Upgrade to Premium</CardTitle>
            </div>
            <CardDescription>
              Get more visibility and powerful tools for your firm
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid sm:grid-cols-2 gap-4">
              {premiumFeatures.map((feature, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="p-1.5 rounded bg-amber-100 dark:bg-amber-900/30">
                    <feature.icon className="h-4 w-4 text-amber-600" />
                  </div>
                  <span className="text-sm">{feature.text}</span>
                </div>
              ))}
            </div>

            <FirmSubscriptionButtons firmId={firm.id} />
          </CardContent>
        </Card>
      )}

      {/* Plan Comparison */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Plan Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 gap-6">
            {/* Free Plan */}
            <div className="border rounded-lg p-6">
              <h3 className="font-semibold text-lg mb-2">Free</h3>
              <p className="text-3xl font-bold mb-4">
                RM 0<span className="text-sm font-normal text-muted-foreground">/month</span>
              </p>
              <ul className="space-y-3">
                <li className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-green-600" />
                  Basic firm profile
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-green-600" />
                  Listed in directory
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-green-600" />
                  View associated lawyers
                </li>
              </ul>
            </div>

            {/* Premium Plan */}
            <div className="border-2 border-amber-500 rounded-lg p-6 relative">
              <Badge className="absolute -top-3 right-4 bg-amber-500">Recommended</Badge>
              <h3 className="font-semibold text-lg mb-2">Firm Premium</h3>
              <p className="text-3xl font-bold mb-1">
                RM 499<span className="text-sm font-normal text-muted-foreground">/month</span>
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                or RM 4,990/year (save 2 months)
              </p>
              <ul className="space-y-3">
                <li className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-green-600" />
                  Everything in Free
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-green-600" />
                  Featured placement
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-green-600" />
                  Firm logo on profile
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-green-600" />
                  Analytics dashboard
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-green-600" />
                  Priority search ranking
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-green-600" />
                  Priority support
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Billing Portal for Premium Users */}
      {isPremium && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Manage Billing</CardTitle>
            <CardDescription>
              Update payment method, view invoices, or cancel subscription
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action="/api/subscription/portal" method="POST">
              <input type="hidden" name="firmId" value={firm.id} />
              <input type="hidden" name="returnUrl" value="/firm-dashboard/subscription" />
              <Button type="submit">
                Manage Billing
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
