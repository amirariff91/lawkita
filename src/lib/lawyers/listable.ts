import { sql, type SQL } from "drizzle-orm";
import { lawyerPracticeAreas, lawyers } from "@/lib/db/schema";

/**
 * A lawyer who may appear in listings, counts, "similar" and "featured"
 * blocks, and who may receive enquiries: the row is active and the lawyer is
 * in good standing. A struck-off, suspended or deceased lawyer keeps a
 * profile page (with a notice) but is not listable.
 */
export const listableLawyer: SQL = sql`(${lawyers.isActive} = true AND coalesce(${lawyers.barStatus}, 'active') = 'active')`;

export function isListableLawyer(lawyer: {
  isActive: boolean;
  barStatus: string | null;
}): boolean {
  return lawyer.isActive && (lawyer.barStatus ?? "active") === "active";
}

/**
 * A profile with enough substance to be worth indexing: a firm, a state, and
 * either an admission date or at least one practice area. Sparse profiles
 * still render, with `noindex`, and stay out of the sitemap.
 */
export const indexableLawyerProfile: SQL = sql`(
  ${listableLawyer}
  AND nullif(trim(${lawyers.firmName}), '') IS NOT NULL
  AND nullif(trim(${lawyers.state}), '') IS NOT NULL
  AND (
    ${lawyers.barAdmissionDate} IS NOT NULL
    OR EXISTS (
      SELECT 1 FROM ${lawyerPracticeAreas}
      WHERE ${lawyerPracticeAreas.lawyerId} = ${lawyers.id}
    )
  )
)`;

export function isLawyerProfileIndexable(lawyer: {
  isActive: boolean;
  barStatus: string | null;
  firmName: string | null;
  state: string | null;
  barAdmissionDate: Date | string | null;
  practiceAreaCount: number;
}): boolean {
  return (
    isListableLawyer(lawyer) &&
    Boolean(lawyer.firmName?.trim()) &&
    Boolean(lawyer.state?.trim()) &&
    (lawyer.barAdmissionDate !== null || lawyer.practiceAreaCount > 0)
  );
}
