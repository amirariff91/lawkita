"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle2, AlertCircle, FileText, Upload, X } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { createClient } from "@supabase/supabase-js";

interface ClaimFirmFormProps {
  firmId: string;
  firmName: string;
}

type FormStatus = "idle" | "submitting" | "success" | "error";

export function ClaimFirmForm({ firmId, firmName }: ClaimFirmFormProps) {
  const router = useRouter();
  const { data: session } = authClient.useSession();

  const [formData, setFormData] = useState({
    position: "",
    justification: "",
  });
  const [status, setStatus] = useState<FormStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");
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
            You need to be signed in to claim this firm profile
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Please sign in or create an account to claim your firm profile on LawKita.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button onClick={() => authClient.signIn.social({ provider: "google" })}>
              Sign in with Google
            </Button>
            <Button variant="outline" onClick={() => router.push("/auth/signin")}>
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
    const fileName = `firm-claims/${firmId}/${Date.now()}.${fileExt}`;

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

    if (!formData.position.trim()) {
      setErrorMessage("Please enter your position at the firm");
      return;
    }

    if (!documentFile) {
      setErrorMessage("Please upload a verification document");
      return;
    }

    setStatus("submitting");
    setErrorMessage("");
    setUploadProgress(0);

    try {
      // Upload document
      setUploadProgress(10);
      const documentUrl = await uploadDocument();

      const response = await fetch(`/api/firms/${firmId}/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          position: formData.position,
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
                Your claim for {firmName} is being reviewed. We'll verify your documentation
                and notify you within 1-3 business days.
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
        <CardTitle>Claim Your Firm</CardTitle>
        <CardDescription>
          Verify your authority to manage {firmName}'s profile
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Position at Firm */}
          <div className="space-y-2">
            <Label htmlFor="position">Your Position at the Firm *</Label>
            <Input
              id="position"
              required
              value={formData.position}
              onChange={(e) => setFormData({ ...formData, position: e.target.value })}
              placeholder="e.g., Managing Partner, Partner, Administrator"
            />
            <p className="text-xs text-muted-foreground">
              Enter your official title or role at the firm
            </p>
          </div>

          {/* Document Upload */}
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
                <strong>Acceptable documents:</strong> Letter of Authorization on firm letterhead,
                Partnership Agreement, SSM/Business Registration showing your name, or official
                firm ID card.
              </p>
            </div>
          </div>

          {/* Additional Notes */}
          <div className="space-y-2">
            <Label htmlFor="justification">Additional Information (Optional)</Label>
            <Textarea
              id="justification"
              value={formData.justification}
              onChange={(e) => setFormData({ ...formData, justification: e.target.value })}
              placeholder="Any additional information to support your claim..."
              rows={3}
            />
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
            By claiming this firm, you confirm that you are authorized to manage {firmName}'s
            profile and agree to our Terms of Service.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
