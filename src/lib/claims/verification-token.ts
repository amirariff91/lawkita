import { timingSafeEqual } from "node:crypto";

export const SELF_SERVICE_VERIFICATION_TOKEN_PREFIX = "self-service:";
export const SELF_SERVICE_MAX_ATTEMPTS = 5;
export const SELF_SERVICE_CODE_TTL_MS = 30 * 60 * 1000;
export const SELF_SERVICE_REISSUE_COOLDOWN_MS = 60 * 1000;

/**
 * `destination` is an opaque tag for the contact the code was sent to. A
 * token can only be redeemed while that same contact is still the one the
 * claim gate resolves, so a code sent to a phone cannot be redeemed against
 * an email (or after the record's contact changed).
 */
export function formatSelfServiceToken(
  code: string,
  attempts: number,
  destination?: string | null
): string {
  const base = `${SELF_SERVICE_VERIFICATION_TOKEN_PREFIX}${code}:${attempts}`;
  return destination ? `${base}@${destination}` : base;
}

export function parseSelfServiceToken(
  token: string | null | undefined
): { code: string; attempts: number; destination?: string } | null {
  if (!token || !token.startsWith(SELF_SERVICE_VERIFICATION_TOKEN_PREFIX)) {
    return null;
  }
  const full = token.slice(SELF_SERVICE_VERIFICATION_TOKEN_PREFIX.length);
  const at = full.lastIndexOf("@");
  const tag = at === -1 ? "" : full.slice(at + 1);
  if (at !== -1 && /^[0-9a-f]{16}$/.test(tag)) {
    const parsed = parseSelfServiceToken(
      SELF_SERVICE_VERIFICATION_TOKEN_PREFIX + full.slice(0, at)
    );
    return parsed ? { ...parsed, destination: tag } : null;
  }
  const rest = full;
  if (!rest) {
    return null;
  }
  const separatorIndex = rest.lastIndexOf(":");
  if (separatorIndex === -1) {
    return { code: rest, attempts: 0 };
  }
  const code = rest.slice(0, separatorIndex);
  const suffix = rest.slice(separatorIndex + 1);
  if (!code) {
    return null;
  }
  if (!/^\d+$/.test(suffix)) {
    return { code: rest, attempts: 0 };
  }
  const attempts = Number.parseInt(suffix, 10);
  if (!Number.isSafeInteger(attempts) || attempts < 0) {
    return null;
  }
  return { code, attempts };
}

export function attemptsAfterFailure(attempts: number): number {
  return attempts + 1;
}

export function isAttemptLimitReached(attempts: number): boolean {
  return attempts >= SELF_SERVICE_MAX_ATTEMPTS;
}

export function isVerificationCodeMatch(provided: string, stored: string): boolean {
  const providedBuffer = Buffer.from(provided);
  const storedBuffer = Buffer.from(stored);
  if (providedBuffer.length !== storedBuffer.length) {
    return false;
  }
  return timingSafeEqual(providedBuffer, storedBuffer);
}

export function isSelfServiceTokenExpired(
  expiresAt: Date | string | null | undefined,
  now: Date = new Date()
): boolean {
  if (!expiresAt) {
    return false;
  }
  const expires = expiresAt instanceof Date ? expiresAt : new Date(expiresAt);
  if (Number.isNaN(expires.getTime())) {
    return false;
  }
  return now.getTime() > expires.getTime();
}

export function isReissueRateLimited(
  updatedAt: Date | string | null | undefined,
  now: Date = new Date()
): boolean {
  if (!updatedAt) {
    return false;
  }
  const updated = updatedAt instanceof Date ? updatedAt : new Date(updatedAt);
  if (Number.isNaN(updated.getTime())) {
    return false;
  }
  return now.getTime() - updated.getTime() < SELF_SERVICE_REISSUE_COOLDOWN_MS;
}
