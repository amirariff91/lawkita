"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle2, AlertCircle, Shield, Mail, FileText, Upload, X } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { createClient } from "@supabase/supabase-js";

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
    phoneNumber: "",
  });
  const [status, setStatus] = useState<FormStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [verificationMethod, setVerificationMethod] = useState<VerificationMethod>("bar_lookup");
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const validTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
      if (!validTypes.includes(file.type)) {
        setErrorMessage("Please upload a JPG, PNG, WebP, or PDF file");
        return;
      }
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setErrorMessage("File size must be less than 10MB");
        return;
      }
      setDocumentFile(file);
      setErrorMessage("");
    }
  };

  const uploadDocument = async (): Promise<string | null> => {
    if (!documentFile) return null;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error("Storage not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const fileExt = documentFile.name.split(".").pop();
    const fileName = `claims/${lawyerId}/${Date.now()}.${fileExt}`;

    setUploadProgress(30);

    const { data, error } = await supabase.storage
      .from("documents")
      .upload(fileName, documentFile, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      throw new Error("Failed to upload document: " + error.message);
    }

    setUploadProgress(80);

    // Get public URL
    const { data: urlData } = supabase.storage.from("documents").getPublicUrl(data.path);

    setUploadProgress(100);
    return urlData.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("submitting");
    setErrorMessage("");
    setUploadProgress(0);

    try {
      // Upload document if provided
      let documentUrl: string | null = null;
      if (verificationMethod === "document" && documentFile) {
        setUploadProgress(10);
        documentUrl = await uploadDocument();
      }

      const response = await fetch(`/api/lawyers/${lawyerId}/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          barMembershipNumber: formData.barMembershipNumber,
          firmEmail: formData.firmEmail || undefined,
          phoneNumber: formData.phoneNumber || undefined,
          verificationMethod,
          verificationDocument: documentUrl,
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
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="document">Upload Verification Document *</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  id="document"
                  accept=".jpg,.jpeg,.png,.webp,.pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                {documentFile ? (
                  <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/50">
                    <FileText className="h-8 w-8 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{documentFile.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(documentFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setDocumentFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full p-6 border-2 border-dashed rounded-lg hover:border-primary/50 transition-colors text-center"
                  >
                    <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm font-medium">Click to upload document</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      JPG, PNG, WebP, or PDF up to 10MB
                    </p>
                  </button>
                )}
              </div>
              {uploadProgress > 0 && uploadProgress < 100 && (
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              )}
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground">
                  <strong>Acceptable documents:</strong> Valid Practicing Certificate,
                  Bar Council Membership Card, or official letter from your firm on letterhead.
                </p>
              </div>
            </div>
          )}

          {/* Phone Number for WhatsApp verification */}
          <div className="space-y-2">
            <Label htmlFor="phoneNumber">WhatsApp Number (Optional)</Label>
            <Input
              id="phoneNumber"
              type="tel"
              value={formData.phoneNumber}
              onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
              placeholder="e.g., 012-345 6789"
            />
            <p className="text-xs text-muted-foreground">
              We may send a verification code via WhatsApp for faster verification
            </p>
          </div>

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
