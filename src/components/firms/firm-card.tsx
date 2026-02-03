import Link from "next/link";
import { Building2, MapPin, Users, Clock, Crown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { FirmCardData } from "@/lib/db/queries/firms";

interface FirmCardProps {
  firm: FirmCardData & { subscriptionTier?: string };
}

export function FirmCard({ firm }: FirmCardProps) {
  const location = [firm.city, firm.state].filter(Boolean).join(", ");
  const isPremium = firm.subscriptionTier === "firm_premium";

  return (
    <Link href={`/firms/${firm.slug}`}>
      <Card className={`h-full transition-shadow transition-colors hover:shadow-md hover:border-primary/20 ${isPremium ? "border-amber-200 bg-amber-50/50 dark:bg-amber-950/10" : ""}`}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-lg shrink-0 ${isPremium ? "bg-amber-100 dark:bg-amber-900/30" : "bg-primary/10"}`}>
              <Building2 className={`size-5 ${isPremium ? "text-amber-600" : "text-primary"}`} aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm line-clamp-2">{firm.name}</h3>
                {isPremium && (
                  <Badge className="bg-amber-500 text-white text-[10px] px-1.5 py-0 h-4">
                    <Crown className="size-2.5 mr-0.5" />
                    Premium
                  </Badge>
                )}
              </div>
              {location && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                  <MapPin className="size-3 shrink-0" aria-hidden="true" />
                  <span className="truncate">{location}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4 mt-4 pt-3 border-t">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="size-3" aria-hidden="true" />
              <span>
                {firm.lawyerCount} {firm.lawyerCount === 1 ? "lawyer" : "lawyers"}
              </span>
            </div>
            {firm.avgYearsExperience !== null && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="size-3" aria-hidden="true" />
                <span>{firm.avgYearsExperience.toFixed(1)} yrs avg exp</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
