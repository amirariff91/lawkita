// Pure helpers for the practice area x location pages:
// /lawyers/practice-area/[area]/[state] and /[area]/[state]/[city].
// Paths, route resolution, titles, descriptions, indexability, the grouped
// count summary and the sitemap list. No database access here.

import {
  flattenPracticeAreas,
  getPracticeAreaBySlug,
  type PracticeAreaDefinition,
} from "@/lib/constants/practice-areas";
import { getAllStates, getCityBySlug, getStateBySlug } from "@/lib/constants/locations";
import { isHubPageIndexable, MAX_TITLE_LENGTH, TITLE_TEMPLATE_SUFFIX, truncateForDescription } from "@/lib/utils/seo";

export const PRACTICE_AREA_BASE_PATH = "/lawyers/practice-area";

/** The sitemap lists at most this many practice area x location pages. */
export const PRACTICE_AREA_LOCATION_SITEMAP_CAP = 5_000;

/** The root layout appends " | LawKita"; the page's own title gets the rest. */
const TITLE_BUDGET = MAX_TITLE_LENGTH - TITLE_TEMPLATE_SUFFIX.length;

export interface AreaPlace {
  state: { name: string; slug: string };
  city?: { name: string; slug: string };
}

export interface ResolvedAreaPlace {
  area: PracticeAreaDefinition;
  /** The level 1 area a level 2 area sits under. */
  parent?: PracticeAreaDefinition;
  place: AreaPlace;
}

export function practiceAreaLocationPath(
  areaSlug: string,
  stateSlug?: string,
  citySlug?: string,
  page = 1
): string {
  let path = `${PRACTICE_AREA_BASE_PATH}/${areaSlug}`;
  if (stateSlug) {
    path += `/${stateSlug}`;
    if (citySlug) path += `/${citySlug}`;
  }
  return page > 1 ? `${path}?page=${page}` : path;
}

export function locationHubPath(place: AreaPlace): string {
  return place.city
    ? `/lawyers/location/${place.state.slug}/${place.city.slug}`
    : `/lawyers/location/${place.state.slug}`;
}

/** Practice areas these pages exist for: user-facing ones (levels 1 and 2). */
export function isLocationPageArea(area: PracticeAreaDefinition | undefined): boolean {
  return Boolean(area?.isUserFacing);
}

/** Validates the route segments against the constants; null means 404. */
export function resolveAreaPlace(
  areaSlug: string,
  stateSlug: string,
  citySlug?: string
): ResolvedAreaPlace | null {
  const area = getPracticeAreaBySlug(areaSlug);
  if (!area || !isLocationPageArea(area)) return null;
  const state = getStateBySlug(stateSlug);
  if (!state) return null;
  const parentSlug = flattenPracticeAreas().find((a) => a.slug === areaSlug)?.parentSlug;
  const parent = parentSlug ? getPracticeAreaBySlug(parentSlug) : undefined;
  const statePlace = { name: state.name, slug: state.slug };
  if (citySlug === undefined) return { area, parent, place: { state: statePlace } };
  const city = getCityBySlug(stateSlug, citySlug);
  if (!city) return null;
  return {
    area,
    parent,
    place: { state: statePlace, city: { name: city.name, slug: city.slug } },
  };
}

/** "Klang, Selangor"; a city named like its state ("Labuan") is not repeated. */
export function areaPlaceLabel(place: AreaPlace): string {
  if (!place.city) return place.state.name;
  if (place.city.name === place.state.name) return place.city.name;
  return `${place.city.name}, ${place.state.name}`;
}

/** H1: "Divorce Lawyers in Klang, Selangor". */
export function buildAreaPlaceHeading(areaName: string, place: AreaPlace): string {
  return `${areaName} Lawyers in ${areaPlaceLabel(place)}`;
}

/**
 * Title without the " | LawKita" suffix. Uses "<Area> Lawyers in <City>,
 * <State>" when it fits the budget, otherwise drops the state.
 */
export function buildAreaPlaceTitle(areaName: string, place: AreaPlace, page = 1): string {
  const pageSuffix = page > 1 ? ` - Page ${page}` : "";
  const full = `${areaName} Lawyers in ${areaPlaceLabel(place)}`;
  if (!place.city || (full + pageSuffix).length <= TITLE_BUDGET) return full + pageSuffix;
  return `${areaName} Lawyers in ${place.city.name}${pageSuffix}`;
}

function sentence(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "";
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

export function buildAreaPlaceDescription(
  area: Pick<PracticeAreaDefinition, "name" | "description">,
  place: AreaPlace,
  count: number
): string {
  const where = areaPlaceLabel(place);
  const about = sentence(area.description);
  if (!Number.isFinite(count) || count <= 0) {
    return truncateForDescription(`Find ${area.name.toLowerCase()} lawyers in ${where}. ${about}`.trim());
  }
  const noun = count === 1 ? "lawyer" : "lawyers";
  return truncateForDescription(
    `${count} ${area.name.toLowerCase()} ${noun} in ${where}, with firm and years at the Bar. ${about}`.trim()
  );
}

/**
 * Whether a practice area x location page may be indexed: the same threshold
 * as the location and practice area hubs. Zero, unknown (NaN, a failed count
 * passed as 0) or infinite counts are not indexable. The sitemap uses the
 * same rule, so it never lists a `noindex` page.
 */
export function isAreaPlaceIndexable(count: number): boolean {
  if (!Number.isFinite(count) || count <= 0) return false;
  return isHubPageIndexable(count);
}

export function areaPlaceRobots(count: number): { index: false; follow: true } | undefined {
  return isAreaPlaceIndexable(count) ? undefined : { index: false, follow: true };
}

// ---------------------------------------------------------------------------
// Grouped counts: one row per (practice area slug, stored state, stored city).

export interface AreaPlaceCountRow {
  slug: string;
  state: string | null;
  city: string | null;
  count: number;
}

export interface AreaPlaceSummary {
  /** `${areaSlug}|${stateName}` */
  byState: Map<string, number>;
  /** `${areaSlug}|${stateName}|${cityName}` */
  byCity: Map<string, number>;
}

export function areaStateKey(areaSlug: string, stateName: string): string {
  return `${areaSlug}|${stateName}`;
}

export function areaCityKey(areaSlug: string, stateName: string, cityName: string): string {
  return `${areaSlug}|${stateName}|${cityName}`;
}

/**
 * Each listable lawyer is in one (state, city) group per practice area, so
 * summing a state's city rows (including a null city) gives the state count.
 */
export function summariseAreaPlaceCounts(rows: AreaPlaceCountRow[]): AreaPlaceSummary {
  const byState = new Map<string, number>();
  const byCity = new Map<string, number>();
  for (const row of rows) {
    if (!row.state) continue;
    const n = Number(row.count) || 0;
    const sk = areaStateKey(row.slug, row.state);
    byState.set(sk, (byState.get(sk) ?? 0) + n);
    if (!row.city) continue;
    const ck = areaCityKey(row.slug, row.state, row.city);
    byCity.set(ck, (byCity.get(ck) ?? 0) + n);
  }
  return { byState, byCity };
}

export function countForAreaPlace(
  summary: AreaPlaceSummary,
  areaSlug: string,
  place: AreaPlace
): number {
  return place.city
    ? (summary.byCity.get(areaCityKey(areaSlug, place.state.name, place.city.name)) ?? 0)
    : (summary.byState.get(areaStateKey(areaSlug, place.state.name)) ?? 0);
}

export interface AreaPlaceSitemapPath {
  path: string;
  count: number;
  priority: number;
}

/**
 * Practice area x location pages for the sitemap: only combinations that
 * pass isAreaPlaceIndexable, for user-facing areas and states/cities known
 * to the constants, ordered by lawyer count (descending, ties by path) and
 * capped at `cap`.
 */
export function areaPlaceSitemapPaths(
  summary: AreaPlaceSummary,
  cap = PRACTICE_AREA_LOCATION_SITEMAP_CAP
): AreaPlaceSitemapPath[] {
  const paths: AreaPlaceSitemapPath[] = [];
  const areas = flattenPracticeAreas().filter((area) => isLocationPageArea(area));
  for (const area of areas) {
    for (const state of getAllStates()) {
      const stateCount = summary.byState.get(areaStateKey(area.slug, state.name)) ?? 0;
      if (stateCount <= 0) continue;
      if (isAreaPlaceIndexable(stateCount)) {
        paths.push({
          path: practiceAreaLocationPath(area.slug, state.slug),
          count: stateCount,
          priority: 0.6,
        });
      }
      for (const city of state.cities) {
        const cityCount = summary.byCity.get(areaCityKey(area.slug, state.name, city.name)) ?? 0;
        if (isAreaPlaceIndexable(cityCount)) {
          paths.push({
            path: practiceAreaLocationPath(area.slug, state.slug, city.slug),
            count: cityCount,
            priority: 0.5,
          });
        }
      }
    }
  }
  paths.sort((a, b) => b.count - a.count || (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  return paths.slice(0, Math.max(0, cap));
}

/** Upper bound of pages with the current constants: areas x (states + cities). */
export function maxAreaPlacePages(): { areas: number; states: number; cities: number; total: number } {
  const areas = flattenPracticeAreas().filter((area) => isLocationPageArea(area)).length;
  const states = getAllStates().length;
  const cities = getAllStates().reduce((sum, state) => sum + state.cities.length, 0);
  return { areas, states, cities, total: areas * (states + cities) };
}
