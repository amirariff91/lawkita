import { CaseCard } from "./case-card";
import type { CaseCardData, CaseCardDataWithLawyers } from "@/types/case";

interface CaseGridProps {
  cases: CaseCardData[] | CaseCardDataWithLawyers[];
  emptyMessage?: string;
  showLawyers?: boolean;
}

function hasLawyers(
  caseData: CaseCardData | CaseCardDataWithLawyers
): caseData is CaseCardDataWithLawyers {
  return "lawyers" in caseData && Array.isArray(caseData.lawyers);
}

export function CaseGrid({
  cases,
  emptyMessage = "No cases found.",
  showLawyers = true,
}: CaseGridProps) {
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
        <CaseCard
          key={caseData.id}
          caseData={caseData}
          lawyers={hasLawyers(caseData) ? caseData.lawyers : undefined}
          showLawyers={showLawyers}
        />
      ))}
    </div>
  );
}
