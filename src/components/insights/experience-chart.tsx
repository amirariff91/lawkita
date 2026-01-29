"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock } from "lucide-react";
import type { ExperienceDistribution } from "@/lib/db/queries/analytics";

interface ExperienceChartProps {
  data: ExperienceDistribution[];
}

const LEVEL_COLORS = {
  junior: "bg-blue-500",
  mid: "bg-green-500",
  senior: "bg-purple-500",
};

export function ExperienceChart({ data }: ExperienceChartProps) {
  const total = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Clock className="size-5 text-muted-foreground" />
          Experience Distribution
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Stacked bar */}
        <div className="h-8 rounded-lg overflow-hidden flex mb-6">
          {data.map((item) => (
            <div
              key={item.level}
              className={`${LEVEL_COLORS[item.level]} transition-all`}
              style={{ width: `${item.percentage}%` }}
              title={`${item.label}: ${item.count} lawyers (${item.percentage}%)`}
            />
          ))}
        </div>

        {/* Legend */}
        <div className="grid grid-cols-3 gap-4">
          {data.map((item) => (
            <div key={item.level} className="text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <div className={`size-3 rounded ${LEVEL_COLORS[item.level]}`} />
                <span className="text-sm font-medium">{item.percentage}%</span>
              </div>
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className="text-lg font-bold">{item.count.toLocaleString()}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
