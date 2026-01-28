"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  CheckCircle,
  XCircle,
  ArrowLeft,
  ExternalLink,
  FileText,
  Phone,
  Mail,
  MessageSquare,
} from "lucide-react";

interface Claim {
  id: string;
  lawyerId: string;
  userId: string;
  barMembershipNumber: string;
  firmEmail: string | null;
  verificationMethod: string;
  verificationDocument: string | null;
  status: string;
  rejectionReason: string | null;
  adminNotes: string | null;
  createdAt: string;
  expiresAt: string | null;
  lawyer: {
    id: string;
    name: string;
    slug: string;
    barMembershipNumber: string | null;
    phone: string | null;
    email: string | null;
  };
  user: {
    id: string;
    name: string;
    email: string;
  };
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function AdminClaimDetailPage({ params }: PageProps) {
  const router = useRouter();
  const [claim, setClaim] = useState<Claim | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");

  useEffect(() => {
    params.then((p) => {
      fetchClaim(p.id);
    });
  }, [params]);

  async function fetchClaim(id: string) {
    try {
      const response = await fetch(`/api/admin/claims/${id}`);
      if (response.ok) {
        const data = await response.json();
        setClaim(data.claim);
        setAdminNotes(data.claim.adminNotes || "");
        setWhatsappNumber(data.claim.lawyer?.phone || "");
      }
    } catch (error) {
      console.error("Failed to fetch claim:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleAction(action: "approve" | "reject" | "send_whatsapp") {
    if (!claim) return;

    if (action === "reject" && !rejectionReason) {
      alert("Please provide a rejection reason");
      return;
    }

    if (action === "send_whatsapp" && !whatsappNumber) {
      alert("Please provide a WhatsApp number");
      return;
    }

    setProcessing(true);
    try {
      const response = await fetch(`/api/admin/claims/${claim.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          adminNotes,
          rejectionReason: action === "reject" ? rejectionReason : undefined,
          whatsappNumber: action === "send_whatsapp" ? whatsappNumber : undefined,
        }),
      });

      if (response.ok) {
        if (action === "approve" || action === "reject") {
          router.push("/admin/claims");
          router.refresh();
        } else {
          // Refresh current page for WhatsApp sent
          fetchClaim(claim.id);
        }
      } else {
        const data = await response.json();
        alert(data.error || "Failed to update claim");
      }
    } catch (error) {
      console.error("Failed to update claim:", error);
      alert("Failed to update claim");
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

  if (!claim) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Claim not found</p>
        <Link href="/admin/claims" className="text-primary hover:underline mt-2 inline-block">
          Back to claims
        </Link>
      </div>
    );
  }

  const statusConfig = {
    pending: { label: "Pending", color: "bg-yellow-100 text-yellow-800" },
    email_sent: { label: "Email Sent", color: "bg-blue-100 text-blue-800" },
    verified: { label: "Verified", color: "bg-green-100 text-green-800" },
    rejected: { label: "Rejected", color: "bg-red-100 text-red-800" },
    expired: { label: "Expired", color: "bg-gray-100 text-gray-800" },
  };

  const config = statusConfig[claim.status as keyof typeof statusConfig];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/claims">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Claim Details</h1>
          <p className="text-muted-foreground">
            Claim for{" "}
            <Link href={`/lawyers/${claim.lawyer.slug}`} className="text-primary hover:underline">
              {claim.lawyer.name}
            </Link>
          </p>
        </div>
        <Badge className={config?.color}>{config?.label}</Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Claim Info */}
          <div className="rounded-lg border bg-background p-6">
            <h2 className="font-semibold mb-4">Claim Information</h2>
            <dl className="grid md:grid-cols-2 gap-4">
              <div>
                <dt className="text-sm text-muted-foreground">Claimant</dt>
                <dd className="font-medium">{claim.user.name}</dd>
                <dd className="text-sm text-muted-foreground">{claim.user.email}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Bar Membership #</dt>
                <dd className="font-mono font-medium">{claim.barMembershipNumber}</dd>
                {claim.lawyer.barMembershipNumber &&
                  claim.lawyer.barMembershipNumber !== claim.barMembershipNumber && (
                    <dd className="text-sm text-orange-600">
                      Profile shows: {claim.lawyer.barMembershipNumber}
                    </dd>
                  )}
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Verification Method</dt>
                <dd className="capitalize">{claim.verificationMethod?.replace("_", " ")}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Firm Email</dt>
                <dd>{claim.firmEmail || "-"}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Submitted</dt>
                <dd>{new Date(claim.createdAt).toLocaleString()}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Expires</dt>
                <dd>{claim.expiresAt ? new Date(claim.expiresAt).toLocaleDateString() : "-"}</dd>
              </div>
            </dl>
          </div>

          {/* Lawyer Profile */}
          <div className="rounded-lg border bg-background p-6">
            <h2 className="font-semibold mb-4">Lawyer Profile</h2>
            <dl className="grid md:grid-cols-2 gap-4">
              <div>
                <dt className="text-sm text-muted-foreground">Name</dt>
                <dd className="font-medium">{claim.lawyer.name}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Profile Bar #</dt>
                <dd className="font-mono">{claim.lawyer.barMembershipNumber || "-"}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Email</dt>
                <dd>{claim.lawyer.email || "-"}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Phone</dt>
                <dd>{claim.lawyer.phone || "-"}</dd>
              </div>
            </dl>
            <div className="mt-4">
              <Link href={`/lawyers/${claim.lawyer.slug}`} target="_blank">
                <Button variant="outline" size="sm">
                  View Profile <ExternalLink className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Verification Document */}
          {claim.verificationDocument && (
            <div className="rounded-lg border bg-background p-6">
              <h2 className="font-semibold mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Bar Certificate
              </h2>
              <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
                <Image
                  src={claim.verificationDocument}
                  alt="Bar certificate"
                  fill
                  className="object-contain"
                />
              </div>
              <a
                href={claim.verificationDocument}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline mt-4"
              >
                Open in new tab <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          )}
        </div>

        {/* Sidebar - Actions */}
        <div className="space-y-6">
          {/* Quick Actions */}
          {claim.status === "pending" && (
            <div className="rounded-lg border bg-background p-6">
              <h2 className="font-semibold mb-4">Verification Actions</h2>

              <div className="space-y-4">
                {/* WhatsApp Verification */}
                <div>
                  <label className="text-sm font-medium">Send WhatsApp Verification</label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      value={whatsappNumber}
                      onChange={(e) => setWhatsappNumber(e.target.value)}
                      placeholder="60123456789"
                    />
                    <Button
                      onClick={() => handleAction("send_whatsapp")}
                      disabled={processing}
                      variant="outline"
                      size="icon"
                    >
                      <MessageSquare className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Sends verification code via WhatsApp
                  </p>
                </div>

                {/* Contact Options */}
                <div className="flex gap-2">
                  {claim.lawyer.phone && (
                    <a href={`tel:${claim.lawyer.phone}`}>
                      <Button variant="outline" size="sm">
                        <Phone className="h-4 w-4 mr-1" />
                        Call
                      </Button>
                    </a>
                  )}
                  {claim.user.email && (
                    <a href={`mailto:${claim.user.email}`}>
                      <Button variant="outline" size="sm">
                        <Mail className="h-4 w-4 mr-1" />
                        Email
                      </Button>
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Moderation Actions */}
          <div className="rounded-lg border bg-background p-6">
            <h2 className="font-semibold mb-4">Moderation</h2>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Admin Notes</label>
                <Textarea
                  value={adminNotes}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setAdminNotes(e.target.value)}
                  placeholder="Add notes about verification..."
                  className="mt-1"
                  rows={3}
                />
              </div>

              {claim.status === "pending" && (
                <>
                  <div>
                    <label className="text-sm font-medium">Rejection Reason (if rejecting)</label>
                    <Textarea
                      value={rejectionReason}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setRejectionReason(e.target.value)}
                      placeholder="Reason for rejection..."
                      className="mt-1"
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2 pt-2">
                    <Button
                      onClick={() => handleAction("approve")}
                      disabled={processing}
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve Claim
                    </Button>

                    <Button
                      onClick={() => handleAction("reject")}
                      disabled={processing}
                      variant="destructive"
                      className="w-full"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject Claim
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Rejection Info */}
          {claim.status === "rejected" && claim.rejectionReason && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <h3 className="font-medium text-red-900 mb-2">Rejection Reason</h3>
              <p className="text-sm text-red-800">{claim.rejectionReason}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
