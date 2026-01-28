import { CaseCard } from "./case-card";
import type { CaseCardData } from "@/types/case";

interface CaseGridProps {
  cases: CaseCardData[];
  emptyMessage?: string;
}

export function CaseGrid({ cases, emptyMessage = "No cases found." }: CaseGridProps) {
  if (cases.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      {cases.map((caseData) => (
        <CaseCard key={caseData.id} caseData={caseData} />
      ))}
    </div>
  );
}
