import Link from "next/link";
import { getFeaturedLawyers as getFeaturedLawyerCards } from "@/lib/db/queries/lawyers";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ArrowRight,
  Star,
  BadgeCheck,
  Building2,
  MapPin,
} from "lucide-react";

interface FeaturedLawyer {
  id: string;
  name: string;
  slug: string;
  photo: string | null;
  firmName: string | null;
  city: string | null;
  state: string;
  practiceAreas: string[];
  averageRating: number | null;
  reviewCount: number;
  isVerified: boolean;
  isFeatured: boolean;
}

async function getFeaturedLawyers(): Promise<FeaturedLawyer[]> {
  const lawyerResults = await getFeaturedLawyerCards(4);
  return lawyerResults.map((lawyer) => ({
    id: lawyer.id,
    name: lawyer.name,
    slug: lawyer.slug,
    photo: lawyer.photo,
    firmName: lawyer.firmName,
    city: lawyer.city,
    state: lawyer.state ?? "Malaysia",
    practiceAreas: lawyer.practiceAreas,
    averageRating: lawyer.averageRating ? parseFloat(lawyer.averageRating) : null,
    reviewCount: lawyer.reviewCount,
    isVerified: lawyer.isVerified,
    isFeatured: lawyer.subscriptionTier === "featured",
  }));
}

export async function FeaturedLawyers() {
  const featuredLawyers = await getFeaturedLawyers();

  if (featuredLawyers.length === 0) {
    return null;
  }

  return (
    <section className="py-20 md:py-28">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <h2 className="font-heading text-2xl tracking-tight md:text-3xl">
              Featured Lawyers
            </h2>
            <p className="mt-1 text-muted-foreground">
              Top-rated legal professionals in Malaysia
            </p>
          </div>
          <Button variant="outline" asChild className="hidden sm:flex">
            <Link href="/lawyers">
              View All
              <ArrowRight className="ml-2 size-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>

        {/* Lawyers Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredLawyers.map((lawyer) => (
            <LawyerCard key={lawyer.id} lawyer={lawyer} />
          ))}
        </div>

        {/* Mobile view all button */}
        <div className="mt-8 flex justify-center sm:hidden">
          <Button variant="outline" asChild>
            <Link href="/lawyers">
              View All Lawyers
              <ArrowRight className="ml-2 size-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

interface LawyerCardProps {
  lawyer: {
    id: string;
    name: string;
    slug: string;
    photo: string | null;
    firmName: string | null;
    city: string | null;
    state: string;
    practiceAreas: string[];
    averageRating: number | null;
    reviewCount: number;
    isVerified: boolean;
    isFeatured: boolean;
  };
}

function LawyerCard({ lawyer }: LawyerCardProps) {
  const initials = lawyer.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const displayPracticeAreas = lawyer.practiceAreas.slice(0, 2);
  const remainingCount = lawyer.practiceAreas.length - 2;

  return (
    <Link href={`/lawyers/${lawyer.slug}`}>
      <Card
        variant="interactive"
        className="h-full p-6 transition-all duration-200"
      >
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <Avatar className="size-14 ring-2 ring-background">
              {lawyer.photo && (
                <AvatarImage
                  src={lawyer.photo}
                  alt={lawyer.name}
                  width={56}
                  height={56}
                  loading="lazy"
                />
              )}
              <AvatarFallback className="text-lg font-medium bg-primary/10 text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            {lawyer.isVerified && (
              <div className="absolute -bottom-1 -right-1 rounded-full bg-background p-0.5">
                <BadgeCheck className="size-4 text-blue-500" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold truncate">{lawyer.name}</h3>
              {lawyer.isFeatured && (
                <Badge
                  variant="secondary"
                  className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 text-xs"
                >
                  Featured
                </Badge>
              )}
            </div>

            {lawyer.firmName && (
              <p className="text-sm text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                <Building2 className="size-3 flex-shrink-0" aria-hidden="true" />
                {lawyer.firmName}
              </p>
            )}

            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
              <MapPin className="size-3 flex-shrink-0" aria-hidden="true" />
              {lawyer.city ? `${lawyer.city}, ${lawyer.state}` : lawyer.state}
            </p>
          </div>
        </div>

        {/* Practice Areas */}
        <div className="mt-4 flex flex-wrap gap-1.5">
          {displayPracticeAreas.map((area) => (
            <Badge key={area} variant="outline" className="text-xs font-normal">
              {area}
            </Badge>
          ))}
          {remainingCount > 0 && (
            <Badge variant="outline" className="text-xs font-normal">
              +{remainingCount}
            </Badge>
          )}
        </div>

        {/* Rating */}
        {lawyer.averageRating && (
          <div className="mt-4 flex items-center gap-1.5 text-sm">
            <Star
              className="size-4 fill-amber-400 text-amber-400"
              aria-hidden="true"
            />
            <span className="font-medium tabular-nums">
              {lawyer.averageRating.toFixed(1)}
            </span>
            <span className="text-muted-foreground">
              ({lawyer.reviewCount} reviews)
            </span>
          </div>
        )}
      </Card>
    </Link>
  );
}
