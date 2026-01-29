"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { MapPin, Star, BadgeCheck, ArrowRight, Search } from "lucide-react";
import type { LawyerCardData } from "@/types/lawyer";

interface SimilarLawyersSuggestionProps {
  lawyers: LawyerCardData[];
  searchQuery?: string;
}

export function SimilarLawyersSuggestion({
  lawyers,
  searchQuery,
}: SimilarLawyersSuggestionProps) {
  if (lawyers.length === 0) {
    return null;
  }

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Search className="size-4 text-muted-foreground" />
          <CardTitle className="text-base">You might also consider</CardTitle>
        </div>
        <p className="text-sm text-muted-foreground">
          {searchQuery
            ? `Based on your search for "${searchQuery}"`
            : "Other lawyers that match your criteria"}
        </p>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1">
          {lawyers.slice(0, 4).map((lawyer) => {
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
                className="group shrink-0 w-[200px]"
              >
                <div className="p-3 rounded-lg border hover:bg-accent transition-colors h-full">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="relative shrink-0">
                      <Avatar className="size-10">
                        <AvatarImage
                          src={lawyer.photo ?? undefined}
                          alt={lawyer.name}
                          width={40}
                          height={40}
                          loading="lazy"
                        />
                        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                      </Avatar>
                      {lawyer.isVerified && (
                        <div className="absolute -bottom-0.5 -right-0.5 rounded-full bg-background p-0.5">
                          <BadgeCheck className="size-3 text-primary" aria-hidden="true" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                        {lawyer.name}
                      </h4>
                      {location && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="size-3" aria-hidden="true" />
                          <span className="truncate">{location}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {lawyer.practiceAreas.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {lawyer.practiceAreas.slice(0, 2).map((area) => (
                        <Badge key={area} variant="outline" className="text-[10px] px-1.5 py-0">
                          {area}
                        </Badge>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      {rating !== null && (
                        <div className="flex items-center gap-0.5">
                          <Star className="size-3 fill-yellow-400 text-yellow-400" aria-hidden="true" />
                          <span>{rating.toFixed(1)}</span>
                        </div>
                      )}
                      {lawyer.yearsAtBar !== null && (
                        <span>{lawyer.yearsAtBar}y</span>
                      )}
                    </div>
                    <ArrowRight className="size-3 opacity-0 group-hover:opacity-100 transition-opacity" />
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
