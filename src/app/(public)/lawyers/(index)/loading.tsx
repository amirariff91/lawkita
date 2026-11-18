import { LawyerGridSkeleton } from "@/components/lawyers";
import { Skeleton } from "@/components/ui/skeleton";

export default function LawyersLoading() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-5 w-96 mt-2" />
      </div>

      <div className="space-y-6">
        {/* Search bar skeleton */}
        <Skeleton className="h-10 max-w-2xl" />

        {/* Filters skeleton */}
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-9 w-[200px]" />
          <Skeleton className="h-9 w-[180px]" />
          <Skeleton className="h-9 w-[180px]" />
          <Skeleton className="h-9 w-[160px]" />
        </div>

        {/* Results count skeleton */}
        <Skeleton className="h-5 w-32" />

        {/* Grid skeleton */}
        <LawyerGridSkeleton count={6} />
      </div>
    </div>
  );
}
