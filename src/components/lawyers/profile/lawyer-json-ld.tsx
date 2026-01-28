import type { LawyerWithRelations } from "@/types/lawyer";

interface LawyerJsonLdProps {
  lawyer: LawyerWithRelations;
  url: string;
}

export function LawyerJsonLd({ lawyer, url }: LawyerJsonLdProps) {
  const rating = lawyer.averageRating
    ? parseFloat(lawyer.averageRating)
    : null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Attorney",
    name: lawyer.name,
    url,
    ...(lawyer.photo && { image: lawyer.photo }),
    ...(lawyer.bio && { description: lawyer.bio }),
    ...(lawyer.email && { email: lawyer.email }),
    ...(lawyer.phone && { telephone: lawyer.phone }),
    ...(lawyer.firmName && {
      worksFor: {
        "@type": "LegalService",
        name: lawyer.firmName,
      },
    }),
    ...(lawyer.state && {
      address: {
        "@type": "PostalAddress",
        addressLocality: lawyer.city || undefined,
        addressRegion: lawyer.state,
        addressCountry: "MY",
      },
    }),
    ...(lawyer.practiceAreas.length > 0 && {
      knowsAbout: lawyer.practiceAreas.map((pa) => pa.practiceArea.name),
    }),
    ...(rating !== null &&
      (lawyer.reviewCount ?? 0) > 0 && {
        aggregateRating: {
          "@type": "AggregateRating",
          ratingValue: rating.toFixed(1),
          reviewCount: lawyer.reviewCount,
          bestRating: 5,
          worstRating: 1,
        },
      }),
    ...(lawyer.reviews.length > 0 && {
      review: lawyer.reviews.slice(0, 5).map((review) => ({
        "@type": "Review",
        author: {
          "@type": "Person",
          name: review.reviewerName || "Anonymous",
        },
        reviewRating: {
          "@type": "Rating",
          ratingValue: review.overallRating,
          bestRating: 5,
          worstRating: 1,
        },
        ...(review.content && { reviewBody: review.content }),
        datePublished: review.createdAt.toISOString(),
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
