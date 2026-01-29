import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Star, BadgeCheck, ThumbsUp, ThumbsDown, PenLine } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { Review } from "@/types/lawyer";

interface ReviewsSectionProps {
  reviews: Review[];
  averageRating: string | null;
  reviewCount: number;
  lawyerSlug: string;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div
      className="flex items-center gap-0.5"
      role="img"
      aria-label={`${rating} out of 5 stars`}
    >
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          aria-hidden="true"
          className={`size-4 ${
            i < rating
              ? "fill-amber-400 text-amber-400 dark:fill-amber-500 dark:text-amber-500"
              : "fill-muted text-muted"
          }`}
        />
      ))}
    </div>
  );
}

function ReviewCard({ review }: { review: Review }) {
  const initials = review.reviewerName
    ? review.reviewerName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "AN";

  return (
    <div className="border-b last:border-0 pb-6 last:pb-0">
      <div className="flex items-start gap-3">
        <Avatar className="size-10 shrink-0">
          <AvatarFallback className="text-sm">{initials}</AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">
              {review.reviewerName || "Anonymous"}
            </span>
            {review.isVerified && (
              <Badge variant="secondary" className="gap-1 text-xs">
                <BadgeCheck className="size-3" />
                Verified
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2 mt-1">
            <StarRating rating={review.overallRating} />
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(review.createdAt), {
                addSuffix: true,
              })}
            </span>
          </div>

          {review.title && (
            <h4 className="font-medium mt-3">{review.title}</h4>
          )}

          {review.content && (
            <p className="text-sm text-muted-foreground mt-2">
              {review.content}
            </p>
          )}

          {/* Pros/Cons */}
          {(review.pros || review.cons) && (
            <div className="flex flex-col sm:flex-row gap-4 mt-3">
              {review.pros && (
                <div className="flex-1">
                  <div className="flex items-center gap-1 text-sm font-medium text-green-600 dark:text-green-400">
                    <ThumbsUp className="size-3" aria-hidden="true" />
                    Pros
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {review.pros}
                  </p>
                </div>
              )}
              {review.cons && (
                <div className="flex-1">
                  <div className="flex items-center gap-1 text-sm font-medium text-red-600 dark:text-red-400">
                    <ThumbsDown className="size-3" aria-hidden="true" />
                    Cons
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {review.cons}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Detailed ratings */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs text-muted-foreground">
            {review.communicationRating && (
              <span>Communication: {review.communicationRating}/5</span>
            )}
            {review.expertiseRating && (
              <span>Expertise: {review.expertiseRating}/5</span>
            )}
            {review.responsivenessRating && (
              <span>Responsiveness: {review.responsivenessRating}/5</span>
            )}
            {review.valueRating && (
              <span>Value: {review.valueRating}/5</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ReviewsSection({
  reviews,
  averageRating,
  reviewCount,
  lawyerSlug,
}: ReviewsSectionProps) {
  const rating = averageRating ? parseFloat(averageRating) : null;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <CardTitle>Reviews</CardTitle>
            {rating !== null && (
              <div className="flex items-center gap-2">
                <StarRating rating={Math.round(rating)} />
                <span className="font-bold">{rating.toFixed(1)}</span>
                <span className="text-sm text-muted-foreground">
                  ({reviewCount} {reviewCount === 1 ? "review" : "reviews"})
                </span>
              </div>
            )}
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href={`/lawyers/${lawyerSlug}/review`}>
              <PenLine className="mr-2 h-4 w-4" />
              Write a Review
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {reviews.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            No reviews yet. Be the first to leave a review!
          </p>
        ) : (
          <div className="space-y-6">
            {reviews.map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
