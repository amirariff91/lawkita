import { Metadata } from "next";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { AuthCard, ResetPasswordForm } from "@/components/auth";

export const metadata: Metadata = {
  title: "Reset Password | LawKita",
  description: "Set a new password for your LawKita account.",
};

interface ResetPasswordPageProps {
  searchParams: Promise<{ callbackUrl?: string }>;
}

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const { callbackUrl } = await searchParams;

  // Redirect authenticated users
  if (session?.user) {
    redirect(callbackUrl || "/dashboard");
  }

  return (
    <AuthCard
      title="Set new password"
      description="Enter your new password below"
    >
      <ResetPasswordForm />
    </AuthCard>
  );
}
