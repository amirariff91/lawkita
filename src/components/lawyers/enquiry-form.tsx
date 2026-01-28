"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

interface EnquiryFormProps {
  lawyerId: string;
  lawyerName: string;
}

const CASE_TYPES = [
  { value: "criminal", label: "Criminal Law" },
  { value: "family", label: "Family Law" },
  { value: "corporate", label: "Corporate/Commercial" },
  { value: "property", label: "Property & Conveyancing" },
  { value: "employment", label: "Employment Law" },
  { value: "civil", label: "Civil Litigation" },
  { value: "syariah", label: "Syariah Law" },
  { value: "ip", label: "Intellectual Property" },
  { value: "other", label: "Other" },
];

const URGENCY_LEVELS = [
  { value: "low", label: "Low - No immediate deadline" },
  { value: "medium", label: "Medium - Within a few weeks" },
  { value: "high", label: "High - Within a week" },
  { value: "urgent", label: "Urgent - Immediate attention needed" },
];

type FormStatus = "idle" | "submitting" | "success" | "error";

export function EnquiryForm({ lawyerId, lawyerName }: EnquiryFormProps) {
  const [formData, setFormData] = useState({
    senderName: "",
    senderEmail: "",
    senderPhone: "",
    caseType: "",
    urgency: "medium",
    description: "",
  });
  const [status, setStatus] = useState<FormStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("submitting");
    setErrorMessage("");

    try {
      const response = await fetch(`/api/lawyers/${lawyerId}/enquiry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to submit enquiry");
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
            <CheckCircle2 className="h-12 w-12 text-green-500" aria-hidden="true" />
            <div>
              <h3 className="font-semibold text-lg">Enquiry Sent Successfully</h3>
              <p className="text-muted-foreground mt-1">
                Your enquiry has been sent to {lawyerName}. They will typically respond within 1-2 business days.
              </p>
            </div>
            <Button variant="outline" onClick={() => setStatus("idle")}>
              Send Another Enquiry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Send an Enquiry</CardTitle>
        <CardDescription>
          Describe your legal matter and {lawyerName} will get back to you
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="senderName">Your Name *</Label>
              <Input
                id="senderName"
                required
                autoComplete="name"
                value={formData.senderName}
                onChange={(e) => setFormData({ ...formData, senderName: e.target.value })}
                placeholder="John Doe"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="senderEmail">Email Address *</Label>
              <Input
                id="senderEmail"
                type="email"
                required
                autoComplete="email"
                spellCheck="false"
                value={formData.senderEmail}
                onChange={(e) => setFormData({ ...formData, senderEmail: e.target.value })}
                placeholder="john@example.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="senderPhone">Phone Number</Label>
              <Input
                id="senderPhone"
                type="tel"
                autoComplete="tel"
                value={formData.senderPhone}
                onChange={(e) => setFormData({ ...formData, senderPhone: e.target.value })}
                placeholder="+60123456789"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="caseType">Type of Legal Matter *</Label>
              <Select
                value={formData.caseType}
                onValueChange={(value) => setFormData({ ...formData, caseType: value })}
                required
              >
                <SelectTrigger id="caseType">
                  <SelectValue placeholder="Select case type" />
                </SelectTrigger>
                <SelectContent>
                  {CASE_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="urgency">How urgent is this matter? *</Label>
            <Select
              value={formData.urgency}
              onValueChange={(value) => setFormData({ ...formData, urgency: value })}
            >
              <SelectTrigger id="urgency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {URGENCY_LEVELS.map((level) => (
                  <SelectItem key={level.value} value={level.value}>
                    {level.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Describe Your Legal Matter *</Label>
            <textarea
              id="description"
              required
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Please provide details about your legal matter. Include relevant dates, parties involved, and any urgent deadlines…"
              className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-y"
              rows={5}
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
                Sending…
              </>
            ) : (
              "Send Enquiry"
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            By submitting this form, you agree to our Terms of Service and Privacy Policy.
            Your information will only be shared with {lawyerName}.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
