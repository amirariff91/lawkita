import { safeHttpUrl } from "@/lib/utils/json-ld";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import {
  getFirmBySlug,
  getFirmLawyerReviews,
  getNearbyFirms,
  type FirmLawyerReview,
  type NearbyFirm,
} from "@/lib/db/queries/firms";
import { LawyerGrid } from "@/components/lawyers";
import { FirmJsonLd } from "@/components/firms";
import { Breadcrumbs } from "@/components/seo";
import { formatFirmName, formatPersonName } from "@/lib/utils/name-format";
import {
  buildFirmAbout,
  firmPlaceLabel,
  locationHubHref,
  practiceAreaHref,
  resolveFirmPlace,
} from "@/lib/utils/firm-about";
import {
  directionsHref,
  formatFirmAddress,
  telHref,
  whatsappHref,
} from "@/lib/utils/firm-contact";
import {
  getFirmCanonicalUrl,
  getFirmMetaDescription,
  getFirmMetaTitle, DEFAULT_OG_IMAGES } from "@/lib/utils/seo";
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
  MessageCircle,
  Navigation,
  Printer,
  Star,
} from "lucide-react";

interface FirmProfilePageProps {
  params: Promise<{ slug: string }>;
}

const REVIEW_EXCERPT_LENGTH = 220;

function excerpt(text: string, max = REVIEW_EXCERPT_LENGTH): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s,.;:]+$/, "")}…`;
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
      images: safeHttpUrl(firm.logo)
        ? [{ url: safeHttpUrl(firm.logo)!, alt: `${displayName} logo` }]
        : DEFAULT_OG_IMAGES,
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

  // Two more queries, in parallel. A failure in either hides its section
  // instead of failing the page.
  const [nearby, reviews] = await Promise.all([
    getNearbyFirms(firm).catch((error: unknown) => {
      console.error("firm page: nearby firms failed", error);
      return { scope: "state" as const, firms: [] as NearbyFirm[] };
    }),
    getFirmLawyerReviews(firm.id).catch((error: unknown) => {
      console.error("firm page: reviews failed", error);
      return [] as FirmLawyerReview[];
    }),
  ]);

  const isClaimed = firm.isClaimed ?? false;
  // Only absolute http(s) URLs are ever rendered as a link or image source.
  const logoUrl = safeHttpUrl(firm.logo);
  const websiteUrl = safeHttpUrl(firm.website);
  const isPremium = firm.subscriptionTier === "firm_premium";
  const location = firmPlaceLabel(firm.city, firm.state);
  const displayName = formatFirmName(firm.name);
  const place = resolveFirmPlace(firm.state, firm.city);

  const aboutParts = buildFirmAbout({
    name: displayName,
    city: firm.city,
    state: firm.state,
    foundedYear: firm.foundedYear,
    lawyerCount: firm.lawyerCount,
    avgYearsExperience: firm.avgYearsExperience,
    earliestAdmissionYear: firm.earliestAdmissionYear,
    practiceAreas: firm.practiceAreas,
    languages: firm.languages,
    legalNetworks: firm.legalNetworks,
    lawyerCredentials: firm.lawyerCredentials,
    place,
  });

  const fullAddress = formatFirmAddress(firm);
  const phoneHref = telHref(firm.phone);
  const whatsappUrl = whatsappHref(firm.whatsapp);
  const mapUrl = directionsHref(firm.latitude, firm.longitude);
  const hasContact = Boolean(
    fullAddress ||
      firm.phone ||
      firm.fax ||
      firm.email ||
      websiteUrl ||
      whatsappUrl ||
      firm.openingHours ||
      mapUrl
  );

  const practiceAreaBadges = firm.practiceAreaLinks.map((area) => ({
    name: area.name,
    href: practiceAreaHref(area, place),
  }));

  const nearbyPlace =
    nearby.scope === "city" ? firm.city?.trim() || firm.state : firm.state || firm.city;
  const cityHubHref = locationHubHref(place, "city");
  const stateHubHref = locationHubHref(place, "state");

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
          </div>

          {/* About: generated from the stored fields only */}
          <section className="space-y-3" aria-labelledby="firm-about">
            <h2 id="firm-about" className="text-xl font-semibold">
              About {displayName}
            </h2>
            <p className="leading-relaxed text-muted-foreground">
              {aboutParts.map((part, index) =>
                part.href ? (
                  <Link key={index} href={part.href} className="text-primary hover:underline">
                    {part.text}
                  </Link>
                ) : (
                  <span key={index}>{part.text}</span>
                )
              )}
            </p>
          </section>

          {/* Contact */}
          {hasContact && (
            <section className="space-y-3" aria-labelledby="firm-contact">
              <h2 id="firm-contact" className="text-xl font-semibold">
                Contact {displayName}
              </h2>
              <Card>
                <CardContent className="p-4">
                  <dl className="grid gap-4 text-sm sm:grid-cols-2">
                    {fullAddress && (
                      <div className="sm:col-span-2">
                        <dt className="flex items-center gap-1 text-muted-foreground">
                          <MapPin className="size-4" />
                          Address
                        </dt>
                        <dd className="mt-1">
                          <address className="not-italic">{fullAddress}</address>
                          {mapUrl && (
                            <a
                              href={mapUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-1 inline-flex items-center gap-1 text-primary hover:underline"
                            >
                              <Navigation className="size-4" />
                              Get directions
                            </a>
                          )}
                        </dd>
                      </div>
                    )}
                    {!fullAddress && mapUrl && (
                      <div className="sm:col-span-2">
                        <dt className="flex items-center gap-1 text-muted-foreground">
                          <MapPin className="size-4" />
                          Location
                        </dt>
                        <dd className="mt-1">
                          <a
                            href={mapUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-primary hover:underline"
                          >
                            <Navigation className="size-4" />
                            Get directions
                          </a>
                        </dd>
                      </div>
                    )}
                    {firm.phone && (
                      <div>
                        <dt className="flex items-center gap-1 text-muted-foreground">
                          <Phone className="size-4" />
                          Phone
                        </dt>
                        <dd className="mt-1">
                          {phoneHref ? (
                            <a href={phoneHref} className="hover:underline">
                              {firm.phone}
                            </a>
                          ) : (
                            firm.phone
                          )}
                        </dd>
                      </div>
                    )}
                    {firm.fax && (
                      <div>
                        <dt className="flex items-center gap-1 text-muted-foreground">
                          <Printer className="size-4" />
                          Fax
                        </dt>
                        <dd className="mt-1">{firm.fax}</dd>
                      </div>
                    )}
                    {firm.email && (
                      <div>
                        <dt className="flex items-center gap-1 text-muted-foreground">
                          <Mail className="size-4" />
                          Email
                        </dt>
                        <dd className="mt-1 break-all">
                          <a href={`mailto:${firm.email}`} className="hover:underline">
                            {firm.email}
                          </a>
                        </dd>
                      </div>
                    )}
                    {websiteUrl && (
                      <div>
                        <dt className="flex items-center gap-1 text-muted-foreground">
                          <Globe className="size-4" />
                          Website
                        </dt>
                        <dd className="mt-1 break-all">
                          <a
                            href={websiteUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline"
                          >
                            {new URL(websiteUrl).hostname.replace(/^www\./, "")}
                          </a>
                        </dd>
                      </div>
                    )}
                    {whatsappUrl && (
                      <div>
                        <dt className="flex items-center gap-1 text-muted-foreground">
                          <MessageCircle className="size-4" />
                          WhatsApp
                        </dt>
                        <dd className="mt-1">
                          <a
                            href={whatsappUrl}
                            target="_blank"
                            rel="noopener noreferrer nofollow"
                            className="hover:underline"
                          >
                            {firm.whatsapp}
                          </a>
                        </dd>
                      </div>
                    )}
                    {firm.openingHours && (
                      <div>
                        <dt className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="size-4" />
                          Opening hours
                        </dt>
                        <dd className="mt-1">{firm.openingHours}</dd>
                      </div>
                    )}
                  </dl>
                </CardContent>
              </Card>
            </section>
          )}

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

          {/* Practice Areas: each links to its hub when one exists */}
          {practiceAreaBadges.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xl font-semibold">Practice Areas</h2>
              <div className="flex flex-wrap gap-2">
                {practiceAreaBadges.map((area) =>
                  area.href ? (
                    <Badge key={area.name} variant="secondary" asChild>
                      <Link href={area.href}>{area.name}</Link>
                    </Badge>
                  ) : (
                    <Badge key={area.name} variant="secondary">
                      {area.name}
                    </Badge>
                  )
                )}
              </div>
            </div>
          )}

          {/* Firm details from public directories and the firm's own website */}
          {(firm.foundedYear ||
            (firm.languages?.length ?? 0) > 0 ||
            (firm.legalNetworks?.length ?? 0) > 0 ||
            (firm.bankPanels?.length ?? 0) > 0) && (
            <div className="space-y-3">
              <h2 className="text-xl font-semibold">Firm details</h2>
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                {firm.foundedYear && (
                  <div>
                    <dt className="text-muted-foreground">Founded</dt>
                    <dd>{firm.foundedYear}</dd>
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
              Lawyers at {displayName} ({firm.lawyerCount})
            </h2>
            {firm.lawyers.length > 0 ? (
              <LawyerGrid lawyers={firm.lawyers} />
            ) : (
              <p className="text-muted-foreground">
                No lawyers listed for this firm yet.
              </p>
            )}
          </div>

          {/* Reviews of individual lawyers: only published ones, no firm rating */}
          {reviews.length > 0 && (
            <section className="space-y-4" aria-labelledby="firm-reviews">
              <h2 id="firm-reviews" className="text-xl font-semibold">
                Reviews of lawyers at {displayName}
              </h2>
              <ul className="space-y-3">
                {reviews.map((review) => {
                  const rating = Math.max(0, Math.min(5, Math.round(review.rating)));
                  const body = review.content?.trim() || review.title?.trim() || "";
                  return (
                    <li key={review.id}>
                      <Card>
                        <CardContent className="p-4 space-y-2">
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                            <span
                              className="flex items-center gap-0.5"
                              aria-label={`Rated ${rating} out of 5`}
                            >
                              {Array.from({ length: 5 }, (_, i) => (
                                <Star
                                  key={i}
                                  aria-hidden="true"
                                  className={`size-4 ${i < rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"}`}
                                />
                              ))}
                            </span>
                            <span className="text-muted-foreground">
                              Review of{" "}
                              <Link
                                href={`/lawyers/${review.lawyerSlug}`}
                                className="text-primary hover:underline"
                              >
                                {formatPersonName(review.lawyerName)}
                              </Link>
                            </span>
                          </div>
                          {review.title?.trim() && review.content?.trim() && (
                            <p className="font-medium">{review.title.trim()}</p>
                          )}
                          {body && (
                            <p className="text-sm text-muted-foreground">{excerpt(body)}</p>
                          )}
                        </CardContent>
                      </Card>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {/* Other firms nearby */}
          {nearby.firms.length > 0 && nearbyPlace && (
            <section className="space-y-3" aria-labelledby="firm-nearby">
              <h2 id="firm-nearby" className="text-xl font-semibold">
                Other law firms in {nearbyPlace}
              </h2>
              <ul className="grid gap-2 sm:grid-cols-2">
                {nearby.firms.map((other) => (
                  <li key={other.id}>
                    <Link
                      href={`/firms/${other.slug}`}
                      className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm hover:bg-muted/50"
                    >
                      <span className="font-medium">{formatFirmName(other.name)}</span>
                      <span className="shrink-0 text-muted-foreground">
                        {other.lawyerCount} {other.lawyerCount === 1 ? "lawyer" : "lawyers"}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Up the hierarchy: location hubs */}
          {(cityHubHref || stateHubHref) && (
            <section className="space-y-3" aria-labelledby="firm-browse">
              <h2 id="firm-browse" className="text-xl font-semibold">
                Find more lawyers
              </h2>
              <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                {cityHubHref && place.city && (
                  <li>
                    <Link href={cityHubHref} className="text-primary hover:underline">
                      Lawyers in {place.city.name}
                    </Link>
                  </li>
                )}
                {stateHubHref && place.state && (
                  <li>
                    <Link href={stateHubHref} className="text-primary hover:underline">
                      Lawyers in {place.state.name}
                    </Link>
                  </li>
                )}
                <li>
                  <Link href="/firms" className="text-primary hover:underline">
                    All law firms
                  </Link>
                </li>
              </ul>
            </section>
          )}
        </div>
      </div>
    </>
  );
}
