import { DEFAULT_OG_IMAGES } from "@/lib/utils/seo";
import { Suspense } from "react";
import type { Metadata } from "next";
import { searchFirms } from "@/lib/db/queries/firms";
import { FirmsClient } from "./firms-client";
import { FirmGridSkeleton } from "@/components/firms";
import { ErrorBoundary } from "@/components/error-boundary";
import { Breadcrumbs } from "@/components/seo";
import type { SearchParams } from "nuqs/server";
import { firmSearchParamsCache } from "@/lib/search/firm-search-params";

const baseMetadata: Metadata = {
  title: "Law Firms",
  description:
    "Browse law firms across Malaysia. Find the right firm for your legal needs.",
  alternates: {
    canonical: "/firms",
  },
  openGraph: { images: DEFAULT_OG_IMAGES,
    title: "Law Firms",
    description:
      "Browse law firms across Malaysia. Find the right firm for your legal needs.",
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
  const filterKeys = ["query", "state", "city", "practiceArea"];
  const filtered = filterKeys.some((key) => {
    const value = params[key];
    const first = Array.isArray(value) ? value[0] : value;
    return first !== undefined && first !== "" && first !== "false";
  });
  if (filtered) {
    return { ...baseMetadata, alternates: { ...baseMetadata.alternates, canonical: "/firms" } };
  }
  const raw = params.page;
  const page = Number.parseInt(Array.isArray(raw) ? raw[0] ?? "" : raw ?? "", 10);
  const canonical = Number.isSafeInteger(page) && page > 1 ? `/firms?page=${page}` : "/firms";
  return { ...baseMetadata, alternates: { ...baseMetadata.alternates, canonical } };
}

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
