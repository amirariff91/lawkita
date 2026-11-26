import { safeHttpUrl } from "@/lib/utils/json-ld";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getFirmBySlug } from "@/lib/db/queries/firms";
import { LawyerGrid } from "@/components/lawyers";
import { FirmJsonLd } from "@/components/firms";
import { Breadcrumbs } from "@/components/seo";
import { formatFirmName } from "@/lib/utils/name-format";
import {
  getFirmCanonicalUrl,
  getFirmMetaDescription,
  getFirmMetaTitle,
} from "@/lib/utils/seo";
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
      title: "Firm Not Found",
    };
  }

  const displayName = formatFirmName(firm.name);
  const title = getFirmMetaTitle(displayName, firm.city, firm.state);
  const description = getFirmMetaDescription({
    name: displayName,
    city: firm.city,
    state: firm.state,
    address: firm.address,
    phone: firm.phone,
    lawyerCount: firm.lawyerCount,
    practiceAreas: firm.practiceAreas,
  });
  const canonicalUrl = getFirmCanonicalUrl(slug);

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      type: "website",
      url: canonicalUrl,
      siteName: "LawKita",
      locale: "en_MY",
      ...(safeHttpUrl(firm.logo) && {
        images: [{ url: safeHttpUrl(firm.logo)!, alt: `${displayName} logo` }],
      }),
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

  const isClaimed = firm.isClaimed ?? false;
  // Only absolute http(s) URLs are ever rendered as a link or image source.
  const logoUrl = safeHttpUrl(firm.logo);
  const websiteUrl = safeHttpUrl(firm.website);
  const isPremium = firm.subscriptionTier === "firm_premium";
  const location = [firm.city, firm.state].filter(Boolean).join(", ");
  const displayName = formatFirmName(firm.name);

  return (
    <>
      <FirmJsonLd firm={firm} />
      <div className="container mx-auto py-8 px-4">
        <Breadcrumbs
          items={[
            { label: "Firms", href: "/firms" },
            { label: displayName, href: `/firms/${firm.slug}` },
          ]}
        />
        <div className="max-w-5xl mx-auto space-y-8">
          {/* Header */}
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              {logoUrl ? (
                // A light or white logo needs a dark backdrop to stay visible.
                <div
                  className={`flex h-16 w-24 shrink-0 items-center justify-center rounded-lg border p-2 ${firm.logoIsLight ? "bg-[#112238]" : "bg-white"}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={logoUrl}
                    alt={`${displayName} logo`}
                    className="max-h-full max-w-full object-contain"
                    loading="eager"
                  />
                </div>
              ) : (
                <div className={`p-3 rounded-lg ${isPremium ? "bg-amber-100 dark:bg-amber-900/30" : "bg-primary/10"}`}>
                  <Building2 className={`size-8 ${isPremium ? "text-amber-600" : "text-primary"}`} />
                </div>
              )}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-3xl font-bold">{displayName}</h1>
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
            {!isClaimed && firm.id && (
              <Button asChild>
                <Link href={`/claim-firm/${firm.id}`}>
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
            {websiteUrl && (
              <a
                href={websiteUrl}
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

        {/* Firm details from public directories and the firm's own website */}
        {(firm.foundedYear ||
          firm.openingHours ||
          (firm.languages?.length ?? 0) > 0 ||
          (firm.legalNetworks?.length ?? 0) > 0 ||
          (firm.bankPanels?.length ?? 0) > 0) && (
          <div className="space-y-3">
            <h2 className="text-xl font-semibold">About the firm</h2>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              {firm.foundedYear && (
                <div>
                  <dt className="text-muted-foreground">Founded</dt>
                  <dd>{firm.foundedYear}</dd>
                </div>
              )}
              {firm.openingHours && (
                <div>
                  <dt className="text-muted-foreground">Opening hours</dt>
                  <dd>{firm.openingHours}</dd>
                </div>
              )}
              {(firm.languages?.length ?? 0) > 0 && (
                <div>
                  <dt className="text-muted-foreground">Languages</dt>
                  <dd>{firm.languages!.join(", ")}</dd>
                </div>
              )}
              {(firm.legalNetworks?.length ?? 0) > 0 && (
                <div>
                  <dt className="text-muted-foreground">Legal networks</dt>
                  <dd>{firm.legalNetworks!.join(", ")}</dd>
                </div>
              )}
              {(firm.bankPanels?.length ?? 0) > 0 && (
                <div className="sm:col-span-2">
                  <dt className="text-muted-foreground">
                    Bank panels (self-declared on the firm&apos;s website)
                  </dt>
                  <dd>{firm.bankPanels!.join(", ")}</dd>
                </div>
              )}
            </dl>
          </div>
        )}

        {(firm.rankings?.length ?? 0) > 0 && (
          <div className="space-y-3">
            <h2 className="text-xl font-semibold">Published rankings</h2>
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {firm.rankings!.map((ranking) => (
                <li key={ranking}>{ranking}</li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground">
              As published by the named legal guide. LawKita does not rank firms.
            </p>
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
