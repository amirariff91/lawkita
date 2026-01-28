import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Calendar, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { format } from "date-fns";
import type { CaseCardData, CaseLawyerPreview } from "@/types/case";
import { CaseLawyersPreview } from "./case-lawyers-preview";

interface CaseCardProps {
  caseData: CaseCardData;
  lawyers?: CaseLawyerPreview[];
  showLawyers?: boolean;
}

const categoryColors: Record<string, string> = {
  corruption: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  political: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  corporate: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  criminal: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  constitutional: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  other: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300",
};

const statusIcons: Record<string, React.ReactNode> = {
  ongoing: <Clock className="size-3" aria-hidden="true" />,
  concluded: <CheckCircle2 className="size-3" aria-hidden="true" />,
  appeal: <AlertCircle className="size-3" aria-hidden="true" />,
};

const statusLabels: Record<string, string> = {
  ongoing: "Ongoing",
  concluded: "Concluded",
  appeal: "Under Appeal",
};

export function CaseCard({ caseData, lawyers = [], showLawyers = true }: CaseCardProps) {
  return (
    <Link href={`/cases/${caseData.slug}`}>
      <Card className="group h-full transition-all hover:shadow-md hover:border-primary/20 flex flex-col">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <Badge
              variant="secondary"
              className={`shrink-0 ${categoryColors[caseData.category]}`}
            >
              {caseData.category.charAt(0).toUpperCase() + caseData.category.slice(1)}
            </Badge>
            {caseData.isFeatured && (
              <Badge variant="default" className="shrink-0">
                Featured
              </Badge>
            )}
          </div>
          <h3 className="font-semibold text-lg leading-tight group-hover:text-primary transition-colors line-clamp-2 mt-2">
            {caseData.title}
          </h3>
          {caseData.subtitle && (
            <p className="text-sm text-muted-foreground line-clamp-1">
              {caseData.subtitle}
            </p>
          )}
        </CardHeader>

        <CardContent className="flex-1 pb-3">
          {caseData.description && (
            <p className="text-sm text-muted-foreground line-clamp-3">
              {caseData.description}
            </p>
          )}

          {/* Tags */}
          {caseData.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-3">
              {caseData.tags.slice(0, 4).map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {caseData.tags.length > 4 && (
                <Badge variant="outline" className="text-xs">
                  +{caseData.tags.length - 4}
                </Badge>
              )}
            </div>
          )}
        </CardContent>

        {/* Lawyers Preview */}
        {showLawyers && lawyers.length > 0 && (
          <div className="px-4 pb-3">
            <CaseLawyersPreview lawyers={lawyers} maxDisplay={3} />
          </div>
        )}

        <CardFooter className="pt-3 border-t flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            {statusIcons[caseData.status]}
            <span>{statusLabels[caseData.status]}</span>
          </div>
          {caseData.verdictDate && (
            <div className="flex items-center gap-1">
              <Calendar className="size-3" aria-hidden="true" />
              <span>{format(new Date(caseData.verdictDate), "MMM yyyy")}</span>
            </div>
          )}
        </CardFooter>
      </Card>
    </Link>
  );
}
