/**
 * SEO Utilities for generating OG images and metadata
 */

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://lawkita.com";
/**
 * Programmatic hub pages (practice area / state / city) are only worth
 * indexing once they list enough lawyers. Below this threshold they are
 * `noindex, follow` and excluded from the sitemap.
 */
export const MIN_LAWYERS_FOR_INDEXING = 10;

/** Whether a hub page listing `lawyerCount` active lawyers may be indexed. */
export function isHubPageIndexable(lawyerCount: number): boolean {
  return lawyerCount >= MIN_LAWYERS_FOR_INDEXING;
}

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
 * Page titles get " | LawKita" appended by the root layout's title template.
 * Google shows roughly 60 characters, so the page's own part gets the rest.
 */
export const TITLE_TEMPLATE_SUFFIX = " | LawKita";
export const MAX_TITLE_LENGTH = 60;
const TITLE_BUDGET = MAX_TITLE_LENGTH - TITLE_TEMPLATE_SUFFIX.length;
/**
 * Lawyer profiles are found by name, often with the firm ("majid & chen
 * subang"). Keeping the firm in the title matters more than staying inside
 * the width Google displays, so these titles may run to 70 characters: the
 * name and firm still match the query when the tail is cut off on screen.
 */
export const MAX_LAWYER_TITLE_LENGTH = 70;
const LAWYER_TITLE_BUDGET = MAX_LAWYER_TITLE_LENGTH - TITLE_TEMPLATE_SUFFIX.length;
const DESCRIPTION_BUDGET = 155;

/** First candidate that fits the title budget, else the shortest (last). */
function firstFittingTitle(candidates: string[]): string {
  return candidates.find((c) => c.length <= TITLE_BUDGET) ?? candidates[candidates.length - 1];
}

/**
 * Join sentences in priority order, skipping any that would push the text
 * past `maxLength`. The first sentence is always kept (truncated if needed),
 * so a later fact is never cut mid-word.
 */
function joinWithinBudget(sentences: string[], maxLength = DESCRIPTION_BUDGET): string {
  const [first, ...rest] = sentences.filter(Boolean);
  if (!first) return "";
  let text = truncateForDescription(first, maxLength);
  for (const sentence of rest) {
    if (text.length + 1 + sentence.length <= maxLength) text += ` ${sentence}`;
  }
  return text;
}

/** "Batu Caves, Selangor"; a city that repeats its state is shown once. */
function formatPlace(city?: string | null, state?: string | null): string {
  const parts = [city, state]
    .map((p) => p?.trim())
    .filter((p): p is string => Boolean(p));
  if (parts.length === 2 && parts[0].toLowerCase() === parts[1].toLowerCase()) {
    return parts[0];
  }
  return parts.join(", ");
}

/** Calendar year in Malaysia time (UTC+8), so a midnight-MYT date is not read as the previous year. */
function malaysiaYear(date: Date): number {
  return new Date(date.getTime() + 8 * 60 * 60 * 1000).getUTCFullYear();
}

function collapseWhitespace(text: string): string {
  return text.trim().replace(/\s+/g, " ");
}

/**
 * A lawyer's meta title, written for searches on the lawyer's own name:
 * name first, then role, firm and city. When the result would run past
 * ~60 characters (with the site suffix) the city is dropped first, then
 * the firm. The name itself is never cut.
 *
 * Pass display-formatted names (formatPersonName / formatFirmName).
 */
export function getLawyerMetaTitle(
  name: string,
  firmName?: string | null,
  city?: string | null
): string {
  const firm = firmName?.trim();
  const place = city?.trim();
  const candidates: string[] = [];
  if (firm && place) candidates.push(`${name} – Lawyer at ${firm}, ${place}`);
  if (firm) candidates.push(`${name} – Lawyer at ${firm}`);
  if (!firm && place) candidates.push(`${name} – Lawyer in ${place}`);
  candidates.push(`${name} – Lawyer`);
  return (
    candidates.find((candidate) => candidate.length <= LAWYER_TITLE_BUDGET) ??
    candidates[candidates.length - 1]
  );
}

export interface LawyerMetaDescriptionInput {
  /** Display-formatted name. */
  name: string;
  /** Display-formatted firm name. */
  firmName?: string | null;
  city?: string | null;
  state?: string | null;
  barAdmissionDate?: Date | null;
  yearsAtBar?: number | null;
  practiceAreas?: string[];
  credentials?: string[] | null;
  bio?: string | null;
}

/**
 * A lawyer's meta description: only facts present on the row (firm,
 * location, year admitted, practice areas, credentials), most important
 * first, within ~155 characters. Nothing is inferred or invented; a sparse
 * row gives a short description.
 */
export function getLawyerMetaDescription(input: LawyerMetaDescriptionInput): string {
  const place = formatPlace(input.city, input.state);
  const firm = input.firmName?.trim() ? ` at ${input.firmName.trim()}` : "";
  const intro = `${input.name} is a lawyer${firm} in ${place || "Malaysia"}.`;

  let admission = "";
  if (input.barAdmissionDate) {
    admission = `Admitted to the Bar in ${malaysiaYear(input.barAdmissionDate)}.`;
  } else if (input.yearsAtBar && input.yearsAtBar > 0) {
    admission = `${input.yearsAtBar} ${input.yearsAtBar === 1 ? "year" : "years"} at the Bar.`;
  }

  const areas = (input.practiceAreas ?? []).filter(Boolean).slice(0, 3);
  const practice = areas.length > 0 ? `Practice areas: ${areas.join(", ")}.` : "";

  const credentials = (input.credentials ?? []).filter(Boolean).slice(0, 2);
  const credential = credentials.length > 0 ? `${credentials.join("; ")}.` : "";

  const bio = input.bio ? collapseWhitespace(input.bio) : "";

  return joinWithinBudget([
    intro,
    admission,
    practice,
    credential,
    // A self-written bio only fills space when the record has few facts.
    bio && !admission && !practice ? truncateForDescription(bio, 90) : "",
    "View the profile on LawKita.",
  ]);
}

/**
 * Generate canonical URL for a firm page
 */
export function getFirmCanonicalUrl(slug: string): string {
  return `${APP_URL}/firms/${slug}`;
}

/**
 * A firm's meta title for searches on the firm's name:
 * "<Firm> – Law Firm in <City>", dropping the place, then the role, when
 * it would run past ~60 characters with the site suffix.
 *
 * Pass the display-formatted firm name (formatFirmName).
 */
export function getFirmMetaTitle(
  firmName: string,
  city?: string | null,
  state?: string | null
): string {
  const place = city?.trim() || state?.trim() || "Malaysia";
  return firstFittingTitle([
    `${firmName} – Law Firm in ${place}`,
    `${firmName} – Law Firm`,
    firmName,
  ]);
}

export interface FirmMetaDescriptionInput {
  /** Display-formatted firm name. */
  name: string;
  city?: string | null;
  state?: string | null;
  address?: string | null;
  phone?: string | null;
  lawyerCount: number;
  practiceAreas?: string[];
}

/**
 * A firm's meta description from data shown on the page only: location,
 * number of lawyers listed, top practice areas, office address, and whether
 * a phone number is listed.
 */
export function getFirmMetaDescription(input: FirmMetaDescriptionInput): string {
  const place = formatPlace(input.city, input.state) || "Malaysia";
  const count =
    input.lawyerCount > 0
      ? ` with ${input.lawyerCount} ${input.lawyerCount === 1 ? "lawyer" : "lawyers"} listed`
      : "";
  const intro = `${input.name} is a law firm in ${place}${count}.`;

  const areas = (input.practiceAreas ?? []).filter(Boolean).slice(0, 3);
  const practice = areas.length > 0 ? `Practice areas: ${areas.join(", ")}.` : "";

  const address = input.address ? collapseWhitespace(input.address).replace(/[.,]+$/, "") : "";
  const office = address ? `Office: ${address}.` : "";

  const contact = input.phone?.trim()
    ? "Phone number and lawyer profiles on LawKita."
    : input.lawyerCount > 0
      ? "Lawyer profiles on LawKita."
      : "";

  return joinWithinBudget([intro, practice, office, contact]);
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

/**
 * The site-wide share image (src/app/opengraph-image.tsx). A page that sets
 * its own `openGraph` object replaces the inherited one, image included, so
 * every such page lists this explicitly unless it has an image of its own.
 */
export const DEFAULT_OG_IMAGES = [
  {
    url: "/opengraph-image",
    width: 1200,
    height: 630,
    alt: "LawKita, the Malaysian lawyer and law firm directory",
  },
];
