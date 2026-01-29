import Link from "next/link";
import { Building2, MapPin, Users, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { FirmCardData } from "@/lib/db/queries/firms";

interface FirmCardProps {
  firm: FirmCardData;
}

export function FirmCard({ firm }: FirmCardProps) {
  const location = [firm.city, firm.state].filter(Boolean).join(", ");

  return (
    <Link href={`/firms/${firm.slug}`}>
      <Card className="h-full transition-shadow transition-colors hover:shadow-md hover:border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/10 shrink-0">
              <Building2 className="size-5 text-primary" aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm line-clamp-2">{firm.name}</h3>
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
