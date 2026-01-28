import { db } from "@/lib/db";
import { claims, lawyers, user } from "@/lib/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Clock,
  CheckCircle,
  XCircle,
  Mail,
  FileText,
  AlertTriangle,
} from "lucide-react";

interface PageProps {
  searchParams: Promise<{ status?: string; page?: string }>;
}

const statusConfig = {
  pending: { label: "Pending", color: "bg-yellow-100 text-yellow-800", icon: Clock },
  email_sent: { label: "Email Sent", color: "bg-blue-100 text-blue-800", icon: Mail },
  verified: { label: "Verified", color: "bg-green-100 text-green-800", icon: CheckCircle },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-800", icon: XCircle },
  expired: { label: "Expired", color: "bg-gray-100 text-gray-800", icon: AlertTriangle },
};

async function getClaims(status?: string, page = 1) {
  const limit = 20;
  const offset = (page - 1) * limit;

  const whereCondition = status ? eq(claims.status, status as keyof typeof statusConfig) : undefined;

  // Use raw SQL for the join since we need user and lawyer info
  const claimsList = await db
    .select({
      id: claims.id,
      lawyerId: claims.lawyerId,
      userId: claims.userId,
      barMembershipNumber: claims.barMembershipNumber,
      firmEmail: claims.firmEmail,
      verificationMethod: claims.verificationMethod,
      verificationDocument: claims.verificationDocument,
      status: claims.status,
      rejectionReason: claims.rejectionReason,
      createdAt: claims.createdAt,
      expiresAt: claims.expiresAt,
      lawyerName: lawyers.name,
      lawyerSlug: lawyers.slug,
      userName: user.name,
      userEmail: user.email,
    })
    .from(claims)
    .leftJoin(lawyers, eq(claims.lawyerId, lawyers.id))
    .leftJoin(user, eq(claims.userId, user.id))
    .where(whereCondition)
    .orderBy(desc(claims.createdAt))
    .limit(limit)
    .offset(offset);

  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(claims)
    .where(whereCondition);

  return {
    claims: claimsList,
    total: Number(countResult[0]?.count) || 0,
    page,
    totalPages: Math.ceil((Number(countResult[0]?.count) || 0) / limit),
  };
}

async function getStatusCounts() {
  const results = await db
    .select({
      status: claims.status,
      count: sql<number>`count(*)`,
    })
    .from(claims)
    .groupBy(claims.status);

  return results.reduce(
    (acc, row) => {
      acc[row.status] = Number(row.count);
      return acc;
    },
    {} as Record<string, number>
  );
}

export default async function AdminClaimsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const status = params.status;
  const page = parseInt(params.page || "1");

  const [{ claims: claimsList, total, totalPages }, statusCounts] = await Promise.all([
    getClaims(status, page),
    getStatusCounts(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Claim Processing</h1>
        <p className="text-muted-foreground">
          Review and verify lawyer profile claims
        </p>
      </div>

      {/* Status Filters */}
      <div className="flex flex-wrap gap-2">
        <Link href="/admin/claims">
          <Button variant={!status ? "default" : "outline"} size="sm">
            All ({Object.values(statusCounts).reduce((a, b) => a + b, 0)})
          </Button>
        </Link>
        {Object.entries(statusConfig).map(([key, config]) => (
          <Link key={key} href={`/admin/claims?status=${key}`}>
            <Button variant={status === key ? "default" : "outline"} size="sm">
              <config.icon className="h-4 w-4 mr-1" />
              {config.label} ({statusCounts[key] || 0})
            </Button>
          </Link>
        ))}
      </div>

      {/* Claims Table */}
      <div className="rounded-lg border bg-background">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left text-sm font-medium">Lawyer</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Claimant</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Bar #</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Method</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Document</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Date</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {claimsList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                    No claims found
                  </td>
                </tr>
              ) : (
                claimsList.map((claim) => {
                  const config = statusConfig[claim.status as keyof typeof statusConfig];
                  return (
                    <tr key={claim.id} className="hover:bg-muted/50">
                      <td className="px-4 py-3">
                        <Link
                          href={`/lawyers/${claim.lawyerSlug}`}
                          className="text-primary hover:underline"
                        >
                          {claim.lawyerName || "Unknown"}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium">{claim.userName || "Unknown"}</p>
                          <p className="text-sm text-muted-foreground">{claim.userEmail}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-sm">
                        {claim.barMembershipNumber}
                      </td>
                      <td className="px-4 py-3 capitalize text-sm">
                        {claim.verificationMethod?.replace("_", " ")}
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={config?.color}>
                          {config?.label || claim.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {claim.verificationDocument ? (
                          <FileText className="h-4 w-4 text-green-600" />
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {new Date(claim.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/admin/claims/${claim.id}`}>
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
              Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, total)} of {total} claims
            </p>
            <div className="flex gap-2">
              {page > 1 && (
                <Link href={`/admin/claims?${status ? `status=${status}&` : ""}page=${page - 1}`}>
                  <Button variant="outline" size="sm">
                    Previous
                  </Button>
                </Link>
              )}
              {page < totalPages && (
                <Link href={`/admin/claims?${status ? `status=${status}&` : ""}page=${page + 1}`}>
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
