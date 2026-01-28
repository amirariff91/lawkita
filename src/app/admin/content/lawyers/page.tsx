import { db } from "@/lib/db";
import { lawyers } from "@/lib/db/schema";
import { desc, sql, ilike, or } from "drizzle-orm";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CheckCircle,
  XCircle,
  Star,
  Users,
  Crown,
} from "lucide-react";

interface PageProps {
  searchParams: Promise<{ q?: string; page?: string }>;
}

async function getLawyers(query?: string, page = 1) {
  const limit = 20;
  const offset = (page - 1) * limit;

  const whereCondition = query
    ? or(
        ilike(lawyers.name, `%${query}%`),
        ilike(lawyers.email, `%${query}%`),
        ilike(lawyers.barMembershipNumber, `%${query}%`)
      )
    : undefined;

  const [lawyersList, countResult] = await Promise.all([
    db
      .select({
        id: lawyers.id,
        name: lawyers.name,
        slug: lawyers.slug,
        email: lawyers.email,
        barMembershipNumber: lawyers.barMembershipNumber,
        state: lawyers.state,
        city: lawyers.city,
        isVerified: lawyers.isVerified,
        isClaimed: lawyers.isClaimed,
        isActive: lawyers.isActive,
        subscriptionTier: lawyers.subscriptionTier,
        averageRating: lawyers.averageRating,
        reviewCount: lawyers.reviewCount,
        createdAt: lawyers.createdAt,
      })
      .from(lawyers)
      .where(whereCondition)
      .orderBy(desc(lawyers.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(lawyers)
      .where(whereCondition),
  ]);

  return {
    lawyers: lawyersList,
    total: Number(countResult[0]?.count) || 0,
    page,
    totalPages: Math.ceil((Number(countResult[0]?.count) || 0) / limit),
  };
}

async function getStats() {
  const results = await db
    .select({
      total: sql<number>`count(*)`,
      claimed: sql<number>`count(*) filter (where ${lawyers.isClaimed} = true)`,
      verified: sql<number>`count(*) filter (where ${lawyers.isVerified} = true)`,
      premium: sql<number>`count(*) filter (where ${lawyers.subscriptionTier} != 'free')`,
    })
    .from(lawyers);

  return {
    total: Number(results[0]?.total) || 0,
    claimed: Number(results[0]?.claimed) || 0,
    verified: Number(results[0]?.verified) || 0,
    premium: Number(results[0]?.premium) || 0,
  };
}

export default async function AdminLawyersPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const query = params.q;
  const page = parseInt(params.page || "1");

  const [{ lawyers: lawyersList, total, totalPages }, stats] = await Promise.all([
    getLawyers(query, page),
    getStats(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Lawyers Management</h1>
        <p className="text-muted-foreground">
          View and edit lawyer profiles
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-lg border bg-background p-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Total</span>
          </div>
          <p className="text-2xl font-bold mt-1">{stats.total}</p>
        </div>
        <div className="rounded-lg border bg-background p-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span className="text-sm text-muted-foreground">Claimed</span>
          </div>
          <p className="text-2xl font-bold mt-1">{stats.claimed}</p>
        </div>
        <div className="rounded-lg border bg-background p-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-blue-600" />
            <span className="text-sm text-muted-foreground">Verified</span>
          </div>
          <p className="text-2xl font-bold mt-1">{stats.verified}</p>
        </div>
        <div className="rounded-lg border bg-background p-4">
          <div className="flex items-center gap-2">
            <Crown className="h-4 w-4 text-yellow-600" />
            <span className="text-sm text-muted-foreground">Premium</span>
          </div>
          <p className="text-2xl font-bold mt-1">{stats.premium}</p>
        </div>
      </div>

      {/* Search */}
      <form className="flex gap-2">
        <Input
          name="q"
          defaultValue={query}
          placeholder="Search by name, email, or bar number..."
          className="max-w-sm"
        />
        <Button type="submit">Search</Button>
        {query && (
          <Link href="/admin/content/lawyers">
            <Button variant="outline">Clear</Button>
          </Link>
        )}
      </form>

      {/* Lawyers Table */}
      <div className="rounded-lg border bg-background">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left text-sm font-medium">Name</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Bar #</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Location</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Tier</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Rating</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {lawyersList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    No lawyers found
                  </td>
                </tr>
              ) : (
                lawyersList.map((lawyer) => (
                  <tr key={lawyer.id} className="hover:bg-muted/50">
                    <td className="px-4 py-3">
                      <div>
                        <Link
                          href={`/lawyers/${lawyer.slug}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {lawyer.name}
                        </Link>
                        <p className="text-sm text-muted-foreground">{lawyer.email}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-sm">
                      {lawyer.barMembershipNumber || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {lawyer.city && lawyer.state
                        ? `${lawyer.city}, ${lawyer.state}`
                        : lawyer.state || "-"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {lawyer.isVerified ? (
                          <Badge className="bg-green-100 text-green-800">Verified</Badge>
                        ) : lawyer.isClaimed ? (
                          <Badge className="bg-blue-100 text-blue-800">Claimed</Badge>
                        ) : (
                          <Badge className="bg-gray-100 text-gray-800">Unclaimed</Badge>
                        )}
                        {!lawyer.isActive && (
                          <Badge className="bg-red-100 text-red-800">Inactive</Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {lawyer.subscriptionTier === "featured" ? (
                        <Badge className="bg-yellow-100 text-yellow-800">
                          <Crown className="h-3 w-3 mr-1" />
                          Featured
                        </Badge>
                      ) : lawyer.subscriptionTier === "premium" ? (
                        <Badge className="bg-purple-100 text-purple-800">Premium</Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">Free</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {lawyer.averageRating ? (
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span>{lawyer.averageRating}</span>
                          <span className="text-muted-foreground text-sm">
                            ({lawyer.reviewCount})
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/content/lawyers/${lawyer.id}`}>
                        <Button variant="outline" size="sm">
                          Edit
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="border-t px-4 py-3 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, total)} of {total} lawyers
            </p>
            <div className="flex gap-2">
              {page > 1 && (
                <Link href={`/admin/content/lawyers?${query ? `q=${query}&` : ""}page=${page - 1}`}>
                  <Button variant="outline" size="sm">
                    Previous
                  </Button>
                </Link>
              )}
              {page < totalPages && (
                <Link href={`/admin/content/lawyers?${query ? `q=${query}&` : ""}page=${page + 1}`}>
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
