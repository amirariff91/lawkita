import { describe, expect, test } from "bun:test";
import {
  SELF_SERVICE_MAX_ATTEMPTS,
  attemptsAfterFailure,
  formatSelfServiceToken,
  isAttemptLimitReached,
  isReissueRateLimited,
  isSelfServiceTokenExpired,
  isVerificationCodeMatch,
  parseSelfServiceToken,
} from "./verification-token";

describe("self-service verification token", () => {
  test("formats and parses a token with attempts", () => {
    expect(formatSelfServiceToken("ABC234", 0)).toBe("self-service:ABC234:0");
    expect(formatSelfServiceToken("XYZ987", 3)).toBe("self-service:XYZ987:3");
    expect(parseSelfServiceToken(formatSelfServiceToken("ABC234", 2))).toEqual({
      code: "ABC234",
      attempts: 2,
    });
  });

  test("treats legacy tokens without suffix as zero attempts", () => {
    expect(parseSelfServiceToken("self-service:ABC234")).toEqual({
      code: "ABC234",
      attempts: 0,
    });
  });

  test("rejects null, empty, or foreign tokens", () => {
    expect(parseSelfServiceToken(null)).toBeNull();
    expect(parseSelfServiceToken(undefined)).toBeNull();
    expect(parseSelfServiceToken("")).toBeNull();
    expect(parseSelfServiceToken("self-service:")).toBeNull();
    expect(parseSelfServiceToken("other:ABC234")).toBeNull();
    expect(parseSelfServiceToken("ABC234")).toBeNull();
  });

  test("treats malformed suffix defensively", () => {
    expect(parseSelfServiceToken("self-service:ABC234:abc")).toEqual({
      code: "ABC234:abc",
      attempts: 0,
    });
    expect(parseSelfServiceToken("self-service:ABC234:")).toEqual({
      code: "ABC234:",
      attempts: 0,
    });
  });

  test("increments attempts after a failure", () => {
    expect(attemptsAfterFailure(0)).toBe(1);
    expect(attemptsAfterFailure(4)).toBe(5);
  });

  test("enforces the five attempt limit", () => {
    expect(SELF_SERVICE_MAX_ATTEMPTS).toBe(5);
    expect(isAttemptLimitReached(0)).toBe(false);
    expect(isAttemptLimitReached(4)).toBe(false);
    expect(isAttemptLimitReached(5)).toBe(true);
    expect(isAttemptLimitReached(6)).toBe(true);
    expect(isAttemptLimitReached(attemptsAfterFailure(4))).toBe(true);
  });

  test("compares codes in constant time semantics", () => {
    expect(isVerificationCodeMatch("ABC234", "ABC234")).toBe(true);
    expect(isVerificationCodeMatch("ABC234", "ABC235")).toBe(false);
    expect(isVerificationCodeMatch("ABC234", "ABC23")).toBe(false);
    expect(isVerificationCodeMatch("ABC234", "ABC2345")).toBe(false);
    expect(isVerificationCodeMatch("", "")).toBe(true);
  });

  test("detects token expiry", () => {
    const now = new Date("2026-11-17T12:00:00Z");
    expect(isSelfServiceTokenExpired(null, now)).toBe(false);
    expect(isSelfServiceTokenExpired(new Date("2026-11-17T11:59:00Z"), now)).toBe(true);
    expect(isSelfServiceTokenExpired(new Date("2026-11-17T12:30:00Z"), now)).toBe(false);
    expect(isSelfServiceTokenExpired(new Date("2026-11-17T12:00:00Z"), now)).toBe(false);
  });

  test("rate-limits re-issue to once per sixty seconds", () => {
    const now = new Date("2026-11-17T12:00:00Z");
    expect(isReissueRateLimited(null, now)).toBe(false);
    expect(isReissueRateLimited(new Date("2026-11-17T11:59:30Z"), now)).toBe(true);
    expect(isReissueRateLimited(new Date("2026-11-17T11:59:00Z"), now)).toBe(false);
    expect(isReissueRateLimited(new Date("2026-11-17T11:58:00Z"), now)).toBe(false);
  });
});
