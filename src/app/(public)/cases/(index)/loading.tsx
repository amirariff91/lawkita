import { Skeleton } from "@/components/ui/skeleton";
import { CaseGridSkeleton } from "@/components/cases";

export default function CasesLoading() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-5 w-96 mt-2" />
      </div>

      {/* Search skeleton */}
      <Skeleton className="h-10 w-full max-w-2xl mb-6" />

      {/* Filters skeleton */}
      <div className="space-y-4 mb-6">
        <Skeleton className="h-5 w-20" />
        <div className="flex gap-2">
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-6 w-24" />
        </div>
      </div>

      <CaseGridSkeleton count={6} />
    </div>
  );
}
