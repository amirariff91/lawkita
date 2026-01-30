import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Suspense } from "react";
import { getLawyersByPracticeArea } from "@/lib/db/queries/lawyers";
import { getPracticeAreaBySlug } from "@/lib/constants/practice-areas";
import { LawyerGrid, LawyerGridSkeleton, PaginationLink } from "@/components/lawyers";
import { Breadcrumbs } from "@/components/seo";
import { getPracticeAreaPageSchema } from "@/lib/utils/seo";
import { Badge } from "@/components/ui/badge";
import type { SearchParams } from "nuqs/server";
import { createSearchParamsCache, parseAsInteger } from "nuqs/server";

const searchParamsCache = createSearchParamsCache({
  page: parseAsInteger.withDefault(1),
});

interface PracticeAreaPageProps {
  params: Promise<{ area: string }>;
  searchParams: Promise<SearchParams>;
}

export async function generateMetadata({
  params,
}: PracticeAreaPageProps): Promise<Metadata> {
  const { area } = await params;
  const practiceArea = getPracticeAreaBySlug(area);

  if (!practiceArea) {
    return {
      title: "Practice Area Not Found | LawKita",
    };
  }

  const title = `${practiceArea.name} Lawyers in Malaysia | LawKita`;
  const description =
    practiceArea.description ||
    `Find experienced ${practiceArea.name.toLowerCase()} lawyers across Malaysia. Compare reviews, experience, and credentials.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
    },
  };
}

async function PracticeAreaContent({
  areaSlug,
  searchParams,
}: {
  areaSlug: string;
  searchParams: SearchParams;
}) {
  const { page } = await searchParamsCache.parse(searchParams);

  const result = await getLawyersByPracticeArea(areaSlug, 20, page);

  const getPageUrl = (pageNum: number) => {
    if (pageNum === 1) {
      return `/lawyers/practice-area/${areaSlug}`;
    }
    return `/lawyers/practice-area/${areaSlug}?page=${pageNum}`;
  };

  return (
    <>
      <p className="text-sm text-muted-foreground mb-4">
        {result.total} {result.total === 1 ? "lawyer" : "lawyers"} found
      </p>

      <LawyerGrid
        lawyers={result.lawyers}
        emptyMessage="No lawyers found in this practice area yet."
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

export default async function PracticeAreaPage({
  params,
  searchParams,
}: PracticeAreaPageProps) {
  const { area } = await params;
  const resolvedSearchParams = await searchParams;
  const practiceArea = getPracticeAreaBySlug(area);

  if (!practiceArea) {
    notFound();
  }

  const practiceAreaSchema = getPracticeAreaPageSchema(
    practiceArea.name,
    area,
    practiceArea.description
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(practiceAreaSchema) }}
      />
      <div className="container mx-auto py-8 px-4">
        <Breadcrumbs
          items={[
            { label: "Lawyers", href: "/lawyers" },
            { label: "Practice Areas", href: "/lawyers/practice-area" },
            { label: practiceArea.name, href: `/lawyers/practice-area/${area}` },
          ]}
        />

        <div className="flex flex-wrap items-center gap-3 mb-2">
          <h1 className="text-3xl font-bold tracking-tight">
            {practiceArea.name} Lawyers
          </h1>
          <Badge variant="outline" className="text-sm">
            Level {practiceArea.level}
          </Badge>
        </div>

        <p className="text-muted-foreground mb-6 max-w-2xl">
          {practiceArea.description}
        </p>

        <Suspense fallback={<LawyerGridSkeleton count={6} />}>
          <PracticeAreaContent areaSlug={area} searchParams={resolvedSearchParams} />
        </Suspense>
      </div>
    </>
  );
}
