import { describe, expect, test } from "bun:test";
import { isLawyerProfileIndexable, isListableLawyer } from "./listable";

const base = {
  isActive: true,
  barStatus: "active",
  firmName: "Example & Co",
  state: "Selangor",
  barAdmissionDate: new Date("2010-01-01"),
  practiceAreaCount: 0,
};

describe("isListableLawyer", () => {
  test("active row in good standing is listable", () => {
    expect(isListableLawyer(base)).toBe(true);
    expect(isListableLawyer({ isActive: true, barStatus: null })).toBe(true);
  });

  test("inactive rows and non-active standing are not listable", () => {
    expect(isListableLawyer({ isActive: false, barStatus: "active" })).toBe(false);
    for (const barStatus of ["struck_off", "suspended", "deceased", "inactive"]) {
      expect(isListableLawyer({ isActive: true, barStatus })).toBe(false);
    }
  });
});

describe("isLawyerProfileIndexable", () => {
  test("needs firm, state and admission date or a practice area", () => {
    expect(isLawyerProfileIndexable(base)).toBe(true);
    expect(
      isLawyerProfileIndexable({ ...base, barAdmissionDate: null, practiceAreaCount: 2 })
    ).toBe(true);
    expect(isLawyerProfileIndexable({ ...base, barAdmissionDate: null })).toBe(false);
    expect(isLawyerProfileIndexable({ ...base, firmName: "  " })).toBe(false);
    expect(isLawyerProfileIndexable({ ...base, state: null })).toBe(false);
  });

  test("a struck-off lawyer is never indexable", () => {
    expect(isLawyerProfileIndexable({ ...base, barStatus: "struck_off" })).toBe(false);
  });
});
