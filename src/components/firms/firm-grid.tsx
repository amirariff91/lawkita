import { FirmCard } from "./firm-card";
import { Skeleton } from "@/components/ui/skeleton";
import type { FirmCardData } from "@/lib/db/queries/firms";

interface FirmGridProps {
  firms: FirmCardData[];
}

export function FirmGrid({ firms }: FirmGridProps) {
  if (firms.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No firms found matching your criteria.</p>
      </div>
    );
  }

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {firms.map((firm) => (
        <FirmCard key={firm.id} firm={firm} />
      ))}
    </div>
  );
}

export function FirmGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-lg border bg-card p-4">
          <div className="flex items-start gap-3">
            <Skeleton className="size-9 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
          <div className="flex items-center gap-4 mt-4 pt-3 border-t">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}
