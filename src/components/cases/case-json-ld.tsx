import type { CaseWithRelations, LawyerRole } from "@/types/case";

interface CaseJsonLdProps {
  caseData: CaseWithRelations;
  url: string;
}

// Map lawyer roles to job titles for structured data
const roleJobTitles: Record<LawyerRole, string> = {
  prosecution: "Prosecuting Attorney",
  defense: "Defense Attorney",
  judge: "Judge",
  other: "Legal Counsel",
};

export function CaseJsonLd({ caseData, url }: CaseJsonLdProps) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://lawkita.my";

  // Article schema (for editorial content)
  const articleSchema = {
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
      url: baseUrl,
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url,
    },
    ...(caseData.lawyers.length > 0 && {
      mentions: caseData.lawyers.map((l) => ({
        "@type": "Person",
        name: l.lawyer.name,
        jobTitle: roleJobTitles[l.role],
        url: `${baseUrl}/lawyers/${l.lawyer.slug}`,
      })),
    }),
  };

  // LegalCase schema (for structured legal case data)
  const legalCaseSchema = {
    "@context": "https://schema.org",
    "@type": "LegalCase",
    name: caseData.title,
    ...(caseData.caseNumber && { identifier: caseData.caseNumber }),
    ...(caseData.citation && { caseNumber: caseData.citation }),
    ...(caseData.description && { description: caseData.description }),
    ...(caseData.court && {
      court: {
        "@type": "Organization",
        name: caseData.court,
      },
    }),
    ...(caseData.verdictDate && {
      dateVerdictRendered: caseData.verdictDate.toISOString().split("T")[0],
    }),
    ...(caseData.lawyers.length > 0 && {
      participant: caseData.lawyers.map((l) => ({
        "@type": "Person",
        name: l.lawyer.name,
        jobTitle: roleJobTitles[l.role],
        url: `${baseUrl}/lawyers/${l.lawyer.slug}`,
        ...(l.lawyer.photo && { image: l.lawyer.photo }),
      })),
    }),
    url,
    mainEntityOfPage: url,
  };

  // Combine both schemas using @graph
  const combinedSchema = {
    "@context": "https://schema.org",
    "@graph": [articleSchema, legalCaseSchema],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(combinedSchema) }}
    />
  );
}
