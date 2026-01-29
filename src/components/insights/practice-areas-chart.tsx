"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Scale, ArrowRight } from "lucide-react";
import type { PracticeAreaStats } from "@/lib/db/queries/analytics";

interface PracticeAreasChartProps {
  data: PracticeAreaStats[];
  limit?: number;
}

export function PracticeAreasChart({ data, limit = 12 }: PracticeAreasChartProps) {
  const displayData = data.slice(0, limit);
  const maxCount = Math.max(...displayData.map((d) => d.count), 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Scale className="size-5 text-muted-foreground" />
          Popular Practice Areas
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {displayData.map((item, index) => {
            const barWidth = (item.count / maxCount) * 100;

            return (
              <Link
                key={item.slug}
                href={`/lawyers?practiceArea=${item.slug}`}
                className="group block"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground w-5">
                    {index + 1}.
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                        {item.name}
                      </span>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {item.count.toLocaleString()}
                        </Badge>
                        <ArrowRight className="size-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary/60 rounded-full transition-all group-hover:bg-primary"
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {data.length > limit && (
          <Link
            href="/practice-areas"
            className="mt-4 text-sm text-primary hover:underline flex items-center gap-1"
          >
            View all practice areas
            <ArrowRight className="size-3" />
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
