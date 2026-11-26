export function hasScrapedValue(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  return typeof value !== "string" || value.trim().length > 0;
}

// Claimed rows fill only database NULLs, not deliberately empty strings.
export function canFillLawyerField(value: unknown, isClaimed: boolean): boolean {
  if (value === null) return true;
  return !isClaimed && typeof value === "string" && value.trim().length === 0;
}
