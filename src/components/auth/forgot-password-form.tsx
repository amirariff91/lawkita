"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, AlertCircle, CheckCircle2, ArrowLeft } from "lucide-react";
import { authClient } from "@/lib/auth-client";

type FormStatus = "idle" | "submitting" | "success" | "error";

export function ForgotPasswordForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<FormStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("submitting");
    setErrorMessage("");

    try {
      const result = await authClient.$fetch("/request-password-reset", {
        method: "POST",
        body: {
          email,
          redirectTo: `/auth/reset-password?callbackUrl=${encodeURIComponent(callbackUrl)}`,
        },
      });

      if (result.error) {
        throw new Error(result.error.message || "Failed to send reset email");
      }

      setStatus("success");
    } catch (error) {
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Failed to send reset email");
    }
  };

  if (status === "success") {
    return (
      <div className="space-y-4 text-center">
        <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
        <div>
          <h3 className="font-semibold text-lg">Check your email</h3>
          <p className="text-muted-foreground mt-1">
            We&apos;ve sent a password reset link to <strong>{email}</strong>. Please check your
            inbox and follow the instructions.
          </p>
        </div>
        <Button variant="outline" asChild className="w-full">
          <Link href={`/auth/signin${callbackUrl !== "/dashboard" ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ""}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to sign in
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Enter your email address and we&apos;ll send you a link to reset your password.
        </p>
      </div>

      {status === "error" && (
        <div role="alert" className="flex items-center gap-2 text-destructive text-sm">
          <AlertCircle className="h-4 w-4" aria-hidden="true" />
          {errorMessage}
        </div>
      )}

      <Button type="submit" className="w-full" disabled={status === "submitting"}>
        {status === "submitting" ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            Sending reset link...
          </>
        ) : (
          "Send reset link"
        )}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Remember your password?{" "}
        <Link
          href={`/auth/signin${callbackUrl !== "/dashboard" ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ""}`}
          className="text-primary hover:underline"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
