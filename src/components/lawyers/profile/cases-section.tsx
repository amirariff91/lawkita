import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Scale, ArrowRight } from "lucide-react";

interface CasesSectionProps {
  cases: {
    caseId: string;
    role: "prosecution" | "defense" | "judge" | "other";
    roleDescription: string | null;
    case: {
      id: string;
      slug: string;
      title: string;
      category: string;
      status: string;
    };
  }[];
}

const roleLabels: Record<string, string> = {
  prosecution: "Prosecution",
  defense: "Defense Counsel",
  judge: "Presiding Judge",
  other: "Legal Team",
};

const statusColors: Record<string, string> = {
  ongoing: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  concluded:
    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  appeal:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
};

export function CasesSection({ cases }: CasesSectionProps) {
  if (cases.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Scale className="size-5" />
          Notable Cases
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg border border-muted mb-4">
          <p className="font-medium mb-1">Disclaimer</p>
          <p>
            Case appearances shown are compiled from public records. Listing does not imply
            endorsement of parties, outcomes, or the information presented. All persons are presumed
            innocent until proven guilty in a court of law.
          </p>
        </div>

        <div className="space-y-3">
          {cases.map(({ caseId, role, roleDescription, case: caseData }) => (
            <Link
              key={caseId}
              href={`/cases/${caseData.slug}`}
              className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors group"
            >
              <div className="min-w-0 flex-1">
                <h4 className="font-medium group-hover:text-primary transition-colors truncate">
                  {caseData.title}
                </h4>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs capitalize">
                    {caseData.category.replace("_", " ")}
                  </Badge>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${statusColors[caseData.status] || ""}`}
                  >
                    {caseData.status === "ongoing"
                      ? "Ongoing"
                      : caseData.status === "appeal"
                        ? "Under Appeal"
                        : "Concluded"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {roleDescription || roleLabels[role]}
                  </span>
                </div>
              </div>
              <ArrowRight className="size-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0 ml-4" />
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
