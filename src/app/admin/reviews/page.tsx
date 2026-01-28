import { db } from "@/lib/db";
import { reviews } from "@/lib/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Star,
  Clock,
  FileText,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from "lucide-react";

interface PageProps {
  searchParams: Promise<{ status?: string; page?: string }>;
}

const statusConfig = {
  pending: { label: "Pending", color: "bg-yellow-100 text-yellow-800", icon: Clock },
  approved: { label: "Approved", color: "bg-green-100 text-green-800", icon: CheckCircle },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-800", icon: XCircle },
  flagged_for_review: { label: "Flagged", color: "bg-orange-100 text-orange-800", icon: AlertTriangle },
};

async function getReviews(status?: string, page = 1) {
  const limit = 20;
  const offset = (page - 1) * limit;

  const whereCondition = status ? eq(reviews.verificationStatus, status as keyof typeof statusConfig) : undefined;

  const [reviewsList, countResult] = await Promise.all([
    db.query.reviews.findMany({
      where: whereCondition,
      orderBy: [desc(reviews.createdAt)],
      limit,
      offset,
      with: {
        lawyer: {
          columns: { name: true, slug: true },
        },
      },
    }),
    db
      .select({ count: sql<number>`count(*)` })
      .from(reviews)
      .where(whereCondition),
  ]);

  return {
    reviews: reviewsList,
    total: Number(countResult[0]?.count) || 0,
    page,
    totalPages: Math.ceil((Number(countResult[0]?.count) || 0) / limit),
  };
}

async function getStatusCounts() {
  const results = await db
    .select({
      status: reviews.verificationStatus,
      count: sql<number>`count(*)`,
    })
    .from(reviews)
    .groupBy(reviews.verificationStatus);

  return results.reduce(
    (acc, row) => {
      acc[row.status] = Number(row.count);
      return acc;
    },
    {} as Record<string, number>
  );
}

export default async function AdminReviewsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const status = params.status;
  const page = parseInt(params.page || "1");

  const [{ reviews: reviewsList, total, totalPages }, statusCounts] = await Promise.all([
    getReviews(status, page),
    getStatusCounts(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Review Moderation</h1>
        <p className="text-muted-foreground">
          Approve, reject, or flag reviews for further investigation
        </p>
      </div>

      {/* Status Filters */}
      <div className="flex flex-wrap gap-2">
        <Link href="/admin/reviews">
          <Button variant={!status ? "default" : "outline"} size="sm">
            All ({Object.values(statusCounts).reduce((a, b) => a + b, 0)})
          </Button>
        </Link>
        {Object.entries(statusConfig).map(([key, config]) => (
          <Link key={key} href={`/admin/reviews?status=${key}`}>
            <Button variant={status === key ? "default" : "outline"} size="sm">
              <config.icon className="h-4 w-4 mr-1" />
              {config.label} ({statusCounts[key] || 0})
            </Button>
          </Link>
        ))}
      </div>

      {/* Reviews Table */}
      <div className="rounded-lg border bg-background">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left text-sm font-medium">Review</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Lawyer</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Rating</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Document</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Date</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {reviewsList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    No reviews found
                  </td>
                </tr>
              ) : (
                reviewsList.map((review) => {
                  const config = statusConfig[review.verificationStatus as keyof typeof statusConfig];
                  return (
                    <tr key={review.id} className="hover:bg-muted/50">
                      <td className="px-4 py-3">
                        <div className="max-w-xs">
                          <p className="font-medium truncate">{review.title}</p>
                          <p className="text-sm text-muted-foreground truncate">
                            {review.content?.slice(0, 60)}...
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/lawyers/${review.lawyer?.slug}`}
                          className="text-primary hover:underline"
                        >
                          {review.lawyer?.name || "Unknown"}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          {review.overallRating}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={config?.color}>
                          {config?.label || review.verificationStatus}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {review.verificationDocument ? (
                          <FileText className="h-4 w-4 text-green-600" />
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {new Date(review.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/admin/reviews/${review.id}`}>
                          <Button variant="outline" size="sm">
                            Review
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="border-t px-4 py-3 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, total)} of {total} reviews
            </p>
            <div className="flex gap-2">
              {page > 1 && (
                <Link href={`/admin/reviews?${status ? `status=${status}&` : ""}page=${page - 1}`}>
                  <Button variant="outline" size="sm">
                    Previous
                  </Button>
                </Link>
              )}
              {page < totalPages && (
                <Link href={`/admin/reviews?${status ? `status=${status}&` : ""}page=${page + 1}`}>
                  <Button variant="outline" size="sm">
                    Next
                  </Button>
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
