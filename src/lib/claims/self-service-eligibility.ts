export type SelfServiceChannel = "whatsapp" | "email";

export type SelfServiceEligibility =
  | { eligible: true; channel: SelfServiceChannel; value: string }
  | { eligible: false };

export interface SelfServiceEligibilityInput {
  storedBarMembershipNumber: string | null | undefined;
  submittedBarMembershipNumber: string | null | undefined;
  phone: string | null | undefined;
  email: string | null | undefined;
  /**
   * Whether a record with NO stored Bar number may self-serve at all.
   * Off by default: scraped contacts are usually firm switchboards, so
   * control of the contact proves "someone at the firm", not the lawyer.
   */
  allowWithoutStoredNumber?: boolean;
}

export interface SelfServiceCandidate {
  channel: SelfServiceChannel;
  value: string;
}

/** Deployment switch for the no-stored-number path (default off). */
export function isSelfServiceWithoutBarNumberEnabled(
  environment: Record<string, string | undefined> = process.env
): boolean {
  return environment.CLAIM_SELF_SERVICE_WITHOUT_BAR_NUMBER === "true";
}

/** Phone as WhatsApp delivery sees it: digits only, Malaysian 0/local -> 60. */
export function canonicalPhone(phone: string | null | undefined): string | null {
  let digits = (phone ?? "").replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("0")) digits = "6" + digits;
  else if (!digits.startsWith("6") && digits.length <= 10) digits = "60" + digits;
  return digits;
}

export function canonicalEmail(email: string | null | undefined): string | null {
  return email?.trim().toLowerCase() || null;
}

export function normalizeBarMembershipNumber(
  value: string | null | undefined
): string | null {
  return value?.trim().toLowerCase() || null;
}

/**
 * Totally pure self-service eligibility decision for the lawyer claim flow.
 *
 * - A stored Bar membership number must match the submitted/claim number
 *   (after trimming and case folding).
 * - When no Bar number is stored, the submitted number cannot be checked
 *   against the record, so an on-record contact is sufficient.
 * - The code is only ever delivered to an on-record phone/email, never to
 *   anything the claimant supplies, so phone/email here must come from the
 *   lawyer record. Phone (WhatsApp) takes priority over email.
 */
export function getSelfServiceCandidates(
  input: SelfServiceEligibilityInput
): SelfServiceCandidate[] {
  const stored = normalizeBarMembershipNumber(
    input.storedBarMembershipNumber
  );
  const submitted = normalizeBarMembershipNumber(
    input.submittedBarMembershipNumber
  );

  // Every claim must carry a Bar number; an empty submission never verifies.
  if (!submitted) return [];
  if (stored && stored !== submitted) return [];
  if (!stored && !input.allowWithoutStoredNumber) return [];

  // Ordered by preference: phone (WhatsApp) first, then email.
  const candidates: SelfServiceCandidate[] = [];
  const onRecordPhone = input.phone?.trim() || null;
  if (onRecordPhone) candidates.push({ channel: "whatsapp", value: onRecordPhone });
  const onRecordEmail = input.email?.trim() || null;
  if (onRecordEmail) candidates.push({ channel: "email", value: onRecordEmail });
  return candidates;
}

export function getSelfServiceEligibility(
  input: SelfServiceEligibilityInput
): SelfServiceEligibility {
  const [first] = getSelfServiceCandidates(input);
  return first ? { eligible: true, ...first } : { eligible: false };
}
