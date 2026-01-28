import { LawyerCard } from "./lawyer-card";
import type { LawyerCardData } from "@/types/lawyer";

interface LawyerGridProps {
  lawyers: LawyerCardData[];
  emptyMessage?: string;
}

export function LawyerGrid({
  lawyers,
  emptyMessage = "No lawyers found matching your criteria.",
}: LawyerGridProps) {
  if (lawyers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {lawyers.map((lawyer) => (
        <LawyerCard key={lawyer.id} lawyer={lawyer} />
      ))}
    </div>
  );
}
