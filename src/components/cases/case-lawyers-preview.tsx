"use client";

import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { CaseLawyerPreview, LawyerRole } from "@/types/case";

interface CaseLawyersPreviewProps {
  lawyers: CaseLawyerPreview[];
  maxDisplay?: number;
}

const roleLabels: Record<LawyerRole, string> = {
  prosecution: "Prosecution",
  defense: "Defense",
  judge: "Judge",
  other: "Legal Team",
};

const roleColors: Record<LawyerRole, string> = {
  prosecution: "ring-red-500",
  defense: "ring-blue-500",
  judge: "ring-amber-500",
  other: "ring-gray-500",
};

function getInitials(name: string): string {
  const parts = name.split(" ").filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function CaseLawyersPreview({
  lawyers,
  maxDisplay = 3,
}: CaseLawyersPreviewProps) {
  if (lawyers.length === 0) {
    return null;
  }

  const displayedLawyers = lawyers.slice(0, maxDisplay);
  const remainingCount = lawyers.length - maxDisplay;

  return (
    <div className="flex items-center gap-1">
      <div className="flex -space-x-2">
        {displayedLawyers.map((lawyer) => (
          <Tooltip key={lawyer.lawyerId}>
            <TooltipTrigger asChild>
              <Link
                href={`/lawyers/${lawyer.slug}`}
                onClick={(e) => e.stopPropagation()}
                className="relative block"
              >
                <Avatar
                  className={`size-7 ring-2 ring-background hover:ring-primary/50 transition-all hover:z-10 ${roleColors[lawyer.role]}`}
                >
                  {lawyer.photo ? (
                    <AvatarImage
                      src={lawyer.photo}
                      alt={lawyer.name}
                      width={28}
                      height={28}
                    />
                  ) : null}
                  <AvatarFallback className="text-xs bg-muted">
                    {getInitials(lawyer.name)}
                  </AvatarFallback>
                </Avatar>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              <p className="font-medium">{lawyer.name}</p>
              <p className="text-muted-foreground">{roleLabels[lawyer.role]}</p>
            </TooltipContent>
          </Tooltip>
        ))}

        {remainingCount > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="relative flex items-center justify-center size-7 rounded-full bg-muted ring-2 ring-background text-xs font-medium text-muted-foreground hover:bg-muted/80 transition-colors cursor-default">
                +{remainingCount}
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs max-w-[200px]">
              <p className="font-medium">
                {remainingCount} more lawyer{remainingCount > 1 ? "s" : ""}
              </p>
              <ul className="mt-1 space-y-0.5">
                {lawyers.slice(maxDisplay, maxDisplay + 5).map((lawyer) => (
                  <li key={lawyer.lawyerId} className="text-muted-foreground">
                    {lawyer.name} ({roleLabels[lawyer.role]})
                  </li>
                ))}
                {lawyers.length > maxDisplay + 5 && (
                  <li className="text-muted-foreground">
                    ...and {lawyers.length - maxDisplay - 5} more
                  </li>
                )}
              </ul>
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      <span className="text-xs text-muted-foreground ml-1">
        {lawyers.length === 1
          ? "1 lawyer"
          : `${lawyers.length} lawyers`}
      </span>
    </div>
  );
}
