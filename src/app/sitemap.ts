import { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { lawyers, cases, practiceAreas, states, cities, firms } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

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

  // Lawyer profiles - all lawyers should be indexed for SEO
  const allLawyers = await db
    .select({
      slug: lawyers.slug,
      updatedAt: lawyers.updatedAt,
      isClaimed: lawyers.isClaimed,
    })
    .from(lawyers)
    .where(eq(lawyers.isActive, true))
    .orderBy(desc(lawyers.updatedAt))
    .limit(10000); // Limit to prevent memory issues

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
  const allFirms = await db
    .select({
      slug: firms.slug,
      updatedAt: firms.updatedAt,
    })
    .from(firms)
    .orderBy(desc(firms.updatedAt));

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

  for (const area of allPracticeAreas) {
    entries.push({
      url: `${BASE_URL}/lawyers/practice-area/${area.slug}`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    });
  }

  // Location pages - States
  const allStates = await db.select({ slug: states.slug }).from(states);

  for (const state of allStates) {
    entries.push({
      url: `${BASE_URL}/lawyers/location/${state.slug}`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    });
  }

  // Location pages - Cities
  const allCities = await db
    .select({
      citySlug: cities.slug,
      stateSlug: states.slug,
    })
    .from(cities)
    .innerJoin(states, eq(cities.stateId, states.id));

  for (const city of allCities) {
    entries.push({
      url: `${BASE_URL}/lawyers/location/${city.stateSlug}/${city.citySlug}`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.6,
    });
  }

  return entries;
}
