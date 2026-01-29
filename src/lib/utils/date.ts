import { differenceInDays, differenceInWeeks, differenceInMonths } from "date-fns";

/**
 * Formats the freshness of a date relative to now
 * Used for displaying "Last verified X days ago" type messages
 */
export function formatFreshness(date: Date | null | undefined): string {
  if (!date) return "Unknown";

  const now = new Date();
  const days = differenceInDays(now, date);

  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;

  const weeks = differenceInWeeks(now, date);
  if (weeks < 4) return `${weeks} ${weeks === 1 ? "week" : "weeks"} ago`;

  const months = differenceInMonths(now, date);
  if (months < 12) return `${months} ${months === 1 ? "month" : "months"} ago`;

  return "over a year ago";
}

/**
 * Checks if data is considered fresh (within specified days)
 */
export function isDataFresh(date: Date | null | undefined, maxDays = 30): boolean {
  if (!date) return false;
  const days = differenceInDays(new Date(), date);
  return days <= maxDays;
}
