import { and, ne, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { lawyers } from "@/lib/db/schema";
import {
  canonicalEmail,
  canonicalPhone,
  getSelfServiceCandidates,
  isSelfServiceWithoutBarNumberEnabled,
  type SelfServiceCandidate,
} from "./self-service-eligibility";

// Same canonical form as canonicalPhone(), computed in SQL.
const canonicalPhoneSql = sql<string>`(
  CASE
    WHEN regexp_replace(${lawyers.phone}, '\\D', '', 'g') LIKE '0%'
      THEN '6' || regexp_replace(${lawyers.phone}, '\\D', '', 'g')
    WHEN regexp_replace(${lawyers.phone}, '\\D', '', 'g') NOT LIKE '6%'
      AND length(regexp_replace(${lawyers.phone}, '\\D', '', 'g')) <= 10
      THEN '60' || regexp_replace(${lawyers.phone}, '\\D', '', 'g')
    ELSE regexp_replace(${lawyers.phone}, '\\D', '', 'g')
  END
)`;

async function isContactOnAnotherLawyer(
  lawyerId: string,
  candidate: SelfServiceCandidate
): Promise<boolean> {
  const match =
    candidate.channel === "whatsapp"
      ? sql`${canonicalPhoneSql} = ${canonicalPhone(candidate.value)}`
      : sql`lower(trim(${lawyers.email})) = ${canonicalEmail(candidate.value)}`;
  const rows = await db
    .select({ id: lawyers.id })
    .from(lawyers)
    .where(and(ne(lawyers.id, lawyerId), match))
    .limit(1);
  return rows.length > 0;
}

/**
 * The single gate for self-service claiming, used when a code is issued,
 * re-issued or resumed (POST) AND when ownership is granted (PATCH).
 *
 * Returns the on-record contact a code may go to, or null for admin review.
 * A contact that also appears on another lawyer's record (compared in the
 * canonical form delivery uses, active or not) proves nothing about which
 * lawyer holds it, so it is skipped; a unique email can still qualify when
 * the phone is shared.
 */
export async function resolveSelfServiceContact(
  lawyer: {
    id: string;
    barMembershipNumber: string | null;
    phone: string | null;
    email: string | null;
  },
  barMembershipNumberToCheck: string | null | undefined
): Promise<SelfServiceCandidate | null> {
  const candidates = getSelfServiceCandidates({
    storedBarMembershipNumber: lawyer.barMembershipNumber,
    submittedBarMembershipNumber: barMembershipNumberToCheck,
    phone: lawyer.phone,
    email: lawyer.email,
    allowWithoutStoredNumber: isSelfServiceWithoutBarNumberEnabled(),
  });
  for (const candidate of candidates) {
    if (!(await isContactOnAnotherLawyer(lawyer.id, candidate))) {
      return candidate;
    }
  }
  return null;
}
