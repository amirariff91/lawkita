import { describe, expect, test } from "bun:test";
import {
  canonicalEmail,
  canonicalPhone,
  getSelfServiceCandidates,
  getSelfServiceEligibility,
  isSelfServiceWithoutBarNumberEnabled,
} from "./self-service-eligibility";

describe("self-service claim eligibility", () => {
  test("stored number + match is eligible via on-record phone", () => {
    expect(
      getSelfServiceEligibility({
        storedBarMembershipNumber: "BC12345",
        submittedBarMembershipNumber: "BC12345",
        phone: "012-3456789",
        email: "lawyer@firm.example",
      })
    ).toEqual({ eligible: true, channel: "whatsapp", value: "012-3456789" });
  });

  test("stored number + mismatch is not eligible", () => {
    expect(
      getSelfServiceEligibility({
        storedBarMembershipNumber: "BC12345",
        submittedBarMembershipNumber: "BC99999",
        phone: "012-3456789",
        email: "lawyer@firm.example",
      })
    ).toEqual({ eligible: false });
  });

  test("stored number + empty submission is not eligible", () => {
    expect(
      getSelfServiceEligibility({
        storedBarMembershipNumber: "BC12345",
        submittedBarMembershipNumber: "",
        phone: "012-3456789",
        email: "lawyer@firm.example",
      })
    ).toEqual({ eligible: false });
    expect(
      getSelfServiceEligibility({
        storedBarMembershipNumber: "BC12345",
        submittedBarMembershipNumber: "   ",
        phone: "012-3456789",
        email: "lawyer@firm.example",
      })
    ).toEqual({ eligible: false });
  });

  test("no stored number + on-record phone is eligible", () => {
    expect(
      getSelfServiceEligibility({
        storedBarMembershipNumber: null,
        submittedBarMembershipNumber: "BC12345",
        phone: "012-3456789",
        email: "lawyer@firm.example",
        allowWithoutStoredNumber: true,
      })
    ).toEqual({ eligible: true, channel: "whatsapp", value: "012-3456789" });
  });

  test("no stored number is NOT eligible unless the switch is on", () => {
    expect(
      getSelfServiceEligibility({
        storedBarMembershipNumber: null,
        submittedBarMembershipNumber: "BC12345",
        phone: "012-3456789",
        email: "lawyer@firm.example",
      })
    ).toEqual({ eligible: false });
  });

  test("no stored number (empty after normalize) + email only is eligible", () => {
    expect(
      getSelfServiceEligibility({
        storedBarMembershipNumber: "   ",
        submittedBarMembershipNumber: "BC12345",
        phone: "  ",
        email: "lawyer@firm.example",
        allowWithoutStoredNumber: true,
      })
    ).toEqual({ eligible: true, channel: "email", value: "lawyer@firm.example" });
  });

  test("no stored number + no on-record contact is not eligible", () => {
    expect(
      getSelfServiceEligibility({
        storedBarMembershipNumber: null,
        submittedBarMembershipNumber: "BC12345",
        phone: null,
        email: "",
      })
    ).toEqual({ eligible: false });
  });

  test("stored number + match + no on-record contact is not eligible", () => {
    expect(
      getSelfServiceEligibility({
        storedBarMembershipNumber: "BC12345",
        submittedBarMembershipNumber: "BC12345",
        phone: "",
        email: null,
      })
    ).toEqual({ eligible: false });
  });

  test("normalises whitespace and case when comparing numbers", () => {
    expect(
      getSelfServiceEligibility({
        storedBarMembershipNumber: "  bc12345 ",
        submittedBarMembershipNumber: "BC12345",
        phone: "012-3456789",
        email: null,
      })
    ).toEqual({ eligible: true, channel: "whatsapp", value: "012-3456789" });
    expect(
      getSelfServiceEligibility({
        storedBarMembershipNumber: "BC12345",
        submittedBarMembershipNumber: "  Bc12345  ",
        phone: null,
        email: "lawyer@firm.example",
      })
    ).toEqual({ eligible: true, channel: "email", value: "lawyer@firm.example" });
  });

  test("candidates are ordered phone first, then email", () => {
    expect(
      getSelfServiceCandidates({
        storedBarMembershipNumber: "BC1",
        submittedBarMembershipNumber: "bc1",
        phone: "012-3456789",
        email: "a@b.example",
      })
    ).toEqual([
      { channel: "whatsapp", value: "012-3456789" },
      { channel: "email", value: "a@b.example" },
    ]);
  });

  test("phone variants that reach the same WhatsApp account are equal", () => {
    const variants = ["012-345 6789", "0123456789", "+60 12-345 6789", " 60123456789 "];
    expect(new Set(variants.map(canonicalPhone))).toEqual(new Set(["60123456789"]));
    expect(canonicalPhone("  ")).toBeNull();
  });

  test("email compares trimmed and case-folded", () => {
    expect(canonicalEmail(" Info@Firm.MY ")).toBe("info@firm.my");
    expect(canonicalEmail("")).toBeNull();
  });

  test("the no-stored-number switch is off unless explicitly true", () => {
    expect(isSelfServiceWithoutBarNumberEnabled({})).toBe(false);
    expect(isSelfServiceWithoutBarNumberEnabled({ CLAIM_SELF_SERVICE_WITHOUT_BAR_NUMBER: "1" })).toBe(false);
    expect(isSelfServiceWithoutBarNumberEnabled({ CLAIM_SELF_SERVICE_WITHOUT_BAR_NUMBER: "true" })).toBe(true);
  });
});
