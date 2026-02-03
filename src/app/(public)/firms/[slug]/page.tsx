import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getFirmBySlug } from "@/lib/db/queries/firms";
import { createServerSupabaseClient } from "@/lib/supabase/client";
import { LawyerGrid } from "@/components/lawyers";
import { FirmJsonLd } from "@/components/firms";
import { Breadcrumbs } from "@/components/seo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  Globe,
  Users,
  Clock,
  Scale,
  Crown,
  UserPlus,
} from "lucide-react";

interface FirmProfilePageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: FirmProfilePageProps): Promise<Metadata> {
  const { slug } = await params;
  const firm = await getFirmBySlug(slug);

  if (!firm) {
    return {
      title: "Firm Not Found | LawKita",
    };
  }

  const location = [firm.city, firm.state].filter(Boolean).join(", ");
  const title = `${firm.name} | Law Firm in ${location || "Malaysia"} | LawKita`;
  const description = `${firm.name} is a law firm${location ? ` in ${location}` : ""} with ${firm.lawyerCount} lawyers. ${firm.practiceAreas.length > 0 ? `Practice areas include ${firm.practiceAreas.slice(0, 5).join(", ")}.` : ""}`;

  return {
    title,
    description,
    alternates: {
      canonical: `${process.env.NEXT_PUBLIC_APP_URL}/firms/${slug}`,
    },
    openGraph: {
      title,
      description,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function FirmProfilePage({
  params,
}: FirmProfilePageProps) {
  const { slug } = await params;
  const firm = await getFirmBySlug(slug);

  if (!firm) {
    notFound();
  }

  // Get firm claim status
  const supabase = createServerSupabaseClient();
  const { data: firmData } = await supabase
    .from("firms")
    .select("id, is_claimed, subscription_tier")
    .eq("slug", slug)
    .single();

  const isClaimed = firmData?.is_claimed ?? false;
  const isPremium = firmData?.subscription_tier === "firm_premium";
  const location = [firm.city, firm.state].filter(Boolean).join(", ");

  return (
    <>
      <FirmJsonLd firm={firm} />
      <div className="container mx-auto py-8 px-4">
        <Breadcrumbs
          items={[
            { label: "Firms", href: "/firms" },
            { label: firm.name, href: `/firms/${firm.slug}` },
          ]}
        />
        <div className="max-w-5xl mx-auto space-y-8">
          {/* Header */}
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-lg ${isPremium ? "bg-amber-100 dark:bg-amber-900/30" : "bg-primary/10"}`}>
                <Building2 className={`size-8 ${isPremium ? "text-amber-600" : "text-primary"}`} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-3xl font-bold">{firm.name}</h1>
                  {isPremium && (
                    <Badge className="bg-amber-500">
                      <Crown className="h-3 w-3 mr-1" />
                      Premium
                    </Badge>
                  )}
                </div>
                {location && (
                  <div className="flex items-center gap-2 text-muted-foreground mt-1">
                    <MapPin className="size-4" />
                    <span>{location}</span>
                  </div>
                )}
              </div>
            </div>
            {!isClaimed && firmData?.id && (
              <Button asChild>
                <Link href={`/claim-firm/${firmData.id}`}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Claim This Firm
                </Link>
              </Button>
            )}
          </div>

          {/* Contact Info */}
          <div className="flex flex-wrap gap-4">
            {firm.phone && (
              <a
                href={`tel:${firm.phone}`}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <Phone className="size-4" />
                {firm.phone}
              </a>
            )}
            {firm.email && (
              <a
                href={`mailto:${firm.email}`}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <Mail className="size-4" />
                {firm.email}
              </a>
            )}
            {firm.website && (
              <a
                href={firm.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <Globe className="size-4" />
                Website
              </a>
            )}
          </div>

          {/* Full Address */}
          {firm.address && (
            <p className="text-sm text-muted-foreground">{firm.address}</p>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <Users className="size-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{firm.lawyerCount}</p>
                  <p className="text-sm text-muted-foreground">
                    {firm.lawyerCount === 1 ? "Lawyer" : "Lawyers"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                  <Clock className="size-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {firm.avgYearsExperience !== null
                      ? firm.avgYearsExperience.toFixed(1)
                      : "—"}
                  </p>
                  <p className="text-sm text-muted-foreground">Avg. Years Experience</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                  <Scale className="size-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{firm.practiceAreas.length}</p>
                  <p className="text-sm text-muted-foreground">Practice Areas</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Practice Areas */}
        {firm.practiceAreas.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-xl font-semibold">Practice Areas</h2>
            <div className="flex flex-wrap gap-2">
              {firm.practiceAreas.map((area) => (
                <Badge key={area} variant="secondary">
                  {area}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Lawyers */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">
            Our Lawyers ({firm.lawyerCount})
          </h2>
          {firm.lawyers.length > 0 ? (
            <LawyerGrid lawyers={firm.lawyers} />
          ) : (
            <p className="text-muted-foreground">
              No lawyers listed for this firm yet.
            </p>
          )}
        </div>
        </div>
      </div>
    </>
  );
}
