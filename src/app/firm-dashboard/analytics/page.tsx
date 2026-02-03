import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getUserFirm } from "@/lib/db/queries/firms";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { BarChart3, TrendingUp, Users, Eye, Crown, Lock } from "lucide-react";

export default async function FirmAnalyticsPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/auth/signin?callbackUrl=/firm-dashboard/analytics");
  }

  const firm = await getUserFirm(session.user.id);

  if (!firm) {
    redirect("/firms");
  }

  const isPremium = firm.subscriptionTier === "firm_premium";

  // Placeholder stats (in production, fetch from analytics)
  const stats = {
    profileViews: 0,
    searchImpressions: 0,
    clickThroughRate: 0,
    averagePosition: 0,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Firm Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Track your firm's visibility and performance
          </p>
        </div>
        {!isPremium && (
          <Badge variant="outline" className="text-amber-600 border-amber-600">
            <Lock className="h-3 w-3 mr-1" />
            Premium Feature
          </Badge>
        )}
      </div>

      {isPremium ? (
        <>
          {/* Stats Cards */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                    <Eye className="size-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.profileViews}</p>
                    <p className="text-sm text-muted-foreground">Profile Views</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                    <TrendingUp className="size-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.searchImpressions}</p>
                    <p className="text-sm text-muted-foreground">Search Impressions</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                    <BarChart3 className="size-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.clickThroughRate}%</p>
                    <p className="text-sm text-muted-foreground">Click-through Rate</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                    <Users className="size-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{firm.lawyerCount}</p>
                    <p className="text-sm text-muted-foreground">Lawyers</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Coming Soon Notice */}
          <Card>
            <CardContent className="py-12 text-center">
              <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Detailed Analytics Coming Soon</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                We're building comprehensive analytics to help you understand your firm's
                performance. Check back soon for detailed insights, charts, and reports.
              </p>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="p-4 rounded-full bg-amber-100 dark:bg-amber-900/30 w-fit mx-auto mb-4">
              <Crown className="h-8 w-8 text-amber-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Upgrade to Premium</h3>
            <p className="text-muted-foreground max-w-md mx-auto mb-6">
              Get access to detailed analytics including profile views, search impressions,
              click-through rates, and more to understand how potential clients find your firm.
            </p>
            <Button asChild>
              <Link href="/firm-dashboard/subscription">
                Upgrade Now
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* What's Tracked */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">What We Track</CardTitle>
          <CardDescription>
            Understanding the metrics available to premium firms
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium mb-1">Profile Views</h4>
              <p className="text-muted-foreground">
                Number of times your firm profile has been viewed
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-1">Search Impressions</h4>
              <p className="text-muted-foreground">
                Times your firm appeared in search results
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-1">Click-through Rate</h4>
              <p className="text-muted-foreground">
                Percentage of impressions that resulted in clicks
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-1">Lawyer Performance</h4>
              <p className="text-muted-foreground">
                Aggregate stats for lawyers at your firm
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
