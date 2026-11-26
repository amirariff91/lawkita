import { describe, expect, test } from "bun:test";
import { computeScaleFee, loanLegalFee, purchaseCostEstimate, spaLegalFee } from "./legal-fees";
import { SRO_SALE_AND_PURCHASE } from "./rates";
import { UnverifiedRateError } from "./stamp-duty";

// Scale: Solicitors' Remuneration Order 2023, First Schedule Table A and Third Schedule Table A:
// first RM500,000 1.25% (minimum RM500), next RM7,000,000 1%, excess over RM7.5m negotiable up to 1%.
// [CONVENTUS] https://conventuslaw.com/report/malaysia-the-solicitors-remuneration-order-2023/
// [EDGE-2023] https://theedgemalaysia.com/node/675093
// The RM500,000 -> RM6,250 fee also appears in EdgeProp's SRO 2017 vs 2023 comparison table.

describe("spaLegalFee (SRO 2023, First Schedule Table A)", () => {
  test("[CONVENTUS/EDGE-2023] RM500,000 -> 1.25% = RM6,250", () => {
    const fee = spaLegalFee(500_000);
    expect(fee.total).toBe(6_250);
    expect(fee.lines).toHaveLength(1);
  });

  test("RM1,000,000 -> RM6,250 + 1% of RM500,000 = RM11,250", () => {
    const fee = spaLegalFee(1_000_000);
    expect(fee.lines.map((l) => l.amount)).toEqual([6_250, 5_000]);
    expect(fee.total).toBe(11_250);
  });

  test("RM7,500,000 is the top of the fixed scale: RM76,250", () => {
    const fee = spaLegalFee(7_500_000);
    expect(fee.total).toBe(76_250);
    expect(fee.includesNegotiable).toBe(false);
  });

  test("above RM7.5m the excess is negotiable, capped at 1%", () => {
    const fee = spaLegalFee(8_000_000);
    expect(fee.lines.map((l) => l.amount)).toEqual([6_250, 70_000, 5_000]);
    expect(fee.total).toBe(81_250);
    expect(fee.includesNegotiable).toBe(true);
  });

  test("RM500 minimum fee: boundary at RM40,000", () => {
    expect(spaLegalFee(40_000).total).toBe(500);
    expect(spaLegalFee(40_000).minimumApplied).toBe(false);
    expect(spaLegalFee(39_999).subtotal).toBe(499.99);
    expect(spaLegalFee(39_999).total).toBe(500);
    expect(spaLegalFee(39_999).minimumApplied).toBe(true);
    expect(spaLegalFee(30_000).total).toBe(500);
  });

  test("band boundary at RM500,000", () => {
    expect(spaLegalFee(500_001).total).toBe(6_250.01);
  });

  test("rejects bad input and unverified tables", () => {
    expect(() => spaLegalFee(0)).toThrow(RangeError);
    expect(() => computeScaleFee({ ...SRO_SALE_AND_PURCHASE, unverified: true }, 500_000)).toThrow(
      UnverifiedRateError,
    );
  });
});

describe("loanLegalFee (SRO 2023, Third Schedule Table A, principal instrument)", () => {
  test("same scale as the SPA: RM450,000 loan -> RM5,625", () => {
    expect(loanLegalFee(450_000).total).toBe(5_625);
  });
});

describe("purchaseCostEstimate", () => {
  test("RM500,000 purchase with RM450,000 loan", () => {
    const estimate = purchaseCostEstimate({ price: 500_000, loanAmount: 450_000 });
    expect(estimate.items.map((i) => [i.key, i.result.total])).toEqual([
      ["spa-fee", 6_250],
      ["loan-fee", 5_625],
      ["mot-duty", 9_000], // LHDN Contoh 2
      ["loan-duty", 2_250],
    ]);
    expect(estimate.legalFees).toBe(11_875);
    expect(estimate.stampDuty).toBe(11_250);
    expect(estimate.total).toBe(23_125);
  });

  test("cash purchase has no loan items", () => {
    const estimate = purchaseCostEstimate({ price: 500_000 });
    expect(estimate.items.map((i) => i.key)).toEqual(["spa-fee", "mot-duty"]);
    expect(estimate.total).toBe(15_250);
  });

  test("foreign residential buyer uses the 8% transfer rate", () => {
    const estimate = purchaseCostEstimate({ price: 1_000_000, buyer: "foreign-residential" });
    expect(estimate.stampDuty).toBe(80_000);
  });

  test("lists each rate table once", () => {
    const estimate = purchaseCostEstimate({ price: 500_000, loanAmount: 450_000 });
    const ids = estimate.tables.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual(["sro-sale-and-purchase", "sro-loan", "mot-tiered", "loan-agreement"]);
  });

  test("rejects a negative loan", () => {
    expect(() => purchaseCostEstimate({ price: 500_000, loanAmount: -1 })).toThrow(RangeError);
  });
});
