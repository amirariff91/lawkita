import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Scale, Star, Clock, MessageSquare, Users } from "lucide-react";
import type { LawyerWithRelations } from "@/types/lawyer";

interface MetricsSectionProps {
  lawyer: LawyerWithRelations;
}

export function MetricsSection({ lawyer }: MetricsSectionProps) {
  const rating = lawyer.averageRating
    ? parseFloat(lawyer.averageRating)
    : null;

  const responseRate = lawyer.responseRate
    ? parseFloat(lawyer.responseRate)
    : null;

  const avgResponseTime = lawyer.avgResponseTimeHours
    ? parseFloat(lawyer.avgResponseTimeHours)
    : null;

  const metrics = [
    {
      label: "Years at Bar",
      value: lawyer.yearsAtBar,
      format: (v: number) => `${v} ${v === 1 ? "year" : "years"}`,
      icon: Scale,
    },
    {
      label: "Average Rating",
      value: rating,
      format: (v: number) => v.toFixed(1),
      icon: Star,
      suffix: `/5`,
    },
    {
      label: "Reviews",
      value: lawyer.reviewCount,
      format: (v: number) => v.toString(),
      icon: Users,
    },
    {
      label: "Court Appearances",
      value: lawyer.courtAppearances,
      format: (v: number) => v.toString(),
      icon: Scale,
    },
    {
      label: "Response Rate",
      value: responseRate,
      format: (v: number) => `${Math.round(v)}%`,
      icon: MessageSquare,
    },
    {
      label: "Avg. Response Time",
      value: avgResponseTime,
      format: (v: number) => {
        if (v < 1) return "< 1 hour";
        if (v < 24) return `${Math.round(v)} ${v === 1 ? "hour" : "hours"}`;
        const days = Math.round(v / 24);
        return `${days} ${days === 1 ? "day" : "days"}`;
      },
      icon: Clock,
      note: "Business hours",
    },
  ].filter((m) => m.value !== null && m.value !== undefined && m.value > 0);

  if (metrics.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Statistics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {metrics.map((metric) => {
            const Icon = metric.icon;
            return (
              <div
                key={metric.label}
                className="flex flex-col items-center p-4 rounded-lg bg-muted/50 text-center"
              >
                <Icon className="size-5 text-muted-foreground mb-2" />
                <span className="text-2xl font-bold">
                  {metric.format(metric.value as number)}
                  {metric.suffix && (
                    <span className="text-sm font-normal text-muted-foreground">
                      {metric.suffix}
                    </span>
                  )}
                </span>
                <span className="text-xs text-muted-foreground mt-1">
                  {metric.label}
                </span>
                {metric.note && (
                  <span className="text-xs text-muted-foreground">
                    ({metric.note})
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
