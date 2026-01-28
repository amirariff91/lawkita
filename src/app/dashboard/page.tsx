import { headers } from "next/headers";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { lawyers, enquiries, profileViews, reviews } from "@/lib/db/schema";
import { eq, count, gte, and, sql } from "drizzle-orm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Eye,
  MessageSquare,
  Star,
  Clock,
  TrendingUp,
  ArrowRight,
  BadgeCheck,
  AlertCircle,
} from "lucide-react";

export default async function DashboardPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) return null;

  // Get the user's lawyer profile with stats
  const lawyer = await db.query.lawyers.findFirst({
    where: eq(lawyers.userId, session.user.id),
    columns: {
      id: true,
      name: true,
      slug: true,
      isVerified: true,
      isClaimed: true,
      subscriptionTier: true,
      reviewCount: true,
      averageRating: true,
      responseRate: true,
      avgResponseTimeHours: true,
    },
  });

  if (!lawyer) return null;

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

  // Pending enquiries
  const [pendingEnquiriesResult] = await db
    .select({ count: count() })
    .from(enquiries)
    .where(
      and(
        eq(enquiries.lawyerId, lawyer.id),
        eq(enquiries.status, "pending")
      )
    );

  // Pending reviews
  const [pendingReviewsResult] = await db
    .select({ count: count() })
    .from(reviews)
    .where(
      and(
        eq(reviews.lawyerId, lawyer.id),
        eq(reviews.verificationStatus, "pending")
      )
    );

  const stats = {
    profileViews: viewsResult?.count ?? 0,
    enquiries: enquiriesResult?.count ?? 0,
    pendingEnquiries: pendingEnquiriesResult?.count ?? 0,
    pendingReviews: pendingReviewsResult?.count ?? 0,
  };

  const rating = lawyer.averageRating ? parseFloat(lawyer.averageRating) : null;
  const responseRate = lawyer.responseRate ? parseFloat(lawyer.responseRate) : null;

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Welcome back, {lawyer.name.split(" ")[0]}</h1>
          <p className="text-muted-foreground">
            Here's what's happening with your profile
          </p>
        </div>
        <div className="flex items-center gap-2">
          {lawyer.isVerified ? (
            <Badge className="gap-1">
              <BadgeCheck className="h-3 w-3" />
              Verified
            </Badge>
          ) : (
            <Badge variant="secondary" className="gap-1">
              <AlertCircle className="h-3 w-3" />
              Pending Verification
            </Badge>
          )}
          <Badge variant="outline" className="capitalize">
            {lawyer.subscriptionTier}
          </Badge>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Profile Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.profileViews}</div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Enquiries</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.enquiries}</div>
            <p className="text-xs text-muted-foreground">
              {stats.pendingEnquiries > 0 && (
                <span className="text-amber-600">{stats.pendingEnquiries} pending</span>
              )}
              {stats.pendingEnquiries === 0 && "Last 30 days"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Rating</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {rating !== null ? rating.toFixed(1) : "N/A"}
            </div>
            <p className="text-xs text-muted-foreground">
              {lawyer.reviewCount ?? 0} reviews
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Response Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {responseRate !== null ? `${responseRate.toFixed(0)}%` : "N/A"}
            </div>
            <p className="text-xs text-muted-foreground">
              {lawyer.avgResponseTimeHours
                ? `Avg ${parseFloat(lawyer.avgResponseTimeHours).toFixed(0)}h response`
                : "No data yet"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.pendingEnquiries > 0 && (
          <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <MessageSquare className="h-4 w-4" />
                Pending Enquiries
              </CardTitle>
              <CardDescription>
                You have {stats.pendingEnquiries} enquiries waiting for a response
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild size="sm">
                <Link href="/dashboard/enquiries">
                  View Enquiries
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Edit Your Profile</CardTitle>
            <CardDescription>
              Keep your information up to date to attract more clients
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/profile">
                Edit Profile
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">View Analytics</CardTitle>
            <CardDescription>
              See detailed stats about your profile performance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/analytics">
                View Analytics
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Subscription CTA for free users */}
      {lawyer.subscriptionTier === "free" && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Upgrade to Premium
            </CardTitle>
            <CardDescription>
              Get more visibility, detailed analytics, and priority support
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/dashboard/subscription">
                View Plans
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
