import type { CaseWithRelations } from "@/types/case";

interface CaseJsonLdProps {
  caseData: CaseWithRelations;
  url: string;
}

export function CaseJsonLd({ caseData, url }: CaseJsonLdProps) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: caseData.title,
    ...(caseData.subtitle && { alternativeHeadline: caseData.subtitle }),
    ...(caseData.description && { description: caseData.description }),
    url,
    ...(caseData.ogImage && { image: caseData.ogImage }),
    datePublished: caseData.createdAt.toISOString(),
    dateModified: caseData.updatedAt.toISOString(),
    articleSection: "Legal Cases",
    keywords: caseData.tags?.join(", "),
    publisher: {
      "@type": "Organization",
      name: "LawKita",
      url: process.env.NEXT_PUBLIC_APP_URL || "https://lawkita.my",
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url,
    },
    ...(caseData.lawyers.length > 0 && {
      mentions: caseData.lawyers.map((l) => ({
        "@type": "Person",
        name: l.lawyer.name,
        jobTitle: "Lawyer",
        url: `${process.env.NEXT_PUBLIC_APP_URL || ""}/lawyers/${l.lawyer.slug}`,
      })),
    }),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
