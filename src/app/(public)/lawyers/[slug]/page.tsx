import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getLawyerBySlug, getSimilarLawyers } from "@/lib/db/queries/lawyers";
import { getLawyerFirmHistory } from "@/lib/db/queries/firms";
import {
  ProfileHeader,
  AboutSection,
  PracticeAreasSection,
  EducationSection,
  MetricsSection,
  ReviewsSection,
  CasesSection,
  LawyerJsonLd,
  ClaimProfileCard,
  CompletenessIndicator,
  SimilarLawyers,
  FirmHistory,
} from "@/components/lawyers/profile";
import { EnquiryForm } from "@/components/lawyers/enquiry-form";
import { Breadcrumbs } from "@/components/seo";
import {
  getLawyerOgImageUrl,
  getLawyerCanonicalUrl,
  getLawyerMetaTitle,
  getLawyerMetaDescription,
} from "@/lib/utils/seo";

interface LawyerProfilePageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: LawyerProfilePageProps): Promise<Metadata> {
  const { slug } = await params;
  const lawyer = await getLawyerBySlug(slug);

  if (!lawyer) {
    return {
      title: "Lawyer Not Found | LawKita",
    };
  }

  const practiceAreaNames = lawyer.practiceAreas.map((pa) => pa.practiceArea.name);
  const title = getLawyerMetaTitle(lawyer.name, lawyer.firmName, lawyer.city);
  const description = getLawyerMetaDescription(
    lawyer.name,
    lawyer.bio,
    lawyer.city,
    lawyer.state,
    practiceAreaNames
  );
  const ogImageUrl = getLawyerOgImageUrl(slug);
  const canonicalUrl = getLawyerCanonicalUrl(slug);

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      type: "profile",
      url: canonicalUrl,
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: `${lawyer.name} - Lawyer Profile`,
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

export default async function LawyerProfilePage({
  params,
}: LawyerProfilePageProps) {
  const { slug } = await params;
  const [lawyer, similarLawyers] = await Promise.all([
    getLawyerBySlug(slug),
    getSimilarLawyers(slug, 4),
  ]);

  // Fetch firm history after we have the lawyer
  const firmHistory = lawyer ? await getLawyerFirmHistory(lawyer.id) : [];

  if (!lawyer) {
    notFound();
  }

  const url = `${process.env.NEXT_PUBLIC_APP_URL || ""}/lawyers/${slug}`;

  return (
    <>
      <LawyerJsonLd lawyer={lawyer} url={url} />

      <div className="container mx-auto py-8 px-4">
        <Breadcrumbs
          items={[
            { label: "Lawyers", href: "/lawyers" },
            { label: lawyer.name, href: `/lawyers/${slug}` },
          ]}
        />
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Profile Header */}
          <ProfileHeader lawyer={lawyer} />

          {/* Metrics */}
          <MetricsSection lawyer={lawyer} />

          {/* Enquiry Form */}
          <EnquiryForm lawyerId={lawyer.id} lawyerName={lawyer.name} />

          {/* About */}
          <AboutSection bio={lawyer.bio} />

          {/* Firm History */}
          <FirmHistory history={firmHistory} />

          {/* Practice Areas */}
          <PracticeAreasSection practiceAreas={lawyer.practiceAreas} />

          {/* Education & Qualifications */}
          <EducationSection
            education={lawyer.education}
            qualifications={lawyer.qualifications}
          />

          {/* Notable Cases */}
          <CasesSection cases={lawyer.cases} />

          {/* Reviews */}
          <ReviewsSection
            reviews={lawyer.reviews}
            averageRating={lawyer.averageRating}
            reviewCount={lawyer.reviewCount ?? 0}
            lawyerSlug={slug}
          />

          {/* Similar Lawyers */}
          <SimilarLawyers lawyers={similarLawyers} currentLawyerName={lawyer.name} />

          {/* Profile Completeness (for unclaimed profiles) */}
          {!lawyer.isClaimed && (
            <div className="rounded-lg border bg-card p-6">
              <CompletenessIndicator lawyer={lawyer} showDetails />
            </div>
          )}

          {/* Claim Profile CTA (for unclaimed profiles) */}
          {!lawyer.isClaimed && (
            <ClaimProfileCard lawyerId={lawyer.id} lawyerName={lawyer.name} />
          )}
        </div>
      </div>
    </>
  );
}
