import { Suspense } from "react";
import type { Metadata } from "next";
import { searchFirms } from "@/lib/db/queries/firms";
import { FirmsClient } from "./firms-client";
import { FirmGridSkeleton } from "@/components/firms";
import { ErrorBoundary } from "@/components/error-boundary";
import { Breadcrumbs } from "@/components/seo";
import type { SearchParams } from "nuqs/server";
import { firmSearchParamsCache } from "@/lib/search/firm-search-params";

export const metadata: Metadata = {
  title: "Law Firms | LawKita",
  description:
    "Browse law firms across Malaysia. Find the right firm for your legal needs.",
  openGraph: {
    title: "Law Firms | LawKita",
    description:
      "Browse law firms across Malaysia. Find the right firm for your legal needs.",
  },
};

interface FirmsPageProps {
  searchParams: Promise<SearchParams>;
}

async function FirmsContent({ searchParams }: { searchParams: SearchParams }) {
  const { query, state, city, practiceArea, sort, page } = await firmSearchParamsCache.parse(
    searchParams
  );

  const result = await searchFirms({
    query: query || undefined,
    state: state || undefined,
    city: city || undefined,
    practiceArea: practiceArea || undefined,
    sort: sort || "lawyers",
    page: page || 1,
    limit: 21,
  });

  return <FirmsClient initialData={result} />;
}

export default async function FirmsPage({ searchParams }: FirmsPageProps) {
  const resolvedParams = await searchParams;

  return (
    <div className="container mx-auto py-8 px-4 sm:px-[max(1rem,env(safe-area-inset-left))]">
      <Breadcrumbs items={[{ label: "Firms", href: "/firms" }]} />
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Law Firms</h1>
        <p className="text-muted-foreground mt-2">
          Browse law firms across Malaysia
        </p>
      </div>

      <ErrorBoundary>
        <Suspense fallback={<FirmGridSkeleton count={6} />}>
          <FirmsContent searchParams={resolvedParams} />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
