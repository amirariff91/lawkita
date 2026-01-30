import { Metadata } from "next";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { AuthCard, SocialAuthButtons, SignUpForm } from "@/components/auth";

export const metadata: Metadata = {
  title: "Create Account | LawKita",
  description: "Create a LawKita account to claim your lawyer profile and manage enquiries.",
};

interface SignUpPageProps {
  searchParams: Promise<{ callbackUrl?: string }>;
}

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
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
      title="Create an account"
      description="Get started with LawKita"
    >
      <div className="space-y-6">
        <SocialAuthButtons callbackURL={callbackUrl || "/dashboard"} />
        <SignUpForm />
      </div>
    </AuthCard>
  );
}
