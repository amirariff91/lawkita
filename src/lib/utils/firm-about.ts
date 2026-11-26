// Pure helpers for the firm profile page: the factual "About" paragraph,
// place resolution against the location constants, and links to the
// practice area, location and services hubs. No database access here.
//
// Every clause in the paragraph comes from a stored field and appears only
// when that field has a value. No superlatives, no claims about quality and
// never win/loss records.

import { CREDENTIAL_HUBS, type CredentialHub } from "@/lib/constants/credentials";
import { getAllStates } from "@/lib/constants/locations";
import {
  flattenPracticeAreas,
  getPracticeAreaBySlug,
  type PracticeAreaDefinition,
} from "@/lib/constants/practice-areas";
import { credentialHubPath } from "@/lib/utils/credential-hub-seo";
import { practiceAreaLocationPath, PRACTICE_AREA_BASE_PATH } from "@/lib/utils/practice-area-location-seo";

export interface FirmPlace {
  state?: { name: string; slug: string };
  city?: { name: string; slug: string };
}

/** Letters and digits only, lowercase: "George Town" and "Georgetown" match. */
function placeKey(value: string): string {
  return value.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
}

/**
 * The state and city in the location constants that a firm's stored state
 * and city name. A city is looked up only within its state; anything that
 * does not resolve is left out, so links built from it never 404.
 */
export function resolveFirmPlace(
  stateName: string | null | undefined,
  cityName: string | null | undefined
): FirmPlace {
  if (!stateName?.trim()) return {};
  const stateKey = placeKey(stateName);
  const state = getAllStates().find(
    (candidate) => placeKey(candidate.name) === stateKey || candidate.slug === stateName.trim()
  );
  if (!state) return {};
  const statePlace = { name: state.name, slug: state.slug };
  if (!cityName?.trim()) return { state: statePlace };
  const cityKey = placeKey(cityName);
  const city = state.cities.find((candidate) => placeKey(candidate.name) === cityKey);
  return city
    ? { state: statePlace, city: { name: city.name, slug: city.slug } }
    : { state: statePlace };
}

export function locationHubHref(place: FirmPlace, level: "state" | "city"): string | null {
  if (!place.state) return null;
  if (level === "state") return `/lawyers/location/${place.state.slug}`;
  return place.city ? `/lawyers/location/${place.state.slug}/${place.city.slug}` : null;
}

/** The constants entry for a stored practice area: by slug first, then by name. */
export function findPracticeArea(area: {
  name: string;
  slug?: string | null;
}): PracticeAreaDefinition | undefined {
  if (area.slug) {
    const bySlug = getPracticeAreaBySlug(area.slug);
    if (bySlug) return bySlug;
  }
  const nameKey = area.name.trim().toLowerCase();
  return flattenPracticeAreas().find((candidate) => candidate.name.toLowerCase() === nameKey);
}

/**
 * Link for a practice area badge: the area-by-place page when the area has
 * place pages (user-facing) and the firm's state resolves, else the area
 * hub. Null when the area is not in the constants (no page exists).
 */
export function practiceAreaHref(
  area: { name: string; slug?: string | null },
  place: FirmPlace
): string | null {
  const definition = findPracticeArea(area);
  if (!definition) return null;
  if (definition.isUserFacing && place.state) {
    return practiceAreaLocationPath(definition.slug, place.state.slug, place.city?.slug);
  }
  return `${PRACTICE_AREA_BASE_PATH}/${definition.slug}`;
}

export interface FirmAboutInput {
  /** Display name (already formatted). */
  name: string;
  city: string | null;
  state: string | null;
  foundedYear?: number | null;
  lawyerCount: number;
  avgYearsExperience: number | null;
  earliestAdmissionYear?: number | null;
  practiceAreas: string[];
  languages?: string[] | null;
  legalNetworks?: string[] | null;
  /** Each listed lawyer's credentials. */
  lawyerCredentials?: string[][];
  /** Resolved place, for the services hub links. */
  place?: FirmPlace;
  /** For the founded-year sanity check; defaults to the current year. */
  currentYear?: number;
}

/** A run of text; with `href` it renders as a link. */
export interface FirmAboutPart {
  text: string;
  href?: string;
}

/** Practice areas named in the paragraph; the full list is shown as badges. */
const MAX_AREAS_IN_ABOUT = 5;

export function joinList(items: readonly string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

function uniqueClean(values: readonly (string | null | undefined)[] | null | undefined): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values ?? []) {
    const trimmed = value?.trim();
    if (!trimmed || seen.has(trimmed.toLowerCase())) continue;
    seen.add(trimmed.toLowerCase());
    result.push(trimmed);
  }
  return result;
}

/** "Ipoh, Perak"; a city named like its state ("Melaka, Melaka") once. */
export function firmPlaceLabel(city: string | null, state: string | null): string | null {
  const c = city?.trim();
  const s = state?.trim();
  if (c && s) return placeKey(c) === placeKey(s) ? s : `${c}, ${s}`;
  return c || s || null;
}

function formatYears(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  return `${text} ${rounded === 1 ? "year" : "years"}`;
}

/** How many listed lawyers hold each services hub's credential, in hub order. */
export function credentialHubCounts(
  lawyerCredentials: readonly (readonly string[])[] | undefined
): { hub: CredentialHub; count: number }[] {
  return CREDENTIAL_HUBS.map((hub) => ({
    hub,
    count: (lawyerCredentials ?? []).filter((values) =>
      values.some((value) => hub.credentials.includes(value))
    ).length,
  })).filter((entry) => entry.count > 0);
}

/**
 * The About paragraph as text runs. A firm with only a name and state gets
 * one or two short, true sentences; each further clause needs its data.
 */
export function buildFirmAbout(input: FirmAboutInput): FirmAboutPart[] {
  const parts: FirmAboutPart[] = [];
  const text = (value: string) => parts.push({ text: value });
  const currentYear = input.currentYear ?? new Date().getFullYear();

  // Who and where, with the founding year when it is plausible.
  const where = firmPlaceLabel(input.city, input.state);
  const founded =
    typeof input.foundedYear === "number" &&
    Number.isInteger(input.foundedYear) &&
    input.foundedYear >= 1800 &&
    input.foundedYear <= currentYear
      ? `, founded in ${input.foundedYear}`
      : "";
  text(`${input.name} is a law firm in ${where ?? "Malaysia"}${founded}.`);

  // Lawyers listed and their experience.
  const count = Math.max(0, Math.floor(input.lawyerCount));
  const avg =
    typeof input.avgYearsExperience === "number" && Number.isFinite(input.avgYearsExperience)
      ? input.avgYearsExperience
      : null;
  const earliest =
    typeof input.earliestAdmissionYear === "number" &&
    input.earliestAdmissionYear >= 1900 &&
    input.earliestAdmissionYear <= currentYear
      ? input.earliestAdmissionYear
      : null;
  if (count === 0) {
    text(" LawKita does not currently list any lawyers at the firm.");
  } else if (count === 1) {
    let sentence = " LawKita lists 1 lawyer at the firm";
    if (avg !== null) sentence += `, with ${formatYears(avg)} at the Bar`;
    if (earliest !== null) sentence += ` (admitted in ${earliest})`;
    text(`${sentence}.`);
  } else {
    let sentence = ` LawKita lists ${count} lawyers at the firm`;
    if (avg !== null) sentence += `, with an average of ${formatYears(avg)} at the Bar`;
    sentence += ".";
    if (earliest !== null) {
      sentence += ` The earliest Bar admission among them was in ${earliest}.`;
    }
    text(sentence);
  }

  // Practice areas listed by its lawyers.
  const areas = uniqueClean(input.practiceAreas);
  if (areas.length > 0) {
    const named = areas.slice(0, MAX_AREAS_IN_ABOUT);
    const more = areas.length - named.length;
    const list = more > 0 ? `${named.join(", ")} and ${more} more` : joinList(named);
    text(
      areas.length === 1
        ? ` Its lawyers list ${list} as a practice area.`
        : ` Practice areas listed by its lawyers include ${list}.`
    );
  }

  // Services its lawyers offer (credentials), each linked to its hub.
  const hubs = credentialHubCounts(input.lawyerCredentials);
  if (hubs.length > 0) {
    text(" Its lawyers include ");
    hubs.forEach(({ hub, count: n }, index) => {
      if (index > 0) text(index === hubs.length - 1 ? " and " : ", ");
      parts.push({
        text: `${n} ${n === 1 ? hub.singular : hub.plural}`,
        href: credentialHubPath(hub.slug, input.place?.state?.slug, input.place?.city?.slug),
      });
    });
    text(".");
  }

  const languages = uniqueClean(input.languages);
  if (languages.length > 0) {
    text(
      ` ${languages.length === 1 ? "The language" : "Languages"} listed for the firm ${languages.length === 1 ? "is" : "are"} ${joinList(languages)}.`
    );
  }

  const networks = uniqueClean(input.legalNetworks);
  if (networks.length > 0) {
    text(` It is listed as a member of ${joinList(networks)}.`);
  }

  // Merge adjacent plain runs so the output is easy to render and test.
  const merged: FirmAboutPart[] = [];
  for (const part of parts) {
    const last = merged[merged.length - 1];
    if (last && !last.href && !part.href) last.text += part.text;
    else merged.push({ ...part });
  }
  return merged;
}

export function firmAboutText(parts: readonly FirmAboutPart[]): string {
  return parts.map((part) => part.text).join("");
}
