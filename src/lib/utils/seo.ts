/**
 * SEO Utilities for generating OG images and metadata
 */

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://lawkita.my";

/**
 * Generate the URL for a lawyer's OG image
 */
export function getLawyerOgImageUrl(slug: string): string {
  return `${APP_URL}/api/og/lawyer/${slug}`;
}

/**
 * Generate the URL for a case's OG image
 */
export function getCaseOgImageUrl(slug: string): string {
  return `${APP_URL}/api/og/case/${slug}`;
}

/**
 * Generate canonical URL for a lawyer profile
 */
export function getLawyerCanonicalUrl(slug: string): string {
  return `${APP_URL}/lawyers/${slug}`;
}

/**
 * Generate canonical URL for a case
 */
export function getCaseCanonicalUrl(slug: string): string {
  return `${APP_URL}/cases/${slug}`;
}

/**
 * Generate canonical URL for a practice area
 */
export function getPracticeAreaCanonicalUrl(slug: string): string {
  return `${APP_URL}/lawyers/practice-area/${slug}`;
}

/**
 * Generate canonical URL for a state location page
 */
export function getStateCanonicalUrl(stateSlug: string): string {
  return `${APP_URL}/lawyers/location/${stateSlug}`;
}

/**
 * Generate canonical URL for a city location page
 */
export function getCityCanonicalUrl(stateSlug: string, citySlug: string): string {
  return `${APP_URL}/lawyers/location/${stateSlug}/${citySlug}`;
}

/**
 * Truncate text for meta descriptions (max 155 chars recommended)
 */
export function truncateForDescription(text: string, maxLength = 155): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3).trim() + "...";
}

/**
 * Generate a lawyer's meta title
 */
export function getLawyerMetaTitle(
  name: string,
  firmName?: string | null,
  city?: string | null
): string {
  const parts = [name];
  if (firmName) parts.push(firmName);
  if (city) parts.push(city);
  return `${parts.join(" - ")} | LawKita`;
}

/**
 * Generate a lawyer's meta description
 */
export function getLawyerMetaDescription(
  name: string,
  bio?: string | null,
  city?: string | null,
  state?: string | null,
  practiceAreas?: string[]
): string {
  if (bio) {
    return truncateForDescription(bio);
  }

  const locationParts = [city, state].filter(Boolean);
  const location = locationParts.length > 0 ? ` based in ${locationParts.join(", ")}` : "";
  const areas =
    practiceAreas && practiceAreas.length > 0
      ? ` specializing in ${practiceAreas.slice(0, 3).join(", ")}`
      : "";

  return truncateForDescription(
    `${name} is a lawyer${location}${areas}. View profile, experience, and reviews on LawKita.`
  );
}

// ============================================================================
// Schema.org Structured Data
// ============================================================================

interface LawyerSchemaData {
  name: string;
  slug: string;
  bio?: string | null;
  photo?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  firmName?: string | null;
  barMembershipNumber?: string | null;
  barAdmissionDate?: Date | null;
  yearsAtBar?: number | null;
  averageRating?: string | null;
  reviewCount?: number | null;
  practiceAreas?: string[];
}

/**
 * Generate Schema.org Attorney/LegalService structured data
 */
export function getLawyerSchema(lawyer: LawyerSchemaData): object {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Attorney",
    name: lawyer.name,
    url: getLawyerCanonicalUrl(lawyer.slug),
    identifier: lawyer.barMembershipNumber,
  };

  if (lawyer.bio) {
    schema.description = lawyer.bio;
  }

  if (lawyer.photo) {
    schema.image = lawyer.photo;
  }

  if (lawyer.email) {
    schema.email = lawyer.email;
  }

  if (lawyer.phone) {
    schema.telephone = lawyer.phone;
  }

  // Address
  if (lawyer.address || lawyer.city || lawyer.state) {
    schema.address = {
      "@type": "PostalAddress",
      streetAddress: lawyer.address,
      addressLocality: lawyer.city,
      addressRegion: lawyer.state,
      addressCountry: "MY",
    };
  }

  // Organization/Firm
  if (lawyer.firmName) {
    schema.worksFor = {
      "@type": "LegalService",
      name: lawyer.firmName,
    };
  }

  // Practice areas
  if (lawyer.practiceAreas && lawyer.practiceAreas.length > 0) {
    schema.knowsAbout = lawyer.practiceAreas;
  }

  // Aggregate rating
  if (lawyer.averageRating && lawyer.reviewCount && lawyer.reviewCount > 0) {
    schema.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: lawyer.averageRating,
      bestRating: "5",
      worstRating: "1",
      ratingCount: lawyer.reviewCount,
    };
  }

  // Member of Malaysian Bar
  schema.memberOf = {
    "@type": "Organization",
    name: "Malaysian Bar",
    url: "https://www.malaysianbar.org.my",
  };

  return schema;
}

interface ReviewSchemaData {
  lawyerName: string;
  lawyerSlug: string;
  reviewerName?: string | null;
  rating: number;
  content?: string | null;
  createdAt: Date;
}

/**
 * Generate Schema.org Review structured data
 */
export function getReviewSchema(review: ReviewSchemaData): object {
  return {
    "@context": "https://schema.org",
    "@type": "Review",
    itemReviewed: {
      "@type": "Attorney",
      name: review.lawyerName,
      url: getLawyerCanonicalUrl(review.lawyerSlug),
    },
    author: {
      "@type": "Person",
      name: review.reviewerName || "Anonymous",
    },
    reviewRating: {
      "@type": "Rating",
      ratingValue: review.rating,
      bestRating: "5",
      worstRating: "1",
    },
    reviewBody: review.content,
    datePublished: review.createdAt.toISOString(),
  };
}

/**
 * Generate Schema.org LegalService for location pages
 */
export function getLocationPageSchema(
  state: string,
  city?: string,
  lawyerCount: number = 0
): object {
  const location = city ? `${city}, ${state}` : state;

  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Lawyers in ${location}`,
    description: `Find verified lawyers in ${location}, Malaysia. Compare ${lawyerCount}+ legal professionals with reviews and ratings.`,
    url: city
      ? getCityCanonicalUrl(state.toLowerCase().replace(/\s+/g, "-"), city.toLowerCase().replace(/\s+/g, "-"))
      : getStateCanonicalUrl(state.toLowerCase().replace(/\s+/g, "-")),
    numberOfItems: lawyerCount,
    itemListElement: {
      "@type": "ListItem",
      item: {
        "@type": "LegalService",
        areaServed: {
          "@type": "Place",
          name: location,
          address: {
            "@type": "PostalAddress",
            addressRegion: state,
            addressLocality: city,
            addressCountry: "MY",
          },
        },
      },
    },
  };
}

/**
 * Generate Schema.org for practice area pages
 */
export function getPracticeAreaPageSchema(
  practiceArea: string,
  slug: string,
  description?: string,
  lawyerCount: number = 0
): object {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${practiceArea} Lawyers in Malaysia`,
    description:
      description ||
      `Find experienced ${practiceArea} lawyers in Malaysia. Compare ${lawyerCount}+ verified legal professionals.`,
    url: getPracticeAreaCanonicalUrl(slug),
    numberOfItems: lawyerCount,
    itemListElement: {
      "@type": "ListItem",
      item: {
        "@type": "LegalService",
        serviceType: practiceArea,
      },
    },
  };
}

/**
 * Generate Schema.org BreadcrumbList
 */
export function getBreadcrumbSchema(
  items: Array<{ name: string; url: string }>
): object {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

/**
 * Generate Organization schema for the site
 */
export function getOrganizationSchema(): object {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "LawKita",
    url: APP_URL,
    logo: `${APP_URL}/logo.png`,
    description: "Malaysia's trusted lawyer directory. Compare lawyers, read reviews, and find the right legal representation.",
    address: {
      "@type": "PostalAddress",
      addressCountry: "MY",
    },
    sameAs: [
      "https://www.facebook.com/lawkita",
      "https://www.linkedin.com/company/lawkita",
      "https://twitter.com/lawkita",
    ],
  };
}

/**
 * Generate WebSite schema with search
 */
export function getWebsiteSchema(): object {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "LawKita",
    url: APP_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${APP_URL}/lawyers?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}
