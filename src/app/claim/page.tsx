import Link from "next/link";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Claim Your Profile",
  description:
    "Lawyers and law firms listed on LawKita can claim their profile to keep it accurate and receive enquiries.",
  // A signpost page: the claim itself happens from a profile.
  robots: { index: false, follow: true },
};

export default function ClaimIndexPage() {
  return (
    <div className="container mx-auto max-w-2xl py-16 px-4 space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Claim your profile</h1>
      <p className="text-muted-foreground">
        Most practising lawyers and law firms in Malaysia already have a profile on LawKita.
        Find yours, open it, and use the claim button on the page. Claiming lets you correct your
        details and receive enquiries.
      </p>
      <ol className="list-decimal space-y-2 pl-5">
        <li>Search for your name or your firm.</li>
        <li>Open your profile.</li>
        <li>Choose &ldquo;Claim This Profile&rdquo; and confirm you are the lawyer or the firm.</li>
      </ol>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button asChild size="lg">
          <Link href="/lawyers">Find my lawyer profile</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/firms">Find my firm</Link>
        </Button>
      </div>
    </div>
  );
}
