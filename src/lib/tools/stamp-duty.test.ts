import { describe, expect, test } from "bun:test";
import {
  UnverifiedRateError,
  computeAdValorem,
  loanStampDuty,
  motStampDuty,
  tenancyRateFor,
  tenancyStampDuty,
} from "./stamp-duty";
import { MOT_TIERED, MINIMUM_DUTY } from "./rates";

// Sources for the worked examples:
// [LHDN-INTRO] LHDN, Pengenalan Duti Setem di bawah Akta Setem 1949 (updated 29 Dec 2025), Contoh 2 and 3
//   https://www.hasil.gov.my/wp-content/uploads/20251229-pengenalan-duti-setem-di-bawah-akta-setem-1949.pdf
// [LOW] Low & Partners, Stamp Duty on Instrument of Transfer and Loan Agreement
//   https://lowpartners.com/stamp-duty-instrument-transfer-loan-agreement
// [EDGE-2026] The Edge Malaysia, "Govt proposes full stamp duty exemption for first homes priced up to RM500,000" (9 Oct 2026)
//   https://theedgemalaysia.com/node/821204
// [STASHAWAY] StashAway, Stamp Duty and Administration Fees for Tenancy Agreements in Malaysia (2026)
//   https://www.stashaway.my/r/stamp-duty-tenancy-agreement-malaysia

describe("motStampDuty: local buyer, item 32(a)", () => {
  test("[LHDN-INTRO Contoh 2] RM500,000 house -> RM1,000 + RM8,000 = RM9,000", () => {
    const result = motStampDuty(500_000);
    expect(result.lines.map((l) => l.amount)).toEqual([1_000, 8_000]);
    expect(result.total).toBe(9_000);
  });

  test("[LOW] RM450,000 -> RM1,000 + RM7,000 = RM8,000", () => {
    expect(motStampDuty(450_000).total).toBe(8_000);
  });

  test("[EDGE-2026] RM700,000 home -> RM15,000", () => {
    expect(motStampDuty(700_000).total).toBe(15_000);
  });

  test("RM1,500,000 uses all four bands: 1,000 + 8,000 + 15,000 + 20,000", () => {
    const result = motStampDuty(1_500_000);
    expect(result.lines.map((l) => l.amount)).toEqual([1_000, 8_000, 15_000, 20_000]);
    expect(result.total).toBe(44_000);
  });

  test("band boundaries", () => {
    expect(motStampDuty(100_000).total).toBe(1_000);
    expect(motStampDuty(100_000).lines).toHaveLength(1);
    // RM1 over the first band is a "part" of RM100 at RM2.
    expect(motStampDuty(100_001).total).toBe(1_002);
    expect(motStampDuty(100_100).total).toBe(1_002);
    expect(motStampDuty(100_101).total).toBe(1_004);
    expect(motStampDuty(500_001).total).toBe(9_003);
    expect(motStampDuty(1_000_000).total).toBe(24_000);
    expect(motStampDuty(1_000_001).total).toBe(24_004);
  });

  test("breakdown base is the unrounded value in each band", () => {
    const result = motStampDuty(100_050.5);
    expect(result.lines.map((l) => l.base)).toEqual([100_000, 50.5]);
    expect(result.total).toBe(1_002);
  });

  test("tiny value is raised to the RM10 minimum (s.36CB)", () => {
    const result = motStampDuty(500);
    expect(result.subtotal).toBe(5);
    expect(result.minimumApplied).toBe(true);
    expect(result.total).toBe(MINIMUM_DUTY.amount);
    expect(result.tables).toContain(MINIMUM_DUTY);
  });

  test("rejects zero, negative and non-finite values", () => {
    expect(() => motStampDuty(0)).toThrow(RangeError);
    expect(() => motStampDuty(-1)).toThrow(RangeError);
    expect(() => motStampDuty(Number.NaN)).toThrow(RangeError);
  });
});

describe("motStampDuty: foreign buyer", () => {
  test("residential, item 32(ab): flat RM8 per RM100 or part", () => {
    expect(motStampDuty(1_000_000, "foreign-residential").total).toBe(80_000);
    expect(motStampDuty(500_050, "foreign-residential").total).toBe(40_008);
  });

  test("non-residential, item 32(aa): flat RM4 per RM100 or part", () => {
    expect(motStampDuty(1_000_000, "foreign-non-residential").total).toBe(40_000);
    expect(motStampDuty(1_000_001, "foreign-non-residential").total).toBe(40_004);
  });
});

describe("loanStampDuty: RM5 per RM1,000 or part", () => {
  test("[LHDN-INTRO Contoh 3] RM100,000 loan -> RM500", () => {
    expect(loanStampDuty(100_000).total).toBe(500);
  });

  test("[LOW] RM422,000 dutiable loan -> RM2,110", () => {
    expect(loanStampDuty(422_000).total).toBe(2_110);
  });

  test("part of RM1,000 is charged as a full RM1,000", () => {
    expect(loanStampDuty(450_000).total).toBe(2_250);
    expect(loanStampDuty(450_001).total).toBe(2_255);
    expect(loanStampDuty(450_000.01).total).toBe(2_255);
  });

  test("small loan is raised to the RM10 minimum", () => {
    expect(loanStampDuty(1_000).subtotal).toBe(5);
    expect(loanStampDuty(1_000).total).toBe(10);
    expect(loanStampDuty(2_000).minimumApplied).toBe(false);
    expect(loanStampDuty(2_000).total).toBe(10);
  });
});

describe("tenancyStampDuty: item 49(a), from 1 Jan 2025", () => {
  test("[STASHAWAY] RM1,500/month, 1 year -> 72 units x RM1 = RM72", () => {
    expect(tenancyStampDuty({ monthlyRent: 1_500, termMonths: 12 }).total).toBe(72);
  });

  test("[STASHAWAY] RM2,500/month, 2 years -> 120 units x RM3 = RM360", () => {
    expect(tenancyStampDuty({ monthlyRent: 2_500, termMonths: 24 }).total).toBe(360);
  });

  test("[STASHAWAY] RM2,000/month, 2 years -> 96 units x RM3 = RM288", () => {
    expect(tenancyStampDuty({ monthlyRent: 2_000, termMonths: 24 }).total).toBe(288);
  });

  test("[STASHAWAY] RM2,000/month, 6 months -> annualised RM24,000 -> RM96", () => {
    expect(tenancyStampDuty({ monthlyRent: 2_000, termMonths: 6 }).total).toBe(96);
  });

  test("[STASHAWAY] RM4,000/month, 4 years -> 192 units x RM5 = RM960", () => {
    expect(tenancyStampDuty({ monthlyRent: 4_000, termMonths: 48 }).total).toBe(960);
  });

  test("term boundaries pick the right rate", () => {
    expect(tenancyRateFor(1)).toBe(1);
    expect(tenancyRateFor(12)).toBe(1);
    expect(tenancyRateFor(13)).toBe(3);
    expect(tenancyRateFor(36)).toBe(3);
    expect(tenancyRateFor(37)).toBe(5);
    expect(tenancyRateFor(60)).toBe(5);
    expect(tenancyRateFor(61)).toBe(7);
    expect(tenancyRateFor(360)).toBe(7);
  });

  test("part of RM250 counts as a full unit", () => {
    // RM1,000 x 12 = RM12,000 = exactly 48 units.
    expect(tenancyStampDuty({ monthlyRent: 1_000, termMonths: 12 }).total).toBe(48);
    // RM1,000.01 x 12 = RM12,000.12 -> 49 units.
    expect(tenancyStampDuty({ monthlyRent: 1_000.01, termMonths: 12 }).total).toBe(49);
  });

  test("no RM2,400 exemption: first ringgit is dutiable, raised to RM10 minimum", () => {
    const result = tenancyStampDuty({ monthlyRent: 100, termMonths: 12 });
    expect(result.subtotal).toBe(5);
    expect(result.minimumApplied).toBe(true);
    expect(result.total).toBe(10);
  });

  test("rejects bad input", () => {
    expect(() => tenancyStampDuty({ monthlyRent: 0, termMonths: 12 })).toThrow(RangeError);
    expect(() => tenancyStampDuty({ monthlyRent: 1_000, termMonths: 0 })).toThrow(RangeError);
    expect(() => tenancyStampDuty({ monthlyRent: 1_000, termMonths: 1.5 })).toThrow(RangeError);
  });
});

describe("unverified tables", () => {
  test("refuse to compute", () => {
    expect(() => computeAdValorem({ ...MOT_TIERED, unverified: true }, 500_000)).toThrow(UnverifiedRateError);
  });
});
