import { describe, expect, test } from "bun:test";
import { getSelfServiceEligibility } from "./self-service-eligibility";

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
      })
    ).toEqual({ eligible: true, channel: "whatsapp", value: "012-3456789" });
  });

  test("no stored number (empty after normalize) + email only is eligible", () => {
    expect(
      getSelfServiceEligibility({
        storedBarMembershipNumber: "   ",
        submittedBarMembershipNumber: "BC12345",
        phone: "  ",
        email: "lawyer@firm.example",
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
});
