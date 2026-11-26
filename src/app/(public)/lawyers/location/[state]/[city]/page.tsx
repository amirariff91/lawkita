import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Suspense } from "react";
import { getLawyersByLocation } from "@/lib/db/queries/lawyers";
import { getStateBySlug, getCityBySlug } from "@/lib/constants/locations";
import { LawyerGrid, LawyerGridSkeleton, PaginationLink } from "@/components/lawyers";
import { Breadcrumbs } from "@/components/seo";
import { getLocationPageSchema, isHubPageIndexable } from "@/lib/utils/seo";
import type { SearchParams } from "nuqs/server";
import { createSearchParamsCache, parseAsInteger } from "nuqs/server";
import { areaPlaceLabel } from "@/lib/utils/practice-area-location-seo";
import { areaLinksForPlace, LinkList, loadAreaPlaceSummary } from "../../../practice-area/area-place-view";

const searchParamsCache = createSearchParamsCache({
  page: parseAsInteger.withDefault(1),
});

interface CityPageProps {
  params: Promise<{ state: string; city: string }>;
  searchParams: Promise<SearchParams>;
}

export async function generateMetadata({
  params,
}: CityPageProps): Promise<Metadata> {
  const { state: stateSlug, city: citySlug } = await params;
  const state = getStateBySlug(stateSlug);
  const city = getCityBySlug(stateSlug, citySlug);

  if (!state || !city) {
    return {
      title: "Location Not Found",
    };
  }

  const title = `Lawyers in ${city.name}, ${state.name}`;
  const description = `Find verified lawyers in ${city.name}, ${state.name}. Browse by practice area and experience level. Read reviews and connect with local legal professionals.`;
  // Count only (limit 1). If the count fails, stay indexable rather than
  // failing the page, matching the sitemap's fallback.
  const total = await getLawyersByLocation(state.name, city.name, 1, 1)
    .then((result) => result.total)
    .catch(() => Number.POSITIVE_INFINITY);
  const robots = isHubPageIndexable(total)
    ? undefined
    : { index: false, follow: true };

  return {
    title,
    description,
    robots,
    alternates: {
      canonical: `/lawyers/location/${stateSlug}/${citySlug}`,
    },
    openGraph: {
      title,
      description,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

async function CityContent({
  stateSlug,
  citySlug,
  searchParams,
}: {
  stateSlug: string;
  citySlug: string;
  searchParams: SearchParams;
}) {
  const { page } = await searchParamsCache.parse(searchParams);
  const state = getStateBySlug(stateSlug);
  const city = getCityBySlug(stateSlug, citySlug);

  // Use city name for matching since we store city names, not slugs
  const [result, areaLinks] = await Promise.all([
    getLawyersByLocation(state?.name || stateSlug, city?.name, 20, page),
    // Practice areas with results here, linking to /practice-area/[area]/[state]/[city].
    state && city
      ? loadAreaPlaceSummary({ stateName: state.name, cityName: city.name }).then((summary) =>
          areaLinksForPlace(summary, { state, city })
        )
      : Promise.resolve([]),
  ]);

  const getPageUrl = (pageNum: number) => {
    if (pageNum === 1) {
      return `/lawyers/location/${stateSlug}/${citySlug}`;
    }
    return `/lawyers/location/${stateSlug}/${citySlug}?page=${pageNum}`;
  };

  return (
    <>
      <p className="text-sm text-muted-foreground mb-4">
        {result.total} {result.total === 1 ? "lawyer" : "lawyers"} found
      </p>

      <LawyerGrid
        lawyers={result.lawyers}
        emptyMessage={`No lawyers found in ${city?.name}, ${state?.name} yet.`}
      />

      {result.totalPages > 1 && (
        <div className="mt-8">
          <PaginationLink
            currentPage={result.page}
            totalPages={result.totalPages}
            getPageUrl={getPageUrl}
          />
        </div>
      )}

      {state && city && (
        <div className="mt-10">
          <LinkList
            title={`Practice areas in ${areaPlaceLabel({ state, city })}`}
            items={areaLinks}
          />
        </div>
      )}
    </>
  );
}

export default async function CityPage({
  params,
  searchParams,
}: CityPageProps) {
  const { state: stateSlug, city: citySlug } = await params;
  const resolvedSearchParams = await searchParams;
  const state = getStateBySlug(stateSlug);
  const city = getCityBySlug(stateSlug, citySlug);

  if (!state || !city) {
    notFound();
  }

  const locationSchema = getLocationPageSchema(state.name, city.name);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(locationSchema) }}
      />
      <div className="container mx-auto py-8 px-4">
        <Breadcrumbs
          items={[
            { label: "Lawyers", href: "/lawyers" },
            { label: state.name, href: `/lawyers/location/${stateSlug}` },
            { label: city.name, href: `/lawyers/location/${stateSlug}/${citySlug}` },
          ]}
        />

        <h1 className="text-3xl font-bold tracking-tight mb-2">
          Lawyers in {city.name}
        </h1>

        <p className="text-muted-foreground mb-6 max-w-2xl">
          Find experienced lawyers in {city.name}, {state.name}. Browse profiles,
          read reviews, and connect with local legal professionals.
        </p>

        <Suspense fallback={<LawyerGridSkeleton count={6} />}>
          <CityContent
            stateSlug={stateSlug}
            citySlug={citySlug}
            searchParams={resolvedSearchParams}
          />
        </Suspense>
      </div>
    </>
  );
}
