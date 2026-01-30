import { Metadata } from "next";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { AuthCard, ForgotPasswordForm } from "@/components/auth";

export const metadata: Metadata = {
  title: "Forgot Password | LawKita",
  description: "Reset your LawKita account password.",
};

interface ForgotPasswordPageProps {
  searchParams: Promise<{ callbackUrl?: string }>;
}

export default async function ForgotPasswordPage({ searchParams }: ForgotPasswordPageProps) {
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
      title="Reset your password"
      description="We'll send you a link to reset your password"
    >
      <ForgotPasswordForm />
    </AuthCard>
  );
}
