import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Search,
  Scale,
  Gavel,
  Users,
  Shield,
  Star,
  ArrowRight,
  CheckCircle2,
  Building2,
  MapPin,
  BadgeCheck,
} from "lucide-react";
import { HeroSection } from "@/components/home/hero-section";
import { StatsSection } from "@/components/home/stats-section";
import { FeaturedLawyers } from "@/components/home/featured-lawyers";

export const metadata: Metadata = {
  title: "LawKita - Find the Right Lawyer in Malaysia",
  description:
    "Search 1,900+ verified Malaysian lawyers by location, practice area, and ratings. Read reviews, compare experience, and find legal help today.",
  alternates: {
    canonical: process.env.NEXT_PUBLIC_APP_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: "LawKita - Find the Right Lawyer in Malaysia",
    description:
      "Search 1,900+ verified Malaysian lawyers by location, practice area, and ratings. Read reviews, compare experience, and find legal help today.",
  },
};

export default function HomePage() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <HeroSection />

      {/* Social Proof / Stats Section */}
      <StatsSection />

      {/* Featured Lawyers Section */}
      <Suspense fallback={<FeaturedLawyersSkeleton />}>
        <FeaturedLawyers />
      </Suspense>

      {/* How It Works Section */}
      <section className="py-20 md:py-28">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <h2 className="font-heading text-3xl tracking-tight text-balance md:text-4xl">
              How LawKita Works
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Find the right legal professional in three simple steps
            </p>
          </div>

          <div className="relative mx-auto max-w-5xl">
            {/* Connecting line (hidden on mobile) */}
            <div
              className="absolute top-12 left-[16.67%] right-[16.67%] h-0.5 bg-gradient-to-r from-primary/20 via-primary to-primary/20 hidden md:block"
              aria-hidden="true"
            />

            <div className="grid md:grid-cols-3 gap-8 md:gap-12">
              {/* Step 1 */}
              <div className="relative text-center">
                <div className="relative z-10 mx-auto mb-6 flex size-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/25">
                  <Search className="size-7" aria-hidden="true" />
                </div>
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary md:hidden">
                  Step 1
                </div>
                <h3 className="text-xl font-semibold">Search</h3>
                <p className="mt-2 text-muted-foreground">
                  Browse by practice area, location, or explore lawyers involved
                  in famous Malaysian cases.
                </p>
              </div>

              {/* Step 2 */}
              <div className="relative text-center">
                <div className="relative z-10 mx-auto mb-6 flex size-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/25">
                  <Scale className="size-7" aria-hidden="true" />
                </div>
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary md:hidden">
                  Step 2
                </div>
                <h3 className="text-xl font-semibold">Compare</h3>
                <p className="mt-2 text-muted-foreground">
                  Review profiles, experience, case history, and verified client
                  reviews to make informed decisions.
                </p>
              </div>

              {/* Step 3 */}
              <div className="relative text-center">
                <div className="relative z-10 mx-auto mb-6 flex size-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/25">
                  <Users className="size-7" aria-hidden="true" />
                </div>
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary md:hidden">
                  Step 3
                </div>
                <h3 className="text-xl font-semibold">Connect</h3>
                <p className="mt-2 text-muted-foreground">
                  Send enquiries directly to lawyers and get responses within 24
                  hours on average.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 md:py-28 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <span className="inline-flex items-center rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary mb-4">
              Why LawKita
            </span>
            <h2 className="font-heading text-3xl tracking-tight text-balance md:text-4xl">
              The Most Trusted Legal Directory in Malaysia
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Built with transparency, verified data, and user trust at its core
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
            <Card variant="interactive" className="group">
              <CardHeader>
                <div className="size-14 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-4 transition-transform group-hover:scale-110">
                  <Shield className="size-7 text-primary" aria-hidden="true" />
                </div>
                <CardTitle className="text-xl">Verified Profiles</CardTitle>
                <CardDescription className="text-base">
                  All profiles are cross-verified against the Malaysian Bar
                  Council directory. Look for the{" "}
                  <BadgeCheck className="inline size-4 text-blue-500" /> badge.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card variant="interactive" className="group">
              <CardHeader>
                <div className="size-14 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-4 transition-transform group-hover:scale-110">
                  <Gavel className="size-7 text-primary" aria-hidden="true" />
                </div>
                <CardTitle className="text-xl">Famous Cases Explorer</CardTitle>
                <CardDescription className="text-base">
                  Discover lawyers through their involvement in high-profile
                  Malaysian cases with detailed timelines and outcomes.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card variant="interactive" className="group">
              <CardHeader>
                <div className="size-14 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-4 transition-transform group-hover:scale-110">
                  <Star className="size-7 text-primary" aria-hidden="true" />
                </div>
                <CardTitle className="text-xl">Verified Reviews</CardTitle>
                <CardDescription className="text-base">
                  Read authentic client reviews backed by invoice verification.
                  No fake reviews, just genuine experiences.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>

          {/* Trust indicators */}
          <div className="mt-16 flex flex-wrap items-center justify-center gap-8 text-muted-foreground">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-5 text-green-500" />
              <span className="text-sm">Bar Council Verified</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-5 text-green-500" />
              <span className="text-sm">Secure & Private</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-5 text-green-500" />
              <span className="text-sm">Free to Use</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-5 text-green-500" />
              <span className="text-sm">No Hidden Fees</span>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section - For Lawyers */}
      <section className="py-20 md:py-28 bg-gradient-primary text-white relative overflow-hidden">
        {/* Background decoration */}
        <div
          className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.1),transparent_50%)]"
          aria-hidden="true"
        />
        <div
          className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(255,255,255,0.05),transparent_50%)]"
          aria-hidden="true"
        />

        <div className="container mx-auto px-4 relative">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mx-auto mb-8 flex size-16 items-center justify-center rounded-2xl bg-white/10 backdrop-blur">
              <Building2 className="size-8" aria-hidden="true" />
            </div>
            <h2 className="font-heading text-3xl tracking-tight text-balance md:text-4xl">
              Are You a Legal Professional?
            </h2>
            <p className="mt-6 text-lg text-white/80">
              Claim your profile to manage your information, respond to client
              enquiries, access analytics, and grow your practice with premium
              features.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="bg-white text-primary hover:bg-white/90 shadow-lg"
                asChild
              >
                <Link href="/claim">
                  Claim Your Profile
                  <ArrowRight className="ml-2 size-5" aria-hidden="true" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-white/30 text-white hover:bg-white/10 hover:text-white"
                asChild
              >
                <Link href="/pricing">View Premium Plans</Link>
              </Button>
            </div>

            {/* Benefits */}
            <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
              <div className="flex flex-col items-center gap-2">
                <div className="rounded-full bg-white/10 p-2">
                  <BadgeCheck className="size-5" />
                </div>
                <span className="text-white/80">Verified Badge</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="rounded-full bg-white/10 p-2">
                  <Users className="size-5" />
                </div>
                <span className="text-white/80">Lead Generation</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="rounded-full bg-white/10 p-2">
                  <Star className="size-5" />
                </div>
                <span className="text-white/80">Review Management</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="rounded-full bg-white/10 p-2">
                  <MapPin className="size-5" />
                </div>
                <span className="text-white/80">Featured Listings</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

// Skeleton for featured lawyers section
function FeaturedLawyersSkeleton() {
  return (
    <section className="py-20 md:py-28">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <div className="h-8 w-48 bg-muted animate-pulse rounded" />
          <div className="h-10 w-24 bg-muted animate-pulse rounded" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-xl border bg-card p-6 space-y-4">
              <div className="flex items-center gap-4">
                <div className="size-16 rounded-full bg-muted animate-pulse" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                  <div className="h-3 w-20 bg-muted animate-pulse rounded" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-3 w-full bg-muted animate-pulse rounded" />
                <div className="h-3 w-3/4 bg-muted animate-pulse rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
