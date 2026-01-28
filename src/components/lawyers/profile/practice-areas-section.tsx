import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { PracticeArea } from "@/types/lawyer";

interface PracticeAreasSectionProps {
  practiceAreas: {
    practiceArea: PracticeArea;
    experienceLevel: "beginner" | "intermediate" | "expert" | null;
    yearsExperience: number | null;
  }[];
}

const experienceLevelConfig = {
  beginner: { label: "Beginner", progress: 33, color: "bg-yellow-500" },
  intermediate: { label: "Intermediate", progress: 66, color: "bg-blue-500" },
  expert: { label: "Expert", progress: 100, color: "bg-green-500" },
} as const;

export function PracticeAreasSection({ practiceAreas }: PracticeAreasSectionProps) {
  if (practiceAreas.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Practice Areas</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2">
          {practiceAreas.map(({ practiceArea, experienceLevel, yearsExperience }) => {
            const config = experienceLevel
              ? experienceLevelConfig[experienceLevel]
              : null;

            return (
              <div
                key={practiceArea.id}
                className="flex flex-col gap-2 rounded-lg border p-4"
              >
                <div className="flex items-start justify-between">
                  <span className="font-medium">{practiceArea.name}</span>
                  {config && (
                    <Badge variant="secondary" className="text-xs">
                      {config.label}
                    </Badge>
                  )}
                </div>

                {config && (
                  <div className="space-y-1">
                    <Progress
                      value={config.progress}
                      className="h-1.5"
                      aria-label={`${config.label} experience level in ${practiceArea.name}`}
                    />
                    {yearsExperience !== null && (
                      <p className="text-xs text-muted-foreground">
                        {yearsExperience} {yearsExperience === 1 ? "year" : "years"} experience
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
