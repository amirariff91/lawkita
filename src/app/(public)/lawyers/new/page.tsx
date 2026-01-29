import type { Metadata } from "next";
import Link from "next/link";
import { getNewlyAdmittedLawyers } from "@/lib/db/queries/lawyers";
import { LawyerGrid } from "@/components/lawyers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GraduationCap, Lightbulb, DollarSign, BookOpen, ChevronLeft, ChevronRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Newly Admitted Lawyers | LawKita",
  description:
    "Discover lawyers who have recently been admitted to the Malaysian Bar. Fresh perspectives, up-to-date legal knowledge, and competitive rates.",
  openGraph: {
    title: "Newly Admitted Lawyers | LawKita",
    description:
      "Discover lawyers who have recently been admitted to the Malaysian Bar. Fresh perspectives, up-to-date legal knowledge, and competitive rates.",
  },
};

interface NewLawyersPageProps {
  searchParams: Promise<{ page?: string }>;
}

export default async function NewLawyersPage({ searchParams }: NewLawyersPageProps) {
  const { page: pageParam } = await searchParams;
  const page = pageParam ? parseInt(pageParam, 10) : 1;

  const result = await getNewlyAdmittedLawyers(20, page);

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
              <GraduationCap className="size-6 text-amber-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Newly Admitted Lawyers</h1>
              <p className="text-muted-foreground">
                Lawyers admitted to the Malaysian Bar within the last 12 months
              </p>
            </div>
          </div>

          <Badge variant="secondary" className="gap-1">
            {result.total} {result.total === 1 ? "lawyer" : "lawyers"} found
          </Badge>
        </div>

        {/* Benefits Section */}
        <div className="grid sm:grid-cols-3 gap-4 mb-8">
          <div className="p-4 rounded-lg border bg-card">
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="size-4 text-amber-500" />
              <h3 className="font-medium">Fresh Perspectives</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              New lawyers bring innovative approaches and modern legal thinking to your case.
            </p>
          </div>

          <div className="p-4 rounded-lg border bg-card">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="size-4 text-blue-500" />
              <h3 className="font-medium">Current Knowledge</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Recent graduates are up-to-date with the latest legal developments and case law.
            </p>
          </div>

          <div className="p-4 rounded-lg border bg-card">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="size-4 text-green-500" />
              <h3 className="font-medium">Competitive Rates</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              New lawyers often offer more competitive rates while building their practice.
            </p>
          </div>
        </div>

        {/* Lawyer Grid */}
        {result.lawyers.length > 0 ? (
          <>
            <LawyerGrid lawyers={result.lawyers} />

            {/* Pagination */}
            {result.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                {page > 1 ? (
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/lawyers/new?page=${page - 1}`}>
                      <ChevronLeft className="size-4 mr-1" />
                      Previous
                    </Link>
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" disabled>
                    <ChevronLeft className="size-4 mr-1" />
                    Previous
                  </Button>
                )}

                <span className="text-sm text-muted-foreground px-4">
                  Page {page} of {result.totalPages}
                </span>

                {page < result.totalPages ? (
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/lawyers/new?page=${page + 1}`}>
                      Next
                      <ChevronRight className="size-4 ml-1" />
                    </Link>
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" disabled>
                    Next
                    <ChevronRight className="size-4 ml-1" />
                  </Button>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <GraduationCap className="size-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">No newly admitted lawyers found</h2>
            <p className="text-muted-foreground mb-6">
              Check back later for newly admitted lawyers to the Malaysian Bar.
            </p>
            <Button asChild>
              <Link href="/lawyers">Browse All Lawyers</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
