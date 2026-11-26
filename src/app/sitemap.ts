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

// One sitemap file may hold 50,000 URLs. Past this many, split the sitemap.
const SITEMAP_WARN_URLS = 45_000;
const MAX_LAWYER_URLS = 40_000;

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
    }
  );

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
    .limit(MAX_LAWYER_URLS);

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


  // Law firm profiles
  // Newly added section: if the live firms table differs from schema.ts,
  // skip firms rather than failing the whole sitemap.
  const allFirms = await db
    .select({
      slug: firms.slug,
      updatedAt: firms.updatedAt,
    })
    .from(firms)
    .orderBy(desc(firms.updatedAt))
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

  return entries;
}
