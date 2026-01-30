"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { authClient } from "@/lib/auth-client";

type FormStatus = "idle" | "submitting" | "success" | "error";

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
  });
  const [status, setStatus] = useState<FormStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  // If no token, show error
  if (!token) {
    return (
      <div className="space-y-4 text-center">
        <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
        <div>
          <h3 className="font-semibold text-lg">Invalid reset link</h3>
          <p className="text-muted-foreground mt-1">
            This password reset link is invalid or has expired. Please request a new one.
          </p>
        </div>
        <Button asChild className="w-full">
          <Link href="/auth/forgot-password">Request new link</Link>
        </Button>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("submitting");
    setErrorMessage("");

    // Validate password match
    if (formData.password !== formData.confirmPassword) {
      setStatus("error");
      setErrorMessage("Passwords do not match");
      return;
    }

    // Validate password length
    if (formData.password.length < 8) {
      setStatus("error");
      setErrorMessage("Password must be at least 8 characters");
      return;
    }

    try {
      const result = await authClient.$fetch("/reset-password", {
        method: "POST",
        body: {
          newPassword: formData.password,
          token,
        },
      });

      if (result.error) {
        throw new Error(result.error.message || "Failed to reset password");
      }

      setStatus("success");
    } catch (error) {
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Failed to reset password");
    }
  };

  if (status === "success") {
    return (
      <div className="space-y-4 text-center">
        <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
        <div>
          <h3 className="font-semibold text-lg">Password reset successful</h3>
          <p className="text-muted-foreground mt-1">
            Your password has been reset. You can now sign in with your new password.
          </p>
        </div>
        <Button asChild className="w-full">
          <Link href={`/auth/signin${callbackUrl !== "/dashboard" ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ""}`}>
            Sign in
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="password">New Password</Label>
        <Input
          id="password"
          type="password"
          required
          autoComplete="new-password"
          placeholder="At least 8 characters"
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm New Password</Label>
        <Input
          id="confirmPassword"
          type="password"
          required
          autoComplete="new-password"
          placeholder="Confirm your new password"
          value={formData.confirmPassword}
          onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
        />
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
            Resetting password...
          </>
        ) : (
          "Reset password"
        )}
      </Button>
    </form>
  );
}
