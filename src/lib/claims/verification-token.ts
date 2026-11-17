import { timingSafeEqual } from "node:crypto";

export const SELF_SERVICE_VERIFICATION_TOKEN_PREFIX = "self-service:";
export const SELF_SERVICE_MAX_ATTEMPTS = 5;
export const SELF_SERVICE_CODE_TTL_MS = 30 * 60 * 1000;
export const SELF_SERVICE_REISSUE_COOLDOWN_MS = 60 * 1000;

export function formatSelfServiceToken(code: string, attempts: number): string {
  return `${SELF_SERVICE_VERIFICATION_TOKEN_PREFIX}${code}:${attempts}`;
}

export function parseSelfServiceToken(
  token: string | null | undefined
): { code: string; attempts: number } | null {
  if (!token || !token.startsWith(SELF_SERVICE_VERIFICATION_TOKEN_PREFIX)) {
    return null;
  }
  const rest = token.slice(SELF_SERVICE_VERIFICATION_TOKEN_PREFIX.length);
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
