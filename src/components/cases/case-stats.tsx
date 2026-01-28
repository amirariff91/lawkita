import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Users, Scale, FileText, Clock } from "lucide-react";
import type { CaseWithRelations } from "@/types/case";

interface CaseStatsProps {
  caseData: CaseWithRelations;
}

export function CaseStats({ caseData }: CaseStatsProps) {
  const stats = [
    {
      label: "Duration",
      value: caseData.durationDays,
      format: (v: number) => {
        if (v < 30) return `${v} days`;
        if (v < 365) return `${Math.round(v / 30)} months`;
        return `${(v / 365).toFixed(1)} years`;
      },
      icon: Clock,
    },
    {
      label: "Witnesses",
      value: caseData.witnessCount,
      format: (v: number) => v.toString(),
      icon: Users,
    },
    {
      label: "Hearings",
      value: caseData.hearingCount,
      format: (v: number) => v.toString(),
      icon: Calendar,
    },
    {
      label: "Charges",
      value: caseData.chargeCount,
      format: (v: number) => v.toString(),
      icon: FileText,
    },
  ].filter((s) => s.value !== null && s.value !== undefined && s.value > 0);

  if (stats.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Case Statistics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="flex flex-col items-center p-4 rounded-lg bg-muted/50 text-center"
              >
                <Icon className="size-5 text-muted-foreground mb-2" />
                <span className="text-2xl font-bold">
                  {stat.format(stat.value as number)}
                </span>
                <span className="text-xs text-muted-foreground mt-1">
                  {stat.label}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
