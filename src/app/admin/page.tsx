import { db } from "@/lib/db";
import { claims, reviews, lawyers, enquiries } from "@/lib/db/schema";
import { eq, sql, and, gte } from "drizzle-orm";
import Link from "next/link";
import {
  MessageSquareWarning,
  UserCheck,
  Users,
  TrendingUp,
  Clock,
  AlertCircle,
} from "lucide-react";

async function getStats() {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    pendingReviews,
    pendingClaims,
    totalLawyers,
    claimedLawyers,
    recentEnquiries,
    flaggedReviews,
  ] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)` })
      .from(reviews)
      .where(eq(reviews.verificationStatus, "pending")),
    db
      .select({ count: sql<number>`count(*)` })
      .from(claims)
      .where(eq(claims.status, "pending")),
    db.select({ count: sql<number>`count(*)` }).from(lawyers),
    db
      .select({ count: sql<number>`count(*)` })
      .from(lawyers)
      .where(eq(lawyers.isClaimed, true)),
    db
      .select({ count: sql<number>`count(*)` })
      .from(enquiries)
      .where(gte(enquiries.createdAt, thirtyDaysAgo)),
    db
      .select({ count: sql<number>`count(*)` })
      .from(reviews)
      .where(eq(reviews.verificationStatus, "flagged_for_review")),
  ]);

  return {
    pendingReviews: Number(pendingReviews[0]?.count) || 0,
    pendingClaims: Number(pendingClaims[0]?.count) || 0,
    totalLawyers: Number(totalLawyers[0]?.count) || 0,
    claimedLawyers: Number(claimedLawyers[0]?.count) || 0,
    recentEnquiries: Number(recentEnquiries[0]?.count) || 0,
    flaggedReviews: Number(flaggedReviews[0]?.count) || 0,
  };
}

async function getRecentActivity() {
  const [recentReviews, recentClaims] = await Promise.all([
    db.query.reviews.findMany({
      where: eq(reviews.verificationStatus, "pending"),
      orderBy: (r, { desc }) => [desc(r.createdAt)],
      limit: 5,
      with: {
        lawyer: {
          columns: { name: true, slug: true },
        },
      },
    }),
    db.query.claims.findMany({
      where: eq(claims.status, "pending"),
      orderBy: (c, { desc }) => [desc(c.createdAt)],
      limit: 5,
    }),
  ]);

  return { recentReviews, recentClaims };
}

export default async function AdminDashboard() {
  const stats = await getStats();
  const { recentReviews, recentClaims } = await getRecentActivity();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of LawKita moderation and content management
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Link
          href="/admin/reviews"
          className="rounded-lg border bg-background p-4 hover:border-primary transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-orange-100 p-2">
              <MessageSquareWarning className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.pendingReviews}</p>
              <p className="text-sm text-muted-foreground">Pending Reviews</p>
            </div>
          </div>
        </Link>

        <Link
          href="/admin/claims"
          className="rounded-lg border bg-background p-4 hover:border-primary transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-blue-100 p-2">
              <UserCheck className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.pendingClaims}</p>
              <p className="text-sm text-muted-foreground">Pending Claims</p>
            </div>
          </div>
        </Link>

        <div className="rounded-lg border bg-background p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-green-100 p-2">
              <Users className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {stats.claimedLawyers}/{stats.totalLawyers}
              </p>
              <p className="text-sm text-muted-foreground">Claimed Profiles</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-background p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-purple-100 p-2">
              <TrendingUp className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.recentEnquiries}</p>
              <p className="text-sm text-muted-foreground">Enquiries (30d)</p>
            </div>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {stats.flaggedReviews > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <div>
              <p className="font-medium text-red-900">
                {stats.flaggedReviews} reviews flagged for review
              </p>
              <p className="text-sm text-red-700">
                These reviews need manual moderation due to quality or verification concerns.
              </p>
            </div>
            <Link
              href="/admin/reviews?status=flagged_for_review"
              className="ml-auto text-sm font-medium text-red-600 hover:underline"
            >
              Review Now
            </Link>
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Reviews */}
        <div className="rounded-lg border bg-background">
          <div className="border-b px-4 py-3">
            <h2 className="font-semibold">Recent Reviews Pending</h2>
          </div>
          <div className="divide-y">
            {recentReviews.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                No pending reviews
              </div>
            ) : (
              recentReviews.map((review) => (
                <Link
                  key={review.id}
                  href={`/admin/reviews/${review.id}`}
                  className="flex items-center gap-3 p-4 hover:bg-muted/50"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{review.title}</p>
                    <p className="text-sm text-muted-foreground">
                      For {review.lawyer?.name || "Unknown"} • Rating: {review.overallRating}/5
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    {new Date(review.createdAt).toLocaleDateString()}
                  </div>
                </Link>
              ))
            )}
          </div>
          <div className="border-t px-4 py-3">
            <Link href="/admin/reviews" className="text-sm text-primary hover:underline">
              View all reviews →
            </Link>
          </div>
        </div>

        {/* Recent Claims */}
        <div className="rounded-lg border bg-background">
          <div className="border-b px-4 py-3">
            <h2 className="font-semibold">Recent Claims Pending</h2>
          </div>
          <div className="divide-y">
            {recentClaims.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                No pending claims
              </div>
            ) : (
              recentClaims.map((claim) => (
                <Link
                  key={claim.id}
                  href={`/admin/claims/${claim.id}`}
                  className="flex items-center gap-3 p-4 hover:bg-muted/50"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">Bar #{claim.barMembershipNumber}</p>
                    <p className="text-sm text-muted-foreground">
                      Method: {claim.verificationMethod}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    {new Date(claim.createdAt).toLocaleDateString()}
                  </div>
                </Link>
              ))
            )}
          </div>
          <div className="border-t px-4 py-3">
            <Link href="/admin/claims" className="text-sm text-primary hover:underline">
              View all claims →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
