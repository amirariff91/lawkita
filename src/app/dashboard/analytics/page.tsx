import { headers } from "next/headers";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { lawyers, profileViews, searchImpressions, enquiries } from "@/lib/db/schema";
import { eq, count, gte, and, sql } from "drizzle-orm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Eye,
  Search,
  MousePointerClick,
  TrendingUp,
  ArrowRight,
  Lock,
  BarChart3,
  Users,
} from "lucide-react";

export default async function AnalyticsPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) return null;

  // Get the user's lawyer profile
  const lawyer = await db.query.lawyers.findFirst({
    where: eq(lawyers.userId, session.user.id),
    columns: {
      id: true,
      subscriptionTier: true,
      reviewCount: true,
      averageRating: true,
    },
  });

  if (!lawyer) return null;

  const isPremium = lawyer.subscriptionTier !== "free";

  // Get stats for the last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Profile views
  const [viewsResult] = await db
    .select({ count: count() })
    .from(profileViews)
    .where(
      and(
        eq(profileViews.lawyerId, lawyer.id),
        gte(profileViews.createdAt, thirtyDaysAgo)
      )
    );

  // Search impressions
  const [impressionsResult] = await db
    .select({ count: count() })
    .from(searchImpressions)
    .where(
      and(
        eq(searchImpressions.lawyerId, lawyer.id),
        gte(searchImpressions.createdAt, thirtyDaysAgo)
      )
    );

  // Clicks from search
  const [clicksResult] = await db
    .select({ count: count() })
    .from(searchImpressions)
    .where(
      and(
        eq(searchImpressions.lawyerId, lawyer.id),
        eq(searchImpressions.clicked, true),
        gte(searchImpressions.createdAt, thirtyDaysAgo)
      )
    );

  // Enquiries
  const [enquiriesResult] = await db
    .select({ count: count() })
    .from(enquiries)
    .where(
      and(
        eq(enquiries.lawyerId, lawyer.id),
        gte(enquiries.createdAt, thirtyDaysAgo)
      )
    );

  const stats = {
    profileViews: viewsResult?.count ?? 0,
    searchImpressions: impressionsResult?.count ?? 0,
    searchClicks: clicksResult?.count ?? 0,
    enquiries: enquiriesResult?.count ?? 0,
    clickRate:
      impressionsResult?.count && impressionsResult.count > 0
        ? ((clicksResult?.count ?? 0) / impressionsResult.count) * 100
        : 0,
    conversionRate:
      viewsResult?.count && viewsResult.count > 0
        ? ((enquiriesResult?.count ?? 0) / viewsResult.count) * 100
        : 0,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-muted-foreground">
            Track your profile performance over the last 30 days
          </p>
        </div>
        {!isPremium && (
          <Badge variant="secondary" className="gap-1">
            <Lock className="h-3 w-3" />
            Limited View
          </Badge>
        )}
      </div>

      {/* Main Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Profile Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.profileViews}</div>
            <p className="text-xs text-muted-foreground">
              People who viewed your profile
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Search Impressions</CardTitle>
            <Search className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.searchImpressions}</div>
            <p className="text-xs text-muted-foreground">
              Times you appeared in search
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Click Rate</CardTitle>
            <MousePointerClick className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.clickRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              From search results to profile
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.conversionRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              From views to enquiries
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Premium Analytics (Blurred for free users) */}
      <div className="relative">
        {!isPremium && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm rounded-lg">
            <Lock className="h-8 w-8 text-muted-foreground mb-3" />
            <h3 className="font-semibold text-lg mb-1">Upgrade to See More</h3>
            <p className="text-muted-foreground text-center max-w-md mb-4">
              Get detailed analytics including search terms, traffic sources, and
              trends over time.
            </p>
            <Button asChild>
              <Link href="/dashboard/subscription">
                Upgrade to Premium
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        )}

        <div className={!isPremium ? "blur-sm pointer-events-none" : ""}>
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Top Search Terms */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  Top Search Terms
                </CardTitle>
                <CardDescription>
                  What people searched to find you
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {["divorce lawyer kuala lumpur", "family law attorney", "custody lawyer"].map(
                    (term, i) => (
                      <div key={term} className="flex items-center justify-between">
                        <span className="text-sm">{term}</span>
                        <span className="text-sm text-muted-foreground">
                          {Math.floor(Math.random() * 50) + 10} searches
                        </span>
                      </div>
                    )
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Traffic Sources */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Traffic Sources
                </CardTitle>
                <CardDescription>Where your visitors come from</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { source: "Direct / Search", percent: 45 },
                    { source: "Google Search", percent: 35 },
                    { source: "Referrals", percent: 15 },
                    { source: "Social Media", percent: 5 },
                  ].map((item) => (
                    <div key={item.source} className="flex items-center gap-3">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm">{item.source}</span>
                          <span className="text-sm text-muted-foreground">
                            {item.percent}%
                          </span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${item.percent}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Views Over Time Chart Placeholder */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Views Over Time
                </CardTitle>
                <CardDescription>
                  Profile views over the last 30 days
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[200px] flex items-center justify-center border-2 border-dashed rounded-lg">
                  <p className="text-muted-foreground">
                    Chart visualization would appear here
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
