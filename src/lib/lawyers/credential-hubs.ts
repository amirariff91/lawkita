// Pure aggregation over the per-place credential hub counts
// (getCredentialHubCountsByPlace). No database access, so it is unit-tested.

import { CREDENTIAL_HUBS } from "@/lib/constants/credentials";
import { getAllStates } from "@/lib/constants/locations";
import {
  credentialHubPath,
  isCredentialHubIndexable,
} from "@/lib/utils/credential-hub-seo";

export interface PlaceCountsRow {
  state: string | null;
  city: string | null;
  counts: Record<string, number>;
}

export interface CredentialHubSummary {
  national: Record<string, number>;
  /** Keyed by stored state name. */
  byState: Map<string, Record<string, number>>;
  /** Keyed by `${stateName}|${cityName}`. */
  byCity: Map<string, Record<string, number>>;
}

function emptyCounts(): Record<string, number> {
  return Object.fromEntries(CREDENTIAL_HUBS.map((hub) => [hub.slug, 0]));
}

function addInto(target: Record<string, number>, source: Record<string, number>) {
  for (const hub of CREDENTIAL_HUBS) target[hub.slug] += source[hub.slug] ?? 0;
}

export function cityKey(stateName: string, cityName: string): string {
  return `${stateName}|${cityName}`;
}

export function summariseCredentialHubCounts(rows: PlaceCountsRow[]): CredentialHubSummary {
  const national = emptyCounts();
  const byState = new Map<string, Record<string, number>>();
  const byCity = new Map<string, Record<string, number>>();

  for (const row of rows) {
    addInto(national, row.counts);
    if (!row.state) continue;
    const stateCounts = byState.get(row.state) ?? emptyCounts();
    addInto(stateCounts, row.counts);
    byState.set(row.state, stateCounts);
    if (!row.city) continue;
    const key = cityKey(row.state, row.city);
    const cityCounts = byCity.get(key) ?? emptyCounts();
    addInto(cityCounts, row.counts);
    byCity.set(key, cityCounts);
  }

  return { national, byState, byCity };
}

export interface CredentialHubSitemapPath {
  path: string;
  priority: number;
}

/**
 * Services pages for the sitemap. Only pages that are indexable under
 * isCredentialHubIndexable are listed, so the sitemap never contains a
 * `noindex` page. With no summary (the count query failed), list the index
 * and the national hubs only, never the state/city fan-out.
 */
export function credentialHubSitemapPaths(
  summary: CredentialHubSummary | null
): CredentialHubSitemapPath[] {
  if (summary === null) {
    return [
      { path: credentialHubPath(), priority: 0.7 },
      ...CREDENTIAL_HUBS.map((hub) => ({ path: credentialHubPath(hub.slug), priority: 0.7 })),
    ];
  }

  const paths: CredentialHubSitemapPath[] = [];
  const nationalTotal = Object.values(summary.national).reduce((sum, n) => sum + n, 0);
  if (isCredentialHubIndexable("index", nationalTotal)) {
    paths.push({ path: credentialHubPath(), priority: 0.7 });
  }

  for (const hub of CREDENTIAL_HUBS) {
    if (!isCredentialHubIndexable("service", summary.national[hub.slug] ?? 0)) continue;
    paths.push({ path: credentialHubPath(hub.slug), priority: 0.7 });

    for (const state of getAllStates()) {
      const stateCount = summary.byState.get(state.name)?.[hub.slug] ?? 0;
      if (isCredentialHubIndexable("state", stateCount)) {
        paths.push({ path: credentialHubPath(hub.slug, state.slug), priority: 0.6 });
      }
      for (const city of state.cities) {
        const cityCount = summary.byCity.get(cityKey(state.name, city.name))?.[hub.slug] ?? 0;
        if (isCredentialHubIndexable("city", cityCount)) {
          paths.push({
            path: credentialHubPath(hub.slug, state.slug, city.slug),
            priority: 0.6,
          });
        }
      }
    }
  }

  return paths;
}
