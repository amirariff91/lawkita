"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import type { AdmissionTrend } from "@/lib/db/queries/analytics";

interface AdmissionTrendsChartProps {
  data: AdmissionTrend[];
}

export function AdmissionTrendsChart({ data }: AdmissionTrendsChartProps) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const minCount = Math.min(...data.map((d) => d.count));
  const range = maxCount - minCount || 1;

  // Calculate trend (comparing last 3 years average to previous 3 years)
  const recent = data.slice(-3);
  const previous = data.slice(-6, -3);
  const recentAvg = recent.reduce((sum, d) => sum + d.count, 0) / recent.length;
  const previousAvg = previous.reduce((sum, d) => sum + d.count, 0) / (previous.length || 1);
  const trendPercent = previousAvg > 0 ? ((recentAvg - previousAvg) / previousAvg) * 100 : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-lg">
            <TrendingUp className="size-5 text-muted-foreground" />
            New Admissions by Year
          </div>
          {trendPercent !== 0 && (
            <span
              className={`text-sm font-medium ${
                trendPercent > 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {trendPercent > 0 ? "+" : ""}
              {trendPercent.toFixed(1)}% trend
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Bar chart */}
        <div className="flex items-end gap-1 h-40 mb-4">
          {data.map((item) => {
            const height = ((item.count - minCount) / range) * 80 + 20; // Min 20% height

            return (
              <div
                key={item.year}
                className="flex-1 flex flex-col items-center group"
              >
                <div className="relative w-full flex justify-center mb-1">
                  <span className="absolute -top-6 text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    {item.count.toLocaleString()}
                  </span>
                </div>
                <div
                  className="w-full bg-primary/60 rounded-t hover:bg-primary transition-colors cursor-default"
                  style={{ height: `${height}%` }}
                  title={`${item.year}: ${item.count} admissions`}
                />
              </div>
            );
          })}
        </div>

        {/* X-axis labels */}
        <div className="flex gap-1">
          {data.map((item) => (
            <div key={item.year} className="flex-1 text-center">
              <span className="text-xs text-muted-foreground">
                {item.year.toString().slice(-2)}
              </span>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t">
          <div className="text-center">
            <p className="text-2xl font-bold">
              {data.reduce((sum, d) => sum + d.count, 0).toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">Total Admissions</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">
              {Math.round(data.reduce((sum, d) => sum + d.count, 0) / data.length).toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">Avg per Year</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">
              {data[data.length - 1]?.count.toLocaleString() ?? 0}
            </p>
            <p className="text-xs text-muted-foreground">This Year</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
