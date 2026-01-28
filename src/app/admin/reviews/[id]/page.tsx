"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Star,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ArrowLeft,
  ExternalLink,
  FileText,
} from "lucide-react";

interface Review {
  id: string;
  title: string;
  content: string;
  pros: string | null;
  cons: string | null;
  overallRating: number;
  communicationRating: number | null;
  expertiseRating: number | null;
  responsivenessRating: number | null;
  valueRating: number | null;
  reviewerEmail: string;
  reviewerName: string | null;
  verificationDocument: string | null;
  verificationStatus: string;
  verificationNotes: string | null;
  isPublished: boolean;
  createdAt: string;
  lawyer: {
    id: string;
    name: string;
    slug: string;
  };
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function AdminReviewDetailPage({ params }: PageProps) {
  const router = useRouter();
  const [review, setReview] = useState<Review | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [reviewId, setReviewId] = useState<string>("");

  useEffect(() => {
    params.then((p) => {
      setReviewId(p.id);
      fetchReview(p.id);
    });
  }, [params]);

  async function fetchReview(id: string) {
    try {
      const response = await fetch(`/api/admin/reviews/${id}`);
      if (response.ok) {
        const data = await response.json();
        setReview(data.review);
        setAdminNotes(data.review.verificationNotes || "");
      }
    } catch (error) {
      console.error("Failed to fetch review:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleAction(action: "approve" | "reject" | "flag") {
    if (!review) return;

    setProcessing(true);
    try {
      const response = await fetch(`/api/admin/reviews/${review.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, adminNotes }),
      });

      if (response.ok) {
        router.push("/admin/reviews");
        router.refresh();
      } else {
        const data = await response.json();
        alert(data.error || "Failed to update review");
      }
    } catch (error) {
      console.error("Failed to update review:", error);
      alert("Failed to update review");
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

  if (!review) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Review not found</p>
        <Link href="/admin/reviews" className="text-primary hover:underline mt-2 inline-block">
          Back to reviews
        </Link>
      </div>
    );
  }

  const statusConfig = {
    pending: { label: "Pending", color: "bg-yellow-100 text-yellow-800" },
    approved: { label: "Approved", color: "bg-green-100 text-green-800" },
    rejected: { label: "Rejected", color: "bg-red-100 text-red-800" },
    flagged_for_review: { label: "Flagged", color: "bg-orange-100 text-orange-800" },
  };

  const config = statusConfig[review.verificationStatus as keyof typeof statusConfig];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/reviews">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Review Details</h1>
          <p className="text-muted-foreground">
            Review for{" "}
            <Link href={`/lawyers/${review.lawyer.slug}`} className="text-primary hover:underline">
              {review.lawyer.name}
            </Link>
          </p>
        </div>
        <Badge className={config?.color}>{config?.label}</Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Review Content */}
          <div className="rounded-lg border bg-background p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold">{review.title}</h2>
                <p className="text-sm text-muted-foreground">
                  By {review.reviewerName || "Anonymous"} ({review.reviewerEmail})
                </p>
              </div>
              <div className="flex items-center gap-1 text-lg">
                <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                <span className="font-bold">{review.overallRating}</span>
                <span className="text-muted-foreground">/5</span>
              </div>
            </div>

            <div className="prose prose-sm max-w-none">
              <p>{review.content}</p>
            </div>

            {(review.pros || review.cons) && (
              <div className="grid md:grid-cols-2 gap-4 mt-4 pt-4 border-t">
                {review.pros && (
                  <div>
                    <h3 className="font-medium text-green-700 mb-2">Pros</h3>
                    <p className="text-sm text-muted-foreground">{review.pros}</p>
                  </div>
                )}
                {review.cons && (
                  <div>
                    <h3 className="font-medium text-red-700 mb-2">Cons</h3>
                    <p className="text-sm text-muted-foreground">{review.cons}</p>
                  </div>
                )}
              </div>
            )}

            {/* Sub-ratings */}
            {(review.communicationRating ||
              review.expertiseRating ||
              review.responsivenessRating ||
              review.valueRating) && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t">
                {review.communicationRating && (
                  <div>
                    <p className="text-sm text-muted-foreground">Communication</p>
                    <p className="font-medium">{review.communicationRating}/5</p>
                  </div>
                )}
                {review.expertiseRating && (
                  <div>
                    <p className="text-sm text-muted-foreground">Expertise</p>
                    <p className="font-medium">{review.expertiseRating}/5</p>
                  </div>
                )}
                {review.responsivenessRating && (
                  <div>
                    <p className="text-sm text-muted-foreground">Responsiveness</p>
                    <p className="font-medium">{review.responsivenessRating}/5</p>
                  </div>
                )}
                {review.valueRating && (
                  <div>
                    <p className="text-sm text-muted-foreground">Value</p>
                    <p className="font-medium">{review.valueRating}/5</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Verification Document */}
          {review.verificationDocument && (
            <div className="rounded-lg border bg-background p-6">
              <h2 className="font-semibold mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Verification Document
              </h2>
              <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
                <Image
                  src={review.verificationDocument}
                  alt="Verification document"
                  fill
                  className="object-contain"
                />
              </div>
              <a
                href={review.verificationDocument}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline mt-4"
              >
                Open in new tab <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          )}

          {/* AI Notes */}
          {review.verificationNotes && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
              <h3 className="font-medium text-blue-900 mb-2">AI Analysis Notes</h3>
              <p className="text-sm text-blue-800">{review.verificationNotes}</p>
            </div>
          )}
        </div>

        {/* Sidebar - Actions */}
        <div className="space-y-6">
          <div className="rounded-lg border bg-background p-6">
            <h2 className="font-semibold mb-4">Moderation Actions</h2>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Admin Notes</label>
                <Textarea
                  value={adminNotes}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setAdminNotes(e.target.value)}
                  placeholder="Add notes about your decision..."
                  className="mt-1"
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Button
                  onClick={() => handleAction("approve")}
                  disabled={processing || review.verificationStatus === "approved"}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve & Publish
                </Button>

                <Button
                  onClick={() => handleAction("flag")}
                  disabled={processing || review.verificationStatus === "flagged_for_review"}
                  variant="outline"
                  className="w-full border-orange-500 text-orange-600 hover:bg-orange-50"
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Flag for Further Review
                </Button>

                <Button
                  onClick={() => handleAction("reject")}
                  disabled={processing || review.verificationStatus === "rejected"}
                  variant="destructive"
                  className="w-full"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </Button>
              </div>
            </div>
          </div>

          {/* Metadata */}
          <div className="rounded-lg border bg-background p-6">
            <h2 className="font-semibold mb-4">Metadata</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Submitted</dt>
                <dd>{new Date(review.createdAt).toLocaleString()}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Published</dt>
                <dd>{review.isPublished ? "Yes" : "No"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Has Document</dt>
                <dd>{review.verificationDocument ? "Yes" : "No"}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
