import { MetadataRoute } from "next";
import { db } from "@/lib/db";
import {
  lawyers,
  cases,
  practiceAreas,
  lawyerPracticeAreas,
  states,
  cities,
  firms,
} from "@/lib/db/schema";
import { and, asc, count, desc, eq, isNotNull } from "drizzle-orm";
import { isHubPageIndexable } from "@/lib/utils/seo";
import { indexableLawyerProfile, listableLawyer } from "@/lib/lawyers/listable";
import { getCredentialHubCountsByPlace } from "@/lib/db/queries/credential-hubs";
import {
  credentialHubSitemapPaths,
  summariseCredentialHubCounts,
} from "@/lib/lawyers/credential-hubs";
import { getAreaPlaceCounts } from "@/lib/db/queries/practice-area-locations";
import {
  areaPlaceSitemapPaths,
  PRACTICE_AREA_LOCATION_SITEMAP_CAP,
  summariseAreaPlaceCounts,
} from "@/lib/utils/practice-area-location-seo";

// One sitemap file may hold 50,000 URLs. Past this many, split the sitemap.
const SITEMAP_WARN_URLS = 45_000;
const MAX_SITEMAP_URLS = 50_000;
const MAX_LAWYER_URLS = 40_000;
// Room kept for the sections that come after lawyer profiles (cases, hubs).
const RESERVED_AFTER_LAWYERS = 3_000;

// Generate sitemap at runtime, not build time (requires DB connection)
export const dynamic = "force-dynamic";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://lawkita.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [];

  // Static pages
  entries.push(
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${BASE_URL}/lawyers`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/cases`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/lawyers/practice-area`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/lawyers/location`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/firms`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/about`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/contact`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/pricing`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/privacy`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/terms`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/insights`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/tools`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/tools/stamp-duty-calculator`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/tools/legal-fees-calculator`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/tools/tenancy-stamp-duty-calculator`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    }
  );

  // Law firm profiles come before lawyer profiles: searches for a firm's
  // name are the largest source of directory traffic.
  // Law firm profiles
  // Newly added section: if the live firms table differs from schema.ts,
  // skip firms rather than failing the whole sitemap.
  const allFirms = await db
    .select({
      slug: firms.slug,
      updatedAt: firms.updatedAt,
    })
    .from(firms)
    // A fixed order: a bulk import gives thousands of firms the same
    // updatedAt, and a cap must always cut the same rows.
    .orderBy(asc(firms.createdAt), asc(firms.id))
    .limit(20000)
    .catch((error: unknown) => {
      console.error("sitemap: firms query failed", error);
      return [] as { slug: string; updatedAt: Date }[];
    });

  for (const firm of allFirms) {
    entries.push({
      url: `${BASE_URL}/firms/${firm.slug}`,
      lastModified: firm.updatedAt,
      changeFrequency: "weekly",
      priority: 0.7,
    });
  }

  // Services (credential hubs): the index, each national hub, and the
  // state/city pages that pass the indexing rule (credentialHubSitemapPaths).
  // One grouped count query. If it fails, list the index and national hubs
  // only, rather than failing the whole sitemap.
  const credentialHubCounts = await getCredentialHubCountsByPlace().catch(
    (error: unknown) => {
      console.error("sitemap: credential hub counts query failed", error);
      return null;
    }
  );
  const credentialHubPaths = credentialHubSitemapPaths(
    credentialHubCounts === null
      ? null
      : summariseCredentialHubCounts(credentialHubCounts)
  );
  for (const hubPath of credentialHubPaths) {
    entries.push({
      url: `${BASE_URL}${hubPath.path}`,
      changeFrequency: "weekly",
      priority: hubPath.priority,
    });
  }

  // Practice area x location pages (/lawyers/practice-area/[area]/[state]
  // and /[state]/[city]): only combinations that pass the indexing rule,
  // most lawyers first, at most PRACTICE_AREA_LOCATION_SITEMAP_CAP. One
  // grouped count query. If it fails, add none rather than failing the
  // whole sitemap.
  const areaPlaceCounts = await getAreaPlaceCounts().catch((error: unknown) => {
    console.error("sitemap: practice area x location counts query failed", error);
    return null;
  });
  const areaPlacePaths =
    areaPlaceCounts === null
      ? []
      : areaPlaceSitemapPaths(
          summariseAreaPlaceCounts(areaPlaceCounts),
          PRACTICE_AREA_LOCATION_SITEMAP_CAP
        );
  for (const areaPlacePath of areaPlacePaths) {
    entries.push({
      url: `${BASE_URL}${areaPlacePath.path}`,
      changeFrequency: "weekly",
      priority: areaPlacePath.priority,
    });
  }

  // Lawyer profiles: listable lawyers whose profile has enough substance to
  // index (see indexableLawyerProfile). Oldest first, so that if the cap is
  // ever reached the profiles already in the sitemap stay in it.
  const allLawyers = await db
    .select({
      slug: lawyers.slug,
      updatedAt: lawyers.updatedAt,
      isClaimed: lawyers.isClaimed,
    })
    .from(lawyers)
    .where(indexableLawyerProfile)
    .orderBy(asc(lawyers.createdAt), asc(lawyers.id))
    .limit(
      Math.max(
        0,
        Math.min(MAX_LAWYER_URLS, MAX_SITEMAP_URLS - RESERVED_AFTER_LAWYERS - entries.length)
      )
    );

  for (const lawyer of allLawyers) {
    entries.push({
      url: `${BASE_URL}/lawyers/${lawyer.slug}`,
      lastModified: lawyer.updatedAt,
      changeFrequency: lawyer.isClaimed ? "weekly" : "monthly",
      priority: lawyer.isClaimed ? 0.8 : 0.6,
    });
  }

  // Famous cases
  const allCases = await db
    .select({
      slug: cases.slug,
      updatedAt: cases.updatedAt,
    })
    .from(cases)
    .where(eq(cases.isPublished, true))
    .orderBy(desc(cases.updatedAt));

  for (const caseItem of allCases) {
    entries.push({
      url: `${BASE_URL}/cases/${caseItem.slug}`,
      lastModified: caseItem.updatedAt,
      changeFrequency: "weekly",
      priority: 0.7,
    });
  }


  // Practice areas
  const allPracticeAreas = await db
    .select({
      slug: practiceAreas.slug,
    })
    .from(practiceAreas)
    .where(eq(practiceAreas.isUserFacing, true));

  // Hub counts, mirroring how the listing pages match lawyers:
  // - Practice areas: active lawyers via the lawyer_practice_areas join,
  //   keyed by practiceAreas.slug (searchLawyers matches the slug).
  // - States: active lawyers grouped by the stored lawyers.state value and
  //   compared against the state NAME, as the state page queries with
  //   getLawyersByLocation(state.name, ...).
  // - Cities: active lawyers grouped by (lawyers.state, lawyers.city) and
  //   compared against the state/city NAMES, because the city page queries
  //   with names (getLawyersByLocation(state.name, city.name, ...)).
  // A failing count query yields null and includes every entry, preserving
  // the previous behaviour instead of failing the whole sitemap.
  const practiceAreaCounts = await db
    .select({ slug: practiceAreas.slug, count: count() })
    .from(practiceAreas)
    .innerJoin(
      lawyerPracticeAreas,
      eq(lawyerPracticeAreas.practiceAreaId, practiceAreas.id)
    )
    .innerJoin(lawyers, eq(lawyerPracticeAreas.lawyerId, lawyers.id))
    .where(
      and(listableLawyer, eq(practiceAreas.isUserFacing, true))
    )
    .groupBy(practiceAreas.slug)
    .catch((error: unknown) => {
      console.error("sitemap: practice area counts query failed", error);
      return null as { slug: string; count: number }[] | null;
    });
  const practiceAreaCountBySlug = new Map(
    (practiceAreaCounts ?? []).map((row) => [row.slug, Number(row.count)])
  );

  const stateCounts = await db
    .select({ state: lawyers.state, count: count() })
    .from(lawyers)
    .where(and(listableLawyer, isNotNull(lawyers.state)))
    .groupBy(lawyers.state)
    .catch((error: unknown) => {
      console.error("sitemap: state counts query failed", error);
      return null as { state: string | null; count: number }[] | null;
    });
  const stateCountByName = new Map(
    (stateCounts ?? []).map((row) => [row.state ?? "", Number(row.count)])
  );

  const cityCounts = await db
    .select({
      state: lawyers.state,
      city: lawyers.city,
      count: count(),
    })
    .from(lawyers)
    .where(
      and(
        listableLawyer,
        isNotNull(lawyers.state),
        isNotNull(lawyers.city)
      )
    )
    .groupBy(lawyers.state, lawyers.city)
    .catch((error: unknown) => {
      console.error("sitemap: city counts query failed", error);
      return null as {
        state: string | null;
        city: string | null;
        count: number;
      }[] | null;
    });
  const cityCountByName = new Map(
    (cityCounts ?? []).map((row) => [
      `${row.state ?? ""}|${row.city ?? ""}`,
      Number(row.count),
    ])
  );

  for (const area of allPracticeAreas) {
    if (
      practiceAreaCounts !== null &&
      !isHubPageIndexable(practiceAreaCountBySlug.get(area.slug) ?? 0)
    ) {
      continue;
    }
    entries.push({
      url: `${BASE_URL}/lawyers/practice-area/${area.slug}`,
      changeFrequency: "weekly",
      priority: 0.7,
    });
  }

  // Location pages - States
  const allStates = await db
    .select({ slug: states.slug, name: states.name })
    .from(states);

  for (const state of allStates) {
    if (
      stateCounts !== null &&
      !isHubPageIndexable(stateCountByName.get(state.name) ?? 0)
    ) {
      continue;
    }
    entries.push({
      url: `${BASE_URL}/lawyers/location/${state.slug}`,
      changeFrequency: "weekly",
      priority: 0.7,
    });
  }

  // Location pages - Cities
  const allCities = await db
    .select({
      citySlug: cities.slug,
      stateSlug: states.slug,
      cityName: cities.name,
      stateName: states.name,
    })
    .from(cities)
    .innerJoin(states, eq(cities.stateId, states.id));

  for (const city of allCities) {
    if (
      cityCounts !== null &&
      !isHubPageIndexable(
        cityCountByName.get(`${city.stateName}|${city.cityName}`) ?? 0
      )
    ) {
      continue;
    }
    entries.push({
      url: `${BASE_URL}/lawyers/location/${city.stateSlug}/${city.citySlug}`,
      changeFrequency: "weekly",
      priority: 0.6,
    });
  }

  if (entries.length > SITEMAP_WARN_URLS) {
    console.warn(
      `sitemap: ${entries.length} URLs, close to the 50,000 per-file limit; split it`
    );
  }

  // A file over the protocol limit can be rejected whole. Never emit one.
  if (entries.length > MAX_SITEMAP_URLS) {
    console.error(`sitemap: ${entries.length} URLs exceeds ${MAX_SITEMAP_URLS}; truncating`);
    return entries.slice(0, MAX_SITEMAP_URLS);
  }

  return entries;
}
