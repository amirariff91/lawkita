import { serializeJsonLd } from "@/lib/utils/json-ld";
// Shared view and metadata for the practice area x location pages:
// /lawyers/practice-area/[area]/[state] and /[area]/[state]/[city].
// Not a route (no page.tsx here). Also exports the link list and the count
// loaders the practice area and location hubs use for their cross-links.

import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { createSearchParamsCache, parseAsInteger, type SearchParams } from "nuqs/server";
import { LawyerGrid, LawyerGridSkeleton, PaginationLink } from "@/components/lawyers";
import { Breadcrumbs, type BreadcrumbItem } from "@/components/seo";
import { Badge } from "@/components/ui/badge";
import { flattenPracticeAreas } from "@/lib/constants/practice-areas";
import { getAllStates, getStateBySlug } from "@/lib/constants/locations";
import { searchLawyers } from "@/lib/db/queries/lawyers";
import { getAreaPlaceCounts } from "@/lib/db/queries/practice-area-locations";
import { getCredentialHubItemListSchema } from "@/lib/utils/credential-hub-seo";
import {
  areaPlaceLabel,
  areaPlaceRobots,
  buildAreaPlaceDescription,
  buildAreaPlaceHeading,
  buildAreaPlaceTitle,
  countForAreaPlace,
  isLocationPageArea,
  locationHubPath,
  practiceAreaLocationPath,
  summariseAreaPlaceCounts,
  type AreaPlace,
  type AreaPlaceSummary,
  type ResolvedAreaPlace,
} from "@/lib/utils/practice-area-location-seo";
import type { LawyerSearchResult } from "@/types/lawyer";

const PAGE_SIZE = 20;

const searchParamsCache = createSearchParamsCache({
  page: parseAsInteger.withDefault(1),
});

async function pageFrom(searchParams: Promise<SearchParams>): Promise<number> {
  const { page } = await searchParamsCache.parse(searchParams);
  return Math.max(1, page);
}

function pathFor(areaSlug: string, place: AreaPlace, page = 1): string {
  return practiceAreaLocationPath(areaSlug, place.state.slug, place.city?.slug, page);
}

const emptyResult = (page: number): LawyerSearchResult => ({
  lawyers: [],
  total: 0,
  page,
  totalPages: 0,
  hasMore: false,
});

function listLawyers(areaSlug: string, place: AreaPlace, page: number, limit: number) {
  return searchLawyers({
    practiceArea: areaSlug,
    state: place.state.name,
    city: place.city?.name,
    page,
    limit,
  });
}

export async function buildAreaPlaceMetadata(
  resolved: ResolvedAreaPlace | null,
  searchParams: Promise<SearchParams>
): Promise<Metadata> {
  if (!resolved) return { title: "Page Not Found" };
  const { area, place } = resolved;
  const page = await pageFrom(searchParams);
  // Count only (limit 1). Fail closed: a failed count means noindex.
  const total = await listLawyers(area.slug, place, 1, 1)
    .then((result) => result.total)
    .catch(() => 0);

  const title = buildAreaPlaceTitle(area.name, place, page);
  const description = buildAreaPlaceDescription(area, place, total);
  return {
    title,
    description,
    // A page number past the last page is an empty page: keep it out of the index.
    robots:
      page > 1 && (page - 1) * PAGE_SIZE >= total
        ? { index: false, follow: true }
        : areaPlaceRobots(total),
    alternates: { canonical: pathFor(area.slug, place, page) },
    openGraph: { title, description },
    twitter: { card: "summary_large_image", title, description },
  };
}

export interface LinkCount {
  href: string;
  label: string;
  count: number;
}

export function LinkList({ title, items }: { title: string; items: LinkCount[] }) {
  if (items.length === 0) return null;
  return (
    <section>
      <h2 className="text-lg font-semibold mb-3">{title}</h2>
      <ul className="flex flex-wrap gap-2">
        {items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm hover:border-primary/40 hover:text-primary transition-colors"
            >
              {item.label}
              <Badge variant="secondary">{item.count}</Badge>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Grouped counts, or null (logged) if the query fails. */
export async function loadAreaPlaceSummary(filters: {
  areaSlug?: string;
  stateName?: string;
  cityName?: string;
}): Promise<AreaPlaceSummary | null> {
  try {
    return summariseAreaPlaceCounts(await getAreaPlaceCounts(filters));
  } catch (error) {
    console.error("practice-area x location: counts failed", error);
    return null;
  }
}

/** Same area in each state with results (constants order). */
export function stateLinksForArea(summary: AreaPlaceSummary | null, areaSlug: string, excludeStateSlug?: string): LinkCount[] {
  if (!summary) return [];
  return getAllStates().flatMap((state) => {
    if (state.slug === excludeStateSlug) return [];
    const count = countForAreaPlace(summary, areaSlug, { state });
    return count > 0
      ? [{ href: practiceAreaLocationPath(areaSlug, state.slug), label: state.name, count }]
      : [];
  });
}

/** Same area in each city of one state with results, optionally skipping one city. */
function cityLinksForArea(
  summary: AreaPlaceSummary | null,
  areaSlug: string,
  stateSlug: string,
  excludeCitySlug?: string
): LinkCount[] {
  const state = getStateBySlug(stateSlug);
  if (!summary || !state) return [];
  return state.cities.flatMap((city) => {
    if (city.slug === excludeCitySlug) return [];
    const count = countForAreaPlace(summary, areaSlug, { state, city });
    return count > 0
      ? [{ href: practiceAreaLocationPath(areaSlug, state.slug, city.slug), label: city.name, count }]
      : [];
  });
}

/** User-facing practice areas with results at one place, most lawyers first. */
export function areaLinksForPlace(
  summary: AreaPlaceSummary | null,
  place: AreaPlace,
  excludeAreaSlug?: string
): LinkCount[] {
  if (!summary) return [];
  return flattenPracticeAreas()
    .filter((area) => isLocationPageArea(area) && area.slug !== excludeAreaSlug)
    .flatMap((area) => {
      const count = countForAreaPlace(summary, area.slug, place);
      return count > 0 ? [{ href: pathFor(area.slug, place), label: area.name, count }] : [];
    })
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

async function AreaPlaceContent({ resolved, page }: { resolved: ResolvedAreaPlace; page: number }) {
  const { area, place } = resolved;
  const [result, sameArea, samePlace] = await Promise.all([
    listLawyers(area.slug, place, page, PAGE_SIZE).catch((error: unknown) => {
      console.error(`practice-area x location: listing ${area.slug} failed`, error);
      return emptyResult(page);
    }),
    loadAreaPlaceSummary({ areaSlug: area.slug }),
    loadAreaPlaceSummary({ stateName: place.state.name, cityName: place.city?.name }),
  ]);

  const where = areaPlaceLabel(place);
  const heading = buildAreaPlaceHeading(area.name, place);
  const schema = getCredentialHubItemListSchema({
    name: heading,
    description: buildAreaPlaceDescription(area, place, result.total),
    path: pathFor(area.slug, place, page),
    total: result.total,
    lawyers: result.lawyers,
    startPosition: (result.page - 1) * PAGE_SIZE + 1,
  });

  const cityLinks = cityLinksForArea(sameArea, area.slug, place.state.slug, place.city?.slug);
  const stateLinks = stateLinksForArea(sameArea, area.slug, place.state.slug);
  const otherAreas = areaLinksForPlace(samePlace, place, area.slug);
  const broader = place.city
    ? { href: pathFor(area.slug, { state: place.state }), label: `${area.name} lawyers in ${place.state.name}` }
    : { href: practiceAreaLocationPath(area.slug), label: `${area.name} lawyers across Malaysia` };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(schema) }}
      />
      <div className="space-y-8">
        <div>
          <p className="text-sm text-muted-foreground mb-4">
            {result.total} {area.name.toLowerCase()} {result.total === 1 ? "lawyer" : "lawyers"} listed in {where}
          </p>
          <LawyerGrid
            lawyers={result.lawyers}
            emptyMessage={`No ${area.name.toLowerCase()} lawyers in ${where} are listed on LawKita yet.`}
          />
          {result.total === 0 && (
            <p className="mt-2 text-center text-sm">
              <Link href={broader.href} className="text-primary hover:underline">
                See {broader.label}
              </Link>
            </p>
          )}
          {result.totalPages > 1 && (
            <div className="mt-8">
              <PaginationLink
                currentPage={result.page}
                totalPages={result.totalPages}
                getPageUrl={(n) => pathFor(area.slug, place, n)}
              />
            </div>
          )}
        </div>

        <LinkList
          title={
            place.city
              ? `${area.name} lawyers in other cities in ${place.state.name}`
              : `${area.name} lawyers by city in ${place.state.name}`
          }
          items={cityLinks}
        />
        <LinkList title={`${area.name} lawyers in other states`} items={stateLinks} />
        <LinkList title={`Other practice areas in ${where}`} items={otherAreas} />

        <nav aria-label="Related pages" className="text-sm text-muted-foreground space-y-1">
          {place.city && (
            <p>
              <Link href={pathFor(area.slug, { state: place.state })} className="text-primary hover:underline">
                {area.name} lawyers in {place.state.name}
              </Link>
            </p>
          )}
          <p>
            <Link href={practiceAreaLocationPath(area.slug)} className="text-primary hover:underline">
              {area.name} lawyers across Malaysia
            </Link>
          </p>
          <p>
            <Link href={locationHubPath(place)} className="text-primary hover:underline">
              All lawyers in {where}
            </Link>
          </p>
        </nav>
      </div>
    </>
  );
}

export async function AreaPlacePage({
  resolved,
  searchParams,
}: {
  resolved: ResolvedAreaPlace;
  searchParams: Promise<SearchParams>;
}) {
  const { area, parent, place } = resolved;
  const page = await pageFrom(searchParams);

  const crumbs: BreadcrumbItem[] = [
    { label: "Lawyers", href: "/lawyers" },
    { label: "Practice Areas", href: "/lawyers/practice-area" },
    { label: area.name, href: practiceAreaLocationPath(area.slug) },
    { label: place.state.name, href: practiceAreaLocationPath(area.slug, place.state.slug) },
  ];
  if (place.city) {
    crumbs.push({
      label: place.city.name,
      href: practiceAreaLocationPath(area.slug, place.state.slug, place.city.slug),
    });
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <Breadcrumbs items={crumbs} />
      <h1 className="text-3xl font-bold tracking-tight mb-4">
        {buildAreaPlaceHeading(area.name, place)}
      </h1>
      <div className="text-muted-foreground mb-8 max-w-3xl space-y-3">
        <p>{area.description}</p>
        {parent && (
          <p>
            {area.name} is part of{" "}
            <Link
              href={pathFor(parent.slug, place)}
              className="text-primary hover:underline"
            >
              {parent.name.toLowerCase()} in {areaPlaceLabel(place)}
            </Link>
            .
          </p>
        )}
      </div>
      <Suspense fallback={<LawyerGridSkeleton count={6} />}>
        <AreaPlaceContent resolved={resolved} page={page} />
      </Suspense>
    </div>
  );
}
