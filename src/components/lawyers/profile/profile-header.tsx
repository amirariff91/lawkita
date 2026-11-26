import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BadgeCheck,
  MapPin,
  Building2,
  Mail,
  Phone,
  Sparkles,
  AlertTriangle,
  MessageSquare,
  Scale,
  UserCheck,
  ShieldCheck,
} from "lucide-react";
import { formatFreshness } from "@/lib/utils";
import { safeHttpUrl } from "@/lib/utils/json-ld";
import { formatFirmName, formatPersonName } from "@/lib/utils/name-format";
import type { LawyerWithRelations } from "@/types/lawyer";

interface ProfileHeaderProps {
  lawyer: LawyerWithRelations;
}

export function ProfileHeader({ lawyer }: ProfileHeaderProps) {
  const initials = lawyer.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const displayName = formatPersonName(lawyer.name);
  const displayFirmName = formatFirmName(lawyer.firmName);
  const location = [lawyer.city, lawyer.state].filter(Boolean).join(", ");

  const isInactive =
    lawyer.barStatus === "deceased" ||
    lawyer.barStatus === "inactive" ||
    lawyer.barStatus === "suspended" ||
    lawyer.barStatus === "struck_off";

  const statusMessage =
    lawyer.barStatus === "deceased"
      ? "This lawyer is deceased"
      : lawyer.barStatus === "struck_off"
        ? "This lawyer is recorded as struck off the Roll"
        : lawyer.barStatus === "suspended"
          ? "This lawyer is currently recorded as suspended"
          : "This lawyer is currently recorded as inactive";

  const standingSourceUrl = safeHttpUrl(lawyer.standingSourceUrl);
  const standingSource = standingSourceUrl ? (
    <a
      href={standingSourceUrl}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className="underline"
    >
      Source
    </a>
  ) : null;

  return (
    <div className="relative">
      {/* Status banner for inactive lawyers */}
      {isInactive && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900/50 dark:bg-red-900/20">
          <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
            <AlertTriangle className="size-4" aria-hidden="true" />
            <span className="text-sm font-medium">
              {statusMessage}
              {lawyer.standingNote ? `: ${lawyer.standingNote}` : ""}
              {standingSource && <> ({standingSource})</>}
            </span>
          </div>
        </div>
      )}

      {/* A note about one credential, for a lawyer otherwise in good standing */}
      {!isInactive && lawyer.standingNote && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/50 dark:bg-amber-900/20">
          <div className="flex items-center gap-2 text-amber-900 dark:text-amber-100">
            <AlertTriangle className="size-4" aria-hidden="true" />
            <span className="text-sm">
              {lawyer.standingNote}
              {standingSource && <> ({standingSource})</>}
            </span>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-6">
        {/* Avatar */}
        <div className="relative shrink-0">
          <Avatar className={`size-24 sm:size-32 ${isInactive ? "opacity-75" : ""}`}>
            <AvatarImage
              src={lawyer.photo ?? undefined}
              alt={displayName}
              width={128}
              height={128}
              loading="eager"
            />
            <AvatarFallback className="text-2xl sm:text-3xl">
              {initials}
            </AvatarFallback>
          </Avatar>
          {lawyer.isVerified && !isInactive && (
            <div className="absolute -bottom-1 -right-1 rounded-full bg-background p-1">
              <BadgeCheck className="size-6 text-primary" aria-hidden="true" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-start gap-2">
            <h1 className={`text-2xl sm:text-3xl font-bold text-balance ${isInactive ? "text-muted-foreground" : ""}`}>
              {displayName}
            </h1>

            {/* Inactive badge */}
            {isInactive && (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="size-3" aria-hidden="true" />
                {lawyer.barStatus === "suspended"
                  ? "Suspended"
                  : lawyer.barStatus === "struck_off"
                    ? "Struck off"
                    : "Inactive"}
              </Badge>
            )}

            {/* Featured badge */}
            {lawyer.subscriptionTier === "featured" && !isInactive && (
              <Badge variant="secondary" className="gap-1">
                <Sparkles className="size-3" aria-hidden="true" />
                Featured
              </Badge>
            )}

            {/* Dual verification badges */}
            {lawyer.isVerified && (
              <Badge className="gap-1 bg-blue-600 hover:bg-blue-700">
                <ShieldCheck className="size-3" aria-hidden="true" />
                Bar Council
              </Badge>
            )}
            {lawyer.isClaimed && (
              <Badge className="gap-1 bg-green-600 hover:bg-green-700">
                <UserCheck className="size-3" aria-hidden="true" />
                Claimed
              </Badge>
            )}
          </div>

          {/* Bar membership number */}
          {lawyer.barMembershipNumber && (
            <div className="flex items-center gap-2 text-muted-foreground mt-2">
              <Scale className="size-4 shrink-0" aria-hidden="true" />
              <span className="text-sm">
                Bar No: <span className="font-medium">{lawyer.barMembershipNumber}</span>
              </span>
              {/* Data freshness indicator */}
              {lawyer.lastScrapedAt && (
                <span className="text-xs text-muted-foreground">
                  (verified {formatFreshness(lawyer.lastScrapedAt)})
                </span>
              )}
            </div>
          )}
          {lawyer.firmName && (
            <div className="flex items-center gap-2 text-muted-foreground mt-2">
              <Building2 className="size-4 shrink-0" aria-hidden="true" />
              {lawyer.firmSlug ? (
                <Link
                  href={`/firms/${lawyer.firmSlug}`}
                  className="hover:text-foreground hover:underline transition-colors"
                >
                  {displayFirmName}
                </Link>
              ) : (
                <span>{displayFirmName}</span>
              )}
              {lawyer.designation && <span>· {lawyer.designation}</span>}
            </div>
          )}

          {location && (
            <div className="flex items-center gap-2 text-muted-foreground mt-1">
              <MapPin className="size-4 shrink-0" aria-hidden="true" />
              <span>{location}</span>
            </div>
          )}

          {/* Contact info - always visible for SEO benefit */}
          <div className="flex flex-wrap gap-4 mt-3">
            {lawyer.email && (
              <a
                href={`mailto:${lawyer.email}`}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <Mail className="size-4" aria-hidden="true" />
                {lawyer.email}
              </a>
            )}
            {lawyer.phone && (
              <a
                href={`tel:${lawyer.phone}`}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <Phone className="size-4" aria-hidden="true" />
                {lawyer.phone}
              </a>
            )}
          </div>

          {/* CTA Button */}
          {!isInactive && (
            <div className="mt-4">
              <Button size="lg" className="w-full sm:w-auto" asChild>
                <Link href={`/lawyers/${lawyer.slug}/enquiry`}>
                  <MessageSquare className="mr-2 size-4" aria-hidden="true" />
                  Send Enquiry
                </Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
