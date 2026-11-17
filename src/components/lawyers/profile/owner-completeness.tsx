"use client";

import { useSession } from "@/lib/auth-client";
import { CompletenessIndicator } from "./completeness-indicator";
import type { ProfileCompletenessResult } from "@/lib/utils/profile";

/**
 * Owner-only wrapper around the profile completeness checklist.
 * Renders only when the signed-in user owns this lawyer profile; anonymous
 * visitors and other signed-in users see nothing. Gating is client-side so the
 * public profile page does not read headers(). Only the owner id and the
 * precomputed score cross the server/client boundary, never the lawyer row.
 */
export function OwnerCompleteness({
  ownerUserId,
  completeness,
}: {
  ownerUserId: string | null;
  completeness: ProfileCompletenessResult;
}) {
  const { data: session } = useSession();

  if (!ownerUserId || session?.user?.id !== ownerUserId) {
    return null;
  }

  return (
    <div className="rounded-lg border bg-card p-6">
      <CompletenessIndicator completeness={completeness} showDetails />
    </div>
  );
}
