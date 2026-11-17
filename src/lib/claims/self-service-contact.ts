import { and, ne, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { lawyers } from "@/lib/db/schema";
import {
  canonicalDestination,
  getSelfServiceCandidates,
  isSelfServiceWithoutBarNumberEnabled,
  type SelfServiceCandidate,
} from "./self-service-eligibility";

// Same canonical forms as canonicalPhone() / canonicalEmail(), in SQL.
const phoneDigitsSql = sql<string>`NULLIF(regexp_replace(${lawyers.phone}, '[^0-9]', '', 'g'), '')`;
const canonicalPhoneSql = sql<string>`(
  CASE
    WHEN ${phoneDigitsSql} LIKE '0%' THEN '6' || ${phoneDigitsSql}
    WHEN ${phoneDigitsSql} NOT LIKE '6%' AND length(${phoneDigitsSql}) <= 10
      THEN '60' || ${phoneDigitsSql}
    ELSE ${phoneDigitsSql}
  END
)`;
const canonicalEmailSql = sql<string>`NULLIF(lower(regexp_replace(${lawyers.email}, '[ \\t\\n\\r\\f\\v]', '', 'g')), '')`;

async function isContactOnAnotherLawyer(
  lawyerId: string,
  candidate: SelfServiceCandidate
): Promise<boolean> {
  const canonical = canonicalDestination(candidate);
  // A contact with no deliverable canonical form cannot prove anything.
  if (!canonical) return true;
  const match =
    candidate.channel === "whatsapp"
      ? sql`${canonicalPhoneSql} = ${canonical}`
      : sql`${canonicalEmailSql} = ${canonical}`;
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
