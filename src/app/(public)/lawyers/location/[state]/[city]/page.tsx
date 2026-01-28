import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getLawyersByLocation } from "@/lib/db/queries/lawyers";
import { getStateBySlug, getCityBySlug } from "@/lib/constants/locations";
import { LawyerGrid, LawyerGridSkeleton, PaginationLink } from "@/components/lawyers";
import type { SearchParams } from "nuqs/server";
import { createSearchParamsCache, parseAsInteger } from "nuqs/server";

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
      title: "Location Not Found | LawKita",
    };
  }

  const title = `Lawyers in ${city.name}, ${state.name} | LawKita`;
  const description = `Find verified lawyers in ${city.name}, ${state.name}. Browse by practice area and experience level. Read reviews and connect with local legal professionals.`;

  return {
    title,
    description,
    openGraph: {
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
  const result = await getLawyersByLocation(
    state?.name || stateSlug,
    city?.name,
    20,
    page
  );

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

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <Link
          href={`/lawyers/location/${stateSlug}`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ChevronLeft className="size-4 mr-1" />
          {state.name}
        </Link>

        <h1 className="text-3xl font-bold tracking-tight">
          Lawyers in {city.name}
        </h1>

        <p className="text-muted-foreground mt-2 max-w-2xl">
          Find experienced lawyers in {city.name}, {state.name}. Browse profiles,
          read reviews, and connect with local legal professionals.
        </p>
      </div>

      <Suspense fallback={<LawyerGridSkeleton count={6} />}>
        <CityContent
          stateSlug={stateSlug}
          citySlug={citySlug}
          searchParams={resolvedSearchParams}
        />
      </Suspense>
    </div>
  );
}
