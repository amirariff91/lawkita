"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle2, AlertCircle, Shield, Mail, FileText } from "lucide-react";
import { authClient } from "@/lib/auth-client";

interface ClaimFormProps {
  lawyerId: string;
  lawyerName: string;
  lawyerBarNumber?: string | null;
}

type FormStatus = "idle" | "submitting" | "success" | "error" | "needs_login";
type VerificationMethod = "bar_lookup" | "email" | "document";

export function ClaimForm({ lawyerId, lawyerName, lawyerBarNumber }: ClaimFormProps) {
  const router = useRouter();
  const { data: session } = authClient.useSession();

  const [formData, setFormData] = useState({
    barMembershipNumber: lawyerBarNumber || "",
    firmEmail: "",
  });
  const [status, setStatus] = useState<FormStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [verificationMethod, setVerificationMethod] = useState<VerificationMethod>("bar_lookup");

  // If not logged in, show login prompt
  if (!session?.user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sign In Required</CardTitle>
          <CardDescription>
            You need to be signed in to claim this profile
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Please sign in or create an account to claim your profile on LawKita.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button onClick={() => authClient.signIn.social({ provider: "google" })}>
              Sign in with Google
            </Button>
            <Button variant="outline" onClick={() => router.push("/sign-in")}>
              Sign in with Email
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("submitting");
    setErrorMessage("");

    try {
      const response = await fetch(`/api/lawyers/${lawyerId}/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          verificationMethod,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to submit claim");
      }

      setStatus("success");
    } catch (error) {
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Something went wrong");
    }
  };

  if (status === "success") {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center space-y-4">
            <CheckCircle2 className="h-12 w-12 text-green-500" />
            <div>
              <h3 className="font-semibold text-lg">Claim Submitted</h3>
              <p className="text-muted-foreground mt-1">
                {verificationMethod === "email" ? (
                  <>
                    We've sent a verification email to <span className="font-medium">{formData.firmEmail}</span>.
                    Please check your inbox and follow the instructions to complete verification.
                  </>
                ) : verificationMethod === "bar_lookup" ? (
                  <>
                    We're verifying your Bar membership number against the Malaysian Bar Council directory.
                    This usually takes 1-2 business days.
                  </>
                ) : (
                  <>
                    Your claim is being reviewed. Please upload your practicing certificate to expedite verification.
                    This usually takes 1-3 business days.
                  </>
                )}
              </p>
            </div>
            <Button onClick={() => router.push("/dashboard")}>
              Go to Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Claim Your Profile</CardTitle>
        <CardDescription>
          Verify that you are {lawyerName} to manage this profile
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Verification Method Selection */}
          <fieldset className="space-y-3">
            <legend className="text-sm font-medium leading-none">Choose Verification Method</legend>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3" role="radiogroup" aria-label="Verification method">
              <button
                type="button"
                role="radio"
                aria-checked={verificationMethod === "bar_lookup"}
                onClick={() => setVerificationMethod("bar_lookup")}
                onKeyDown={(e) => {
                  if (e.key === "ArrowRight" || e.key === "ArrowDown") {
                    e.preventDefault();
                    setVerificationMethod("email");
                  }
                }}
                className={`p-4 border rounded-lg text-left transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
                  verificationMethod === "bar_lookup"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <Shield className="h-5 w-5 mb-2" aria-hidden="true" />
                <div className="font-medium text-sm">Bar Directory</div>
                <div className="text-xs text-muted-foreground">
                  Verify via Bar Council
                </div>
              </button>

              <button
                type="button"
                role="radio"
                aria-checked={verificationMethod === "email"}
                onClick={() => setVerificationMethod("email")}
                onKeyDown={(e) => {
                  if (e.key === "ArrowRight" || e.key === "ArrowDown") {
                    e.preventDefault();
                    setVerificationMethod("document");
                  } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
                    e.preventDefault();
                    setVerificationMethod("bar_lookup");
                  }
                }}
                className={`p-4 border rounded-lg text-left transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
                  verificationMethod === "email"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <Mail className="h-5 w-5 mb-2" aria-hidden="true" />
                <div className="font-medium text-sm">Firm Email</div>
                <div className="text-xs text-muted-foreground">
                  Verify via firm email
                </div>
              </button>

              <button
                type="button"
                role="radio"
                aria-checked={verificationMethod === "document"}
                onClick={() => setVerificationMethod("document")}
                onKeyDown={(e) => {
                  if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
                    e.preventDefault();
                    setVerificationMethod("email");
                  }
                }}
                className={`p-4 border rounded-lg text-left transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
                  verificationMethod === "document"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <FileText className="h-5 w-5 mb-2" aria-hidden="true" />
                <div className="font-medium text-sm">Document</div>
                <div className="text-xs text-muted-foreground">
                  Upload certificate
                </div>
              </button>
            </div>
          </fieldset>

          {/* Bar Membership Number */}
          <div className="space-y-2">
            <Label htmlFor="barMembershipNumber">Bar Membership Number *</Label>
            <Input
              id="barMembershipNumber"
              required
              value={formData.barMembershipNumber}
              onChange={(e) => setFormData({ ...formData, barMembershipNumber: e.target.value })}
              placeholder="e.g., BC12345"
            />
            <p className="text-xs text-muted-foreground">
              Your Bar Council membership number is required for all verification methods
            </p>
          </div>

          {/* Email Verification - only show if email method selected */}
          {verificationMethod === "email" && (
            <div className="space-y-2">
              <Label htmlFor="firmEmail">Firm Email Address *</Label>
              <Input
                id="firmEmail"
                type="email"
                required
                value={formData.firmEmail}
                onChange={(e) => setFormData({ ...formData, firmEmail: e.target.value })}
                placeholder="you@lawfirm.com.my"
              />
              <p className="text-xs text-muted-foreground">
                We'll send a verification link to this email address
              </p>
            </div>
          )}

          {/* Document Upload - only show if document method selected */}
          {verificationMethod === "document" && (
            <div className="space-y-2 p-4 bg-muted rounded-lg">
              <p className="text-sm">
                After submitting this form, you'll be able to upload your practicing certificate
                from your dashboard. Acceptable documents:
              </p>
              <ul className="text-sm text-muted-foreground list-disc list-inside">
                <li>Valid Practicing Certificate</li>
                <li>Bar Council Membership Card</li>
                <li>Official letter from your firm</li>
              </ul>
            </div>
          )}

          {status === "error" && (
            <div role="alert" aria-live="polite" className="flex items-center gap-2 text-destructive text-sm">
              <AlertCircle className="h-4 w-4" aria-hidden="true" />
              {errorMessage}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={status === "submitting"} aria-busy={status === "submitting"}>
            {status === "submitting" ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                Submitting Claim...
              </>
            ) : (
              "Submit Claim"
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            By claiming this profile, you confirm that you are {lawyerName} and agree to our Terms of Service.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
