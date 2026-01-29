"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle2, AlertCircle, Star, Upload, FileText, X, Shield } from "lucide-react";
import { createClient } from "@supabase/supabase-js";

interface ReviewFormProps {
  lawyerId: string;
  lawyerName: string;
}

type FormStatus = "idle" | "submitting" | "success" | "error";

interface StarRatingProps {
  value: number;
  onChange: (value: number) => void;
  label: string;
}

function StarRating({ value, onChange, label }: StarRatingProps) {
  const [hoverValue, setHoverValue] = useState(0);

  const handleKeyDown = (e: React.KeyboardEvent, star: number) => {
    if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      e.preventDefault();
      onChange(Math.min(star + 1, 5));
    } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      e.preventDefault();
      onChange(Math.max(star - 1, 1));
    }
  };

  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">{label}</Label>
      <div className="flex gap-1" role="group" aria-label={label}>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            onMouseEnter={() => setHoverValue(star)}
            onMouseLeave={() => setHoverValue(0)}
            onKeyDown={(e) => handleKeyDown(e, star)}
            aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
            aria-pressed={value >= star}
            className="focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded"
          >
            <Star
              aria-hidden="true"
              className={`h-6 w-6 transition-colors ${
                (hoverValue || value) >= star
                  ? "fill-amber-400 text-amber-400 dark:fill-amber-500 dark:text-amber-500"
                  : "text-muted-foreground"
              }`}
            />
          </button>
        ))}
        {value > 0 && (
          <span className="text-sm text-muted-foreground ml-2">{value}/5</span>
        )}
      </div>
    </div>
  );
}

export function ReviewForm({ lawyerId, lawyerName }: ReviewFormProps) {
  const [formData, setFormData] = useState({
    reviewerName: "",
    reviewerEmail: "",
    title: "",
    content: "",
    overallRating: 0,
    communicationRating: 0,
    expertiseRating: 0,
    responsivenessRating: 0,
    valueRating: 0,
    pros: "",
    cons: "",
  });
  const [status, setStatus] = useState<FormStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [verificationDocument, setVerificationDocument] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
      if (!validTypes.includes(file.type)) {
        setErrorMessage("Please upload a JPG, PNG, WebP, or PDF file");
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setErrorMessage("File size must be less than 10MB");
        return;
      }
      setVerificationDocument(file);
      setErrorMessage("");
    }
  };

  const uploadDocument = async (): Promise<string | null> => {
    if (!verificationDocument) return null;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error("Storage not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const fileExt = verificationDocument.name.split(".").pop();
    const fileName = `reviews/${lawyerId}/${Date.now()}.${fileExt}`;

    setUploadProgress(30);

    const { data, error } = await supabase.storage
      .from("documents")
      .upload(fileName, verificationDocument, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      throw new Error("Failed to upload document: " + error.message);
    }

    setUploadProgress(80);

    const { data: urlData } = supabase.storage.from("documents").getPublicUrl(data.path);

    setUploadProgress(100);
    return urlData.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.overallRating === 0) {
      setErrorMessage("Please provide an overall rating");
      setStatus("error");
      return;
    }

    setStatus("submitting");
    setErrorMessage("");
    setUploadProgress(0);

    try {
      // Upload verification document if provided
      let documentUrl: string | null = null;
      if (verificationDocument) {
        setUploadProgress(10);
        documentUrl = await uploadDocument();
      }

      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          lawyerId,
          verificationDocument: documentUrl,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to submit review");
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
              <h3 className="font-semibold text-lg">Review Submitted</h3>
              <p className="text-muted-foreground mt-1">
                Thank you for your review of {lawyerName}. Your review is pending verification and will be published once approved.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Write a Review</CardTitle>
        <CardDescription>
          Share your experience with {lawyerName} to help others make informed decisions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Contact Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="reviewerName">Your Name *</Label>
              <Input
                id="reviewerName"
                required
                autoComplete="name"
                value={formData.reviewerName}
                onChange={(e) => setFormData({ ...formData, reviewerName: e.target.value })}
                placeholder="John Doe"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reviewerEmail">Your Email *</Label>
              <Input
                id="reviewerEmail"
                type="email"
                required
                autoComplete="email"
                value={formData.reviewerEmail}
                onChange={(e) => setFormData({ ...formData, reviewerEmail: e.target.value })}
                placeholder="john@example.com"
              />
              <p className="text-xs text-muted-foreground">
                Will not be displayed publicly
              </p>
            </div>
          </div>

          {/* Overall Rating */}
          <div className="border-t pt-4">
            <StarRating
              label="Overall Rating *"
              value={formData.overallRating}
              onChange={(value) => setFormData({ ...formData, overallRating: value })}
            />
          </div>

          {/* Detailed Ratings */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StarRating
              label="Communication"
              value={formData.communicationRating}
              onChange={(value) => setFormData({ ...formData, communicationRating: value })}
            />
            <StarRating
              label="Expertise"
              value={formData.expertiseRating}
              onChange={(value) => setFormData({ ...formData, expertiseRating: value })}
            />
            <StarRating
              label="Responsiveness"
              value={formData.responsivenessRating}
              onChange={(value) => setFormData({ ...formData, responsivenessRating: value })}
            />
            <StarRating
              label="Value for Money"
              value={formData.valueRating}
              onChange={(value) => setFormData({ ...formData, valueRating: value })}
            />
          </div>

          {/* Review Content */}
          <div className="space-y-4 border-t pt-4">
            <div className="space-y-2">
              <Label htmlFor="title">Review Title *</Label>
              <Input
                id="title"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Summarize your experience"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Your Review *</Label>
              <textarea
                id="content"
                required
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Describe your experience working with this lawyer..."
                className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                rows={4}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pros">Pros (optional)</Label>
                <textarea
                  id="pros"
                  value={formData.pros}
                  onChange={(e) => setFormData({ ...formData, pros: e.target.value })}
                  placeholder="What did you like about this lawyer?"
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cons">Cons (optional)</Label>
                <textarea
                  id="cons"
                  value={formData.cons}
                  onChange={(e) => setFormData({ ...formData, cons: e.target.value })}
                  placeholder="What could be improved?"
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  rows={3}
                />
              </div>
            </div>
          </div>

          {/* Invoice/Receipt Upload */}
          <div className="border-t pt-4 space-y-3">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-green-600" />
              <Label className="text-sm font-medium">Upload Proof of Service (Recommended)</Label>
            </div>
            <p className="text-xs text-muted-foreground">
              Reviews with verified invoices or receipts are published faster and displayed as "Verified Client"
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.webp,.pdf"
              onChange={handleFileSelect}
              className="hidden"
            />

            {verificationDocument ? (
              <div className="flex items-center gap-3 p-3 border rounded-lg bg-green-50 dark:bg-green-900/20">
                <FileText className="h-8 w-8 text-green-600" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{verificationDocument.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(verificationDocument.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setVerificationDocument(null);
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
                className="w-full p-4 border-2 border-dashed rounded-lg hover:border-green-500/50 transition-colors text-center"
              >
                <Upload className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm font-medium">Click to upload invoice or receipt</p>
                <p className="text-xs text-muted-foreground mt-1">
                  JPG, PNG, WebP, or PDF up to 10MB
                </p>
              </button>
            )}

            {uploadProgress > 0 && uploadProgress < 100 && (
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full transition-all"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            )}
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
                {uploadProgress > 0 && uploadProgress < 100 ? "Uploading..." : "Submitting..."}
              </>
            ) : (
              "Submit Review"
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            {verificationDocument
              ? "Your invoice will be verified automatically. Reviews typically publish within minutes."
              : "Your review will be verified before publication. This may take 1-2 business days."}
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
