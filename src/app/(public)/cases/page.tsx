import { Suspense } from "react";
import type { Metadata } from "next";
import { searchCasesWithLawyers, getAllCaseTags } from "@/lib/db/queries/cases";
import { CasesClient } from "./cases-client";
import { CaseGridSkeleton } from "@/components/cases";
import type { SearchParams } from "nuqs/server";
import { createSearchParamsCache, parseAsString, parseAsInteger } from "nuqs/server";
import type { CaseCategory, CaseStatus } from "@/types/case";

export const metadata: Metadata = {
  title: "Famous Cases Explorer | LawKita",
  description:
    "Explore high-profile Malaysian legal cases. Discover case timelines, involved lawyers, and verdicts in corruption, political, corporate, and criminal cases.",
  openGraph: {
    title: "Famous Cases Explorer | LawKita",
    description:
      "Explore high-profile Malaysian legal cases. Discover case timelines, involved lawyers, and verdicts.",
  },
};

const searchParamsCache = createSearchParamsCache({
  query: parseAsString.withDefault(""),
  category: parseAsString,
  status: parseAsString,
  tag: parseAsString,
  page: parseAsInteger.withDefault(1),
});

interface CasesPageProps {
  searchParams: Promise<SearchParams>;
}

async function CasesContent({ searchParams }: { searchParams: SearchParams }) {
  try {
    const { query, category, status, tag, page } =
      await searchParamsCache.parse(searchParams);

    const [result, allTags] = await Promise.all([
      searchCasesWithLawyers({
        query: query || undefined,
        category: (category as CaseCategory) || undefined,
        status: (status as CaseStatus) || undefined,
        tag: tag || undefined,
        page: page || 1,
        limit: 12,
      }),
      getAllCaseTags(),
    ]);

    return <CasesClient initialData={result} allTags={allTags} />;
  } catch (error) {
    console.error("Failed to fetch cases:", error);
    throw error; // Re-throw to trigger error boundary
  }
}

export default async function CasesPage({ searchParams }: CasesPageProps) {
  const resolvedParams = await searchParams;

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Famous Cases Explorer</h1>
        <p className="text-muted-foreground mt-2">
          Discover high-profile Malaysian legal cases and the lawyers involved
        </p>
      </div>

      <Suspense fallback={<CaseGridSkeleton count={6} />}>
        <CasesContent searchParams={resolvedParams} />
      </Suspense>
    </div>
  );
}
