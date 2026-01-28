import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { ChevronLeft, MapPin } from "lucide-react";
import { getLawyersByLocation } from "@/lib/db/queries/lawyers";
import { getStateBySlug, getCitiesForState } from "@/lib/constants/locations";
import { LawyerGrid, LawyerGridSkeleton, PaginationLink } from "@/components/lawyers";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { SearchParams } from "nuqs/server";
import { createSearchParamsCache, parseAsInteger } from "nuqs/server";

const searchParamsCache = createSearchParamsCache({
  page: parseAsInteger.withDefault(1),
});

interface StatePageProps {
  params: Promise<{ state: string }>;
  searchParams: Promise<SearchParams>;
}

export async function generateMetadata({
  params,
}: StatePageProps): Promise<Metadata> {
  const { state: stateSlug } = await params;
  const state = getStateBySlug(stateSlug);

  if (!state) {
    return {
      title: "State Not Found | LawKita",
    };
  }

  const title = `Lawyers in ${state.name}, Malaysia | LawKita`;
  const description = `Find verified lawyers in ${state.name}. Browse by city, practice area, and experience level. Read reviews and connect with legal professionals.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
    },
  };
}

async function StateContent({
  stateSlug,
  searchParams,
}: {
  stateSlug: string;
  searchParams: SearchParams;
}) {
  const { page } = await searchParamsCache.parse(searchParams);
  const state = getStateBySlug(stateSlug);
  const cities = getCitiesForState(stateSlug);

  const result = await getLawyersByLocation(stateSlug, undefined, 20, page);

  const getPageUrl = (pageNum: number) => {
    if (pageNum === 1) {
      return `/lawyers/location/${stateSlug}`;
    }
    return `/lawyers/location/${stateSlug}?page=${pageNum}`;
  };

  return (
    <div className="space-y-8">
      {/* Cities grid */}
      {cities.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Browse by City</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {cities.map((city) => (
              <Link
                key={city.slug}
                href={`/lawyers/location/${stateSlug}/${city.slug}`}
              >
                <Card className="hover:border-primary/20 hover:shadow-sm transition-all">
                  <CardContent className="p-3 flex items-center gap-2">
                    <MapPin className="size-4 text-muted-foreground shrink-0" />
                    <span className="text-sm truncate">{city.name}</span>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Lawyers list */}
      <div>
        <h2 className="text-lg font-semibold mb-2">
          All Lawyers in {state?.name}
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          {result.total} {result.total === 1 ? "lawyer" : "lawyers"} found
        </p>

        <LawyerGrid
          lawyers={result.lawyers}
          emptyMessage={`No lawyers found in ${state?.name} yet.`}
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
      </div>
    </div>
  );
}

export default async function StatePage({
  params,
  searchParams,
}: StatePageProps) {
  const { state: stateSlug } = await params;
  const resolvedSearchParams = await searchParams;
  const state = getStateBySlug(stateSlug);

  if (!state) {
    notFound();
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <Link
          href="/lawyers"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ChevronLeft className="size-4 mr-1" />
          All Lawyers
        </Link>

        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight">
            Lawyers in {state.name}
          </h1>
          <Badge variant="outline">{state.code}</Badge>
        </div>

        <p className="text-muted-foreground mt-2 max-w-2xl">
          Find experienced lawyers across {state.name}, Malaysia. Browse by city
          or search across all {state.cities.length} cities.
        </p>
      </div>

      <Suspense fallback={<LawyerGridSkeleton count={6} />}>
        <StateContent stateSlug={stateSlug} searchParams={resolvedSearchParams} />
      </Suspense>
    </div>
  );
}
