import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  MapPin,
  Building2,
  Star,
  Clock,
  BadgeCheck,
  Sparkles,
  AlertTriangle,
  ShieldCheck,
  UserCheck,
  GraduationCap,
} from "lucide-react";
import type { LawyerCardData } from "@/types/lawyer";

interface LawyerCardProps {
  lawyer: LawyerCardData;
}

export function LawyerCard({ lawyer }: LawyerCardProps) {
  const initials = lawyer.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const rating = lawyer.averageRating
    ? parseFloat(lawyer.averageRating)
    : null;

  const location = [lawyer.city, lawyer.state].filter(Boolean).join(", ");

  // Determine inactive status
  const isInactive =
    lawyer.barStatus === "deceased" ||
    lawyer.barStatus === "inactive" ||
    lawyer.barStatus === "suspended";

  // New to bar: admitted within last 12 months
  const isNewToBar = lawyer.yearsAtBar !== null && lawyer.yearsAtBar < 1;

  return (
    <Link href={`/lawyers/${lawyer.slug}`}>
      <Card
        className={`group h-full transition-all hover:shadow-md hover:border-primary/20 ${
          isInactive ? "opacity-75 bg-muted/30" : ""
        }`}
      >
        <CardContent className="p-4">
          <div className="flex gap-4">
            {/* Avatar */}
            <div className="relative shrink-0">
              <Avatar className={`size-16 ${isInactive ? "grayscale" : ""}`}>
                <AvatarImage
                  src={lawyer.photo ?? undefined}
                  alt={lawyer.name}
                  width={64}
                  height={64}
                  loading="lazy"
                />
                <AvatarFallback className="text-lg">{initials}</AvatarFallback>
              </Avatar>
              {/* Verification badge on avatar */}
              {lawyer.isVerified && !isInactive && (
                <div className="absolute -bottom-1 -right-1 rounded-full bg-background p-0.5">
                  <BadgeCheck className="size-4 text-primary" aria-hidden="true" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3
                    className={`font-semibold group-hover:text-primary transition-colors truncate ${
                      isInactive ? "text-muted-foreground" : "text-foreground"
                    }`}
                  >
                    {lawyer.name}
                  </h3>
                  {lawyer.firmName && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5">
                      <Building2 className="size-3 shrink-0" aria-hidden="true" />
                      <span className="truncate">{lawyer.firmName}</span>
                    </div>
                  )}
                </div>

                {/* Top-right badges */}
                <div className="flex flex-wrap gap-1 shrink-0">
                  {/* Inactive badge */}
                  {isInactive && (
                    <Badge variant="destructive" className="shrink-0 gap-1 text-xs">
                      <AlertTriangle className="size-3" aria-hidden="true" />
                      {lawyer.barStatus === "suspended" ? "Suspended" : "Inactive"}
                    </Badge>
                  )}

                  {/* Sponsored/Featured badge */}
                  {lawyer.subscriptionTier === "featured" && !isInactive && (
                    <Badge variant="secondary" className="shrink-0 gap-1">
                      <Sparkles className="size-3" aria-hidden="true" />
                      Sponsored
                    </Badge>
                  )}

                  {/* New to Bar badge */}
                  {isNewToBar && !isInactive && (
                    <Badge variant="outline" className="shrink-0 gap-1 border-amber-500 text-amber-600">
                      <GraduationCap className="size-3" aria-hidden="true" />
                      New
                    </Badge>
                  )}
                </div>
              </div>

              {/* Location */}
              {location && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                  <MapPin className="size-3 shrink-0" aria-hidden="true" />
                  <span className="truncate">{location}</span>
                </div>
              )}

              {/* Verification badges row */}
              {(lawyer.isVerified || lawyer.isClaimed) && !isInactive && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {lawyer.isVerified && (
                    <Badge variant="outline" className="text-xs gap-1 border-blue-300 text-blue-600">
                      <ShieldCheck className="size-3" aria-hidden="true" />
                      Bar Council
                    </Badge>
                  )}
                  {lawyer.isClaimed && (
                    <Badge variant="outline" className="text-xs gap-1 border-green-300 text-green-600">
                      <UserCheck className="size-3" aria-hidden="true" />
                      Claimed
                    </Badge>
                  )}
                </div>
              )}

              {/* Practice Areas */}
              {lawyer.practiceAreas.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {lawyer.practiceAreas.slice(0, 3).map((area) => (
                    <Badge key={area} variant="outline" className="text-xs">
                      {area}
                    </Badge>
                  ))}
                  {lawyer.practiceAreas.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{lawyer.practiceAreas.length - 3}
                    </Badge>
                  )}
                </div>
              )}

              {/* Stats */}
              <div className="flex items-center gap-4 mt-3 text-sm">
                {rating !== null && (
                  <div className="flex items-center gap-1">
                    <Star className="size-4 fill-yellow-400 text-yellow-400" aria-hidden="true" />
                    <span className="font-medium">{rating.toFixed(1)}</span>
                    <span className="text-muted-foreground">
                      ({lawyer.reviewCount})
                    </span>
                  </div>
                )}

                {lawyer.yearsAtBar !== null && (
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="size-3" aria-hidden="true" />
                    <span>
                      {lawyer.yearsAtBar} {lawyer.yearsAtBar === 1 ? "year" : "years"}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bio excerpt */}
          {lawyer.bio && (
            <p className="text-sm text-muted-foreground mt-3 line-clamp-2">
              {lawyer.bio}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
