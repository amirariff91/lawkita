import { Suspense } from "react";
import type { Metadata } from "next";
import { searchLawyers } from "@/lib/db/queries/lawyers";
import { LawyersClient } from "./lawyers-client";
import { LawyerGridSkeleton } from "@/components/lawyers";
import { ErrorBoundary } from "@/components/error-boundary";
import type { SearchParams } from "nuqs/server";
import { lawyerSearchParamsCache } from "@/lib/search/search-params";
import type { ExperienceLevel, SortOption } from "@/types/lawyer";

export const metadata: Metadata = {
  title: "Find a Lawyer | LawKita",
  description:
    "Search and connect with verified lawyers across Malaysia. Filter by practice area, location, and experience level.",
  openGraph: {
    title: "Find a Lawyer | LawKita",
    description:
      "Search and connect with verified lawyers across Malaysia. Filter by practice area, location, and experience level.",
  },
};

interface LawyersPageProps {
  searchParams: Promise<SearchParams>;
}

async function LawyersContent({ searchParams }: { searchParams: SearchParams }) {
  const {
    query,
    practiceArea,
    state,
    city,
    experienceLevel,
    showInactive,
    sort,
    page,
  } = await lawyerSearchParamsCache.parse(searchParams);

  const result = await searchLawyers({
    query: query || undefined,
    practiceArea: practiceArea || undefined,
    state: state || undefined,
    city: city || undefined,
    experienceLevel: (experienceLevel as ExperienceLevel) || undefined,
    showInactive: showInactive || false,
    sort: (sort as SortOption) || "relevance",
    page: page || 1,
    limit: 20,
  });

  return <LawyersClient initialData={result} />;
}

export default async function LawyersPage({ searchParams }: LawyersPageProps) {
  const resolvedParams = await searchParams;

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Find a Lawyer</h1>
        <p className="text-muted-foreground mt-2">
          Search and connect with verified lawyers across Malaysia
        </p>
      </div>

      <ErrorBoundary>
        <Suspense fallback={<LawyerGridSkeleton count={6} />}>
          <LawyersContent searchParams={resolvedParams} />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
