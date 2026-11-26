// Pure helpers for the /lawyers/services pages: paths, titles, descriptions,
// headings, indexability and ItemList JSON-LD. No database access here.

import type { CredentialHub } from "@/lib/constants/credentials";
import { isHubPageIndexable, truncateForDescription } from "@/lib/utils/seo";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://lawkita.com";

export const SERVICES_BASE_PATH = "/lawyers/services";

export interface HubPlace {
  state?: { name: string; slug: string };
  city?: { name: string; slug: string };
}

export type CredentialHubLevel = "index" | "service" | "state" | "city";

export function credentialHubPath(
  hubSlug?: string,
  stateSlug?: string,
  citySlug?: string,
  page = 1
): string {
  let path = SERVICES_BASE_PATH;
  if (hubSlug) {
    path += `/${hubSlug}`;
    if (stateSlug) {
      path += `/${stateSlug}`;
      if (citySlug) path += `/${citySlug}`;
    }
  }
  return page > 1 ? `${path}?page=${page}` : path;
}

/** "Cheras, Selangor" for a city (city names repeat across states), "Selangor", or "Malaysia". */
export function placeLabel(place: HubPlace): string {
  if (place.city && place.state) return `${place.city.name}, ${place.state.name}`;
  if (place.state) return place.state.name;
  return "Malaysia";
}

/** Shorter place for the H1: the city alone reads naturally on the page. */
function headingPlace(place: HubPlace): string {
  return place.city?.name ?? place.state?.name ?? "Malaysia";
}

export function levelOf(place: HubPlace): Exclude<CredentialHubLevel, "index"> {
  if (place.city) return "city";
  if (place.state) return "state";
  return "service";
}

/** "Commissioner for Oaths (Pesuruhjaya Sumpah) in Shah Alam" */
export function buildCredentialHubHeading(hub: CredentialHub, place: HubPlace): string {
  return `${hub.name} (${hub.malayName}) in ${headingPlace(place)}`;
}

/** The root layout appends " | LawKita" (10 characters); aim for 60 in total. */
const HUB_TITLE_BUDGET = 50;

/** The root layout appends " | LawKita". */
export function buildCredentialHubTitle(
  hub: CredentialHub,
  place: HubPlace,
  page = 1
): string {
  // Lead with the term people search (hub.searchName), then shorten in steps
  // until the title fits: drop the alternate name first, the state last.
  const lead = hub.searchName ?? hub.name;
  const alternate = lead === hub.name ? hub.malayName : hub.name;
  const city = place.city?.name ?? place.state?.name ?? "Malaysia";
  const candidates = [
    `${lead} (${alternate}) in ${placeLabel(place)}`,
    // The state stays as long as possible: city names repeat across states.
    `${lead} in ${placeLabel(place)}`,
    `${lead} (${alternate}) in ${city}`,
    `${lead} in ${city}`,
  ];
  const base = candidates.find((title) => title.length <= HUB_TITLE_BUDGET) ?? candidates[3];
  return page > 1 ? `${base} - Page ${page}` : base;
}

export function buildCredentialHubDescription(
  hub: CredentialHub,
  place: HubPlace,
  count: number
): string {
  const where = placeLabel(place);
  if (count <= 0) {
    return truncateForDescription(
      `Find a ${hub.singular} (${hub.malayName}) in ${where}. ${hub.summary}`
    );
  }
  const noun = count === 1 ? hub.singular : hub.plural;
  return truncateForDescription(
    `${count} ${noun} (${hub.malayName}) in ${where}, with firm, address and phone number. ${hub.summary}`
  );
}

export const CREDENTIAL_INDEX_TITLE =
  "Commissioners for Oaths, Notaries Public, Legal Aid and Syariah Lawyers";

export const CREDENTIAL_INDEX_DESCRIPTION = truncateForDescription(
  "Find a commissioner for oaths (pesuruhjaya sumpah), notary public, YBGK legal aid lawyer, Peguam Syarie or mediator in Malaysia, by state and city."
);

/**
 * Whether a services page may be indexed.
 * - index and service (national) pages: indexable once they list anyone.
 * - state and city pages: the same threshold as the location and practice
 *   area hubs (isHubPageIndexable), so thin place pages stay `noindex`.
 * The sitemap uses the same rule, so it never lists a `noindex` page.
 */
export function isCredentialHubIndexable(level: CredentialHubLevel, count: number): boolean {
  if (!Number.isFinite(count) || count <= 0) return false;
  if (level === "index" || level === "service") return true;
  return isHubPageIndexable(count);
}

export function credentialHubRobots(
  level: CredentialHubLevel,
  count: number
): { index: false; follow: true } | undefined {
  return isCredentialHubIndexable(level, count) ? undefined : { index: false, follow: true };
}

export interface ItemListLawyer {
  slug: string;
  name: string;
}

/**
 * Schema.org ItemList of the lawyers shown on the page (summary-page pattern:
 * each item points at the lawyer's profile URL). Positions continue across
 * pages so page 2 starts after page 1.
 */
export function getCredentialHubItemListSchema(input: {
  name: string;
  description: string;
  path: string;
  total: number;
  lawyers: ItemListLawyer[];
  startPosition?: number;
}): object {
  const start = input.startPosition ?? 1;
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: input.name,
    description: input.description,
    url: `${APP_URL}${input.path}`,
    numberOfItems: input.total,
    itemListElement: input.lawyers.map((lawyer, index) => ({
      "@type": "ListItem",
      position: start + index,
      url: `${APP_URL}/lawyers/${lawyer.slug}`,
      name: lawyer.name,
    })),
  };
}
