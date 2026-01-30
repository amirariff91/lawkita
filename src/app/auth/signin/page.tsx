import { Metadata } from "next";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { AuthCard, SocialAuthButtons, SignInForm } from "@/components/auth";

export const metadata: Metadata = {
  title: "Sign In | LawKita",
  description: "Sign in to your LawKita account to manage your lawyer profile and enquiries.",
};

interface SignInPageProps {
  searchParams: Promise<{ callbackUrl?: string }>;
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
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
      title="Welcome back"
      description="Sign in to your LawKita account"
    >
      <div className="space-y-6">
        <SocialAuthButtons callbackURL={callbackUrl || "/dashboard"} />
        <SignInForm />
      </div>
    </AuthCard>
  );
}
