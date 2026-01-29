"use client";

import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  calculateProfileCompleteness,
  getCompletenessLabel,
} from "@/lib/utils";
import { CheckCircle2, Circle, Info } from "lucide-react";
import type { LawyerWithRelations } from "@/types/lawyer";

interface CompletenessIndicatorProps {
  lawyer: LawyerWithRelations;
  showDetails?: boolean;
}

export function CompletenessIndicator({
  lawyer,
  showDetails = false,
}: CompletenessIndicatorProps) {
  const { score, missingFields, breakdown } = calculateProfileCompleteness(lawyer);
  const { label, variant } = getCompletenessLabel(score);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Profile Completeness</span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="size-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>
                  Complete profiles help clients find and trust you. Add more
                  information to improve your visibility.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={variant}>{label}</Badge>
          <span className="text-sm font-semibold">{score}%</span>
        </div>
      </div>

      <Progress value={score} className="h-2" />

      {showDetails && (
        <div className="mt-4 space-y-2">
          <p className="text-sm text-muted-foreground">Profile checklist:</p>
          <ul className="space-y-1">
            {breakdown.map((item) => (
              <li
                key={item.key}
                className="flex items-center gap-2 text-sm"
              >
                {item.completed ? (
                  <CheckCircle2 className="size-4 text-green-500" />
                ) : (
                  <Circle className="size-4 text-muted-foreground" />
                )}
                <span className={item.completed ? "" : "text-muted-foreground"}>
                  {item.label}
                </span>
                <span className="text-xs text-muted-foreground ml-auto">
                  +{item.points} pts
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!showDetails && missingFields.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Missing: {missingFields.slice(0, 3).join(", ")}
          {missingFields.length > 3 && ` and ${missingFields.length - 3} more`}
        </p>
      )}
    </div>
  );
}
