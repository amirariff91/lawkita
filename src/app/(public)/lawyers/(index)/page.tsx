import { Suspense } from "react";
import type { Metadata } from "next";
import { searchLawyers } from "@/lib/db/queries/lawyers";
import { LawyersClient } from "./lawyers-client";
import { LawyerGridSkeleton } from "@/components/lawyers";
import { ErrorBoundary } from "@/components/error-boundary";
import { Breadcrumbs } from "@/components/seo";
import type { SearchParams } from "nuqs/server";
import { lawyerSearchParamsCache } from "@/lib/search/search-params";
import type { ExperienceLevel, SortOption } from "@/types/lawyer";

const baseMetadata: Metadata = {
  title: "Find a Lawyer",
  description:
    "Search and connect with verified lawyers across Malaysia. Filter by practice area, location, and experience level.",
  alternates: {
    canonical: "/lawyers",
  },
  openGraph: {
    title: "Find a Lawyer",
    description:
      "Search and connect with verified lawyers across Malaysia. Filter by practice area, location, and experience level.",
  },
};

// Paginated pages are distinct result sets, so each page > 1 is its own
// canonical. Filtered/searched views canonicalise to the bare list.
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const params = await searchParams;
  // Filtered or searched views canonicalise to the bare list. Only real
  // filters count: sort order, tracking params and defaults do not.
  const filterKeys = ["query", "practiceArea", "state", "city", "experienceLevel", "showInactive"];
  const filtered = filterKeys.some((key) => {
    const value = params[key];
    const first = Array.isArray(value) ? value[0] : value;
    return first !== undefined && first !== "" && first !== "false";
  });
  if (filtered) {
    return { ...baseMetadata, alternates: { ...baseMetadata.alternates, canonical: "/lawyers" } };
  }
  const raw = params.page;
  const page = Number.parseInt(Array.isArray(raw) ? raw[0] ?? "" : raw ?? "", 10);
  const canonical = Number.isSafeInteger(page) && page > 1 ? `/lawyers?page=${page}` : "/lawyers";
  return { ...baseMetadata, alternates: { ...baseMetadata.alternates, canonical } };
}

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
      <Breadcrumbs items={[{ label: "Lawyers", href: "/lawyers" }]} />
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
