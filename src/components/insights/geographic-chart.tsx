"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { MapPin } from "lucide-react";
import type { GeographicStats } from "@/lib/db/queries/analytics";

interface GeographicChartProps {
  data: GeographicStats[];
  title?: string;
  showPercentage?: boolean;
}

export function GeographicChart({
  data,
  title = "Lawyers by State",
  showPercentage = true,
}: GeographicChartProps) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <MapPin className="size-5 text-muted-foreground" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {data.slice(0, 14).map((item) => (
            <div key={item.state} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{item.state}</span>
                <span className="text-muted-foreground">
                  {item.count.toLocaleString()}
                  {showPercentage && (
                    <span className="ml-1">({item.percentage}%)</span>
                  )}
                </span>
              </div>
              <Progress
                value={(item.count / maxCount) * 100}
                className="h-2"
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
