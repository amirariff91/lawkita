import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Star, BadgeCheck, ArrowRight } from "lucide-react";
import type { LawyerCardData } from "@/types/lawyer";

interface SimilarLawyersProps {
  lawyers: LawyerCardData[];
  currentLawyerName: string;
}

export function SimilarLawyers({ lawyers, currentLawyerName }: SimilarLawyersProps) {
  if (lawyers.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Similar Lawyers
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Other lawyers you might want to consider based on practice areas and location
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2">
          {lawyers.map((lawyer) => {
            const initials = lawyer.name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2);

            const location = [lawyer.city, lawyer.state].filter(Boolean).join(", ");
            const rating = lawyer.averageRating
              ? parseFloat(lawyer.averageRating)
              : null;

            return (
              <Link
                key={lawyer.id}
                href={`/lawyers/${lawyer.slug}`}
                className="group"
              >
                <div className="flex items-start gap-3 p-3 rounded-lg border hover:bg-accent transition-colors">
                  <div className="relative shrink-0">
                    <Avatar className="size-12">
                      <AvatarImage
                        src={lawyer.photo ?? undefined}
                        alt={lawyer.name}
                        width={48}
                        height={48}
                        loading="lazy"
                      />
                      <AvatarFallback className="text-sm">{initials}</AvatarFallback>
                    </Avatar>
                    {lawyer.isVerified && (
                      <div className="absolute -bottom-0.5 -right-0.5 rounded-full bg-background p-0.5">
                        <BadgeCheck className="size-3 text-primary" aria-hidden="true" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                        {lawyer.name}
                      </h4>
                      <ArrowRight className="size-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>

                    {location && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                        <MapPin className="size-3" aria-hidden="true" />
                        <span className="truncate">{location}</span>
                      </div>
                    )}

                    {lawyer.practiceAreas.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {lawyer.practiceAreas.slice(0, 2).map((area) => (
                          <Badge key={area} variant="outline" className="text-[10px] px-1.5 py-0">
                            {area}
                          </Badge>
                        ))}
                        {lawyer.practiceAreas.length > 2 && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            +{lawyer.practiceAreas.length - 2}
                          </Badge>
                        )}
                      </div>
                    )}

                    <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                      {rating !== null && (
                        <div className="flex items-center gap-0.5">
                          <Star className="size-3 fill-yellow-400 text-yellow-400" aria-hidden="true" />
                          <span>{rating.toFixed(1)}</span>
                        </div>
                      )}
                      {lawyer.yearsAtBar !== null && (
                        <span>{lawyer.yearsAtBar} yrs exp</span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
