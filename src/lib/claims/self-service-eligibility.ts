export type SelfServiceChannel = "whatsapp" | "email";

export type SelfServiceEligibility =
  | { eligible: true; channel: SelfServiceChannel; value: string }
  | { eligible: false };

export interface SelfServiceEligibilityInput {
  storedBarMembershipNumber: string | null | undefined;
  submittedBarMembershipNumber: string | null | undefined;
  phone: string | null | undefined;
  email: string | null | undefined;
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
export function getSelfServiceEligibility(
  input: SelfServiceEligibilityInput
): SelfServiceEligibility {
  const stored = normalizeBarMembershipNumber(
    input.storedBarMembershipNumber
  );
  const submitted = normalizeBarMembershipNumber(
    input.submittedBarMembershipNumber
  );

  // Every claim must carry a Bar number; an empty submission never verifies.
  if (!submitted) {
    return { eligible: false };
  }

  if (stored && stored !== submitted) {
    return { eligible: false };
  }

  const onRecordPhone = input.phone?.trim() || null;
  if (onRecordPhone) {
    return { eligible: true, channel: "whatsapp", value: onRecordPhone };
  }

  const onRecordEmail = input.email?.trim() || null;
  if (onRecordEmail) {
    return { eligible: true, channel: "email", value: onRecordEmail };
  }

  return { eligible: false };
}
