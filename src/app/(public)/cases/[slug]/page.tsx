import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, AlertTriangle, CheckCircle2, Clock, Calendar, Gavel } from "lucide-react";
import { format } from "date-fns";
import { getCaseBySlug } from "@/lib/db/queries/cases";
import {
  CaseTimeline,
  CaseLawyers,
  CaseStats,
  CaseMediaReferences,
  CaseJsonLd,
} from "@/components/cases";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCaseOgImageUrl, getCaseCanonicalUrl, truncateForDescription } from "@/lib/utils/seo";

interface CaseDetailPageProps {
  params: Promise<{ slug: string }>;
}

const categoryLabels: Record<string, string> = {
  corruption: "Corruption",
  political: "Political",
  corporate: "Corporate",
  criminal: "Criminal",
  constitutional: "Constitutional",
  other: "Other",
};

const statusConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  ongoing: {
    label: "Ongoing",
    icon: <Clock className="size-4" />,
    color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  },
  concluded: {
    label: "Concluded",
    icon: <CheckCircle2 className="size-4" />,
    color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  },
  appeal: {
    label: "Under Appeal",
    icon: <AlertTriangle className="size-4" />,
    color: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  },
};

const outcomeLabels: Record<string, string> = {
  guilty: "Guilty",
  not_guilty: "Not Guilty",
  settled: "Settled",
  dismissed: "Dismissed",
  ongoing: "Ongoing",
  other: "Other",
};

export async function generateMetadata({
  params,
}: CaseDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const caseData = await getCaseBySlug(slug);

  if (!caseData) {
    return {
      title: "Case Not Found | LawKita",
    };
  }

  const title = `${caseData.title} | Famous Cases | LawKita`;
  const description = truncateForDescription(
    caseData.description ||
      `Explore the ${caseData.title} case. View timeline, involved lawyers, verdict, and detailed case information on LawKita.`
  );
  const ogImageUrl = getCaseOgImageUrl(slug);
  const canonicalUrl = getCaseCanonicalUrl(slug);

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      type: "article",
      url: canonicalUrl,
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: caseData.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImageUrl],
    },
  };
}

export default async function CaseDetailPage({ params }: CaseDetailPageProps) {
  const { slug } = await params;
  const caseData = await getCaseBySlug(slug);

  if (!caseData) {
    notFound();
  }

  const url = `${process.env.NEXT_PUBLIC_APP_URL || ""}/cases/${slug}`;
  const statusInfo = statusConfig[caseData.status];

  return (
    <>
      <CaseJsonLd caseData={caseData} url={url} />

      <div className="container mx-auto py-8 px-4">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Back link */}
          <Link
            href="/cases"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="size-4 mr-1" />
            All Cases
          </Link>

          {/* Header */}
          <header className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">
                {categoryLabels[caseData.category]}
              </Badge>
              <Badge variant="secondary" className={`gap-1 ${statusInfo.color}`}>
                {statusInfo.icon}
                {statusInfo.label}
              </Badge>
              {caseData.isFeatured && (
                <Badge variant="default">Featured</Badge>
              )}
            </div>

            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
              {caseData.title}
            </h1>

            {caseData.subtitle && (
              <p className="text-xl text-muted-foreground">{caseData.subtitle}</p>
            )}

            {/* Tags */}
            {caseData.tags && (caseData.tags as string[]).length > 0 && (
              <div className="flex flex-wrap gap-2">
                {(caseData.tags as string[]).map((tag) => (
                  <Badge key={tag} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </header>

          {/* Verdict Card (if concluded) */}
          {(caseData.status === "concluded" || caseData.status === "appeal") &&
            caseData.outcome && (
              <Card className="border-l-4 border-l-primary">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Gavel className="size-5" />
                    Verdict
                    {caseData.status === "appeal" && (
                      <Badge variant="secondary" className="ml-2">
                        Under Appeal
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-4">
                    <span className="text-2xl font-bold">
                      {outcomeLabels[caseData.outcome]}
                    </span>
                    {caseData.verdictDate && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Calendar className="size-4" />
                        <span>
                          {format(new Date(caseData.verdictDate), "d MMMM yyyy")}
                        </span>
                      </div>
                    )}
                  </div>
                  {caseData.verdictSummary && (
                    <p className="text-muted-foreground">{caseData.verdictSummary}</p>
                  )}
                </CardContent>
              </Card>
            )}

          {/* Description */}
          {caseData.description && (
            <Card>
              <CardHeader>
                <CardTitle>About This Case</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground whitespace-pre-line">
                  {caseData.description}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Stats */}
          <CaseStats caseData={caseData} />

          {/* Timeline */}
          <CaseTimeline events={caseData.timeline} />

          {/* Lawyers */}
          <CaseLawyers lawyers={caseData.lawyers} />

          {/* Media References */}
          <CaseMediaReferences references={caseData.mediaReferences} />

          {/* Disclaimer */}
          <Card className="bg-muted/50 border-dashed">
            <CardContent className="py-4">
              <p className="text-xs text-muted-foreground text-center">
                The information presented here is for educational purposes. Appearance
                in a case does not imply endorsement or assessment of a lawyer&apos;s
                capabilities. For legal advice, please consult directly with a
                qualified legal professional.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
