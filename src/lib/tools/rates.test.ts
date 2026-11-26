import { describe, expect, test } from "bun:test";
import { ALL_RATE_TABLES, TENANCY, VERIFIED_ON, type RateTableMeta } from "./rates";
import { formatRM, parseAmountInput } from "./format";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function upperBounds(table: RateTableMeta): (number | null)[] {
  if ("bands" in table) return (table.bands as { upTo: number | null }[]).map((b) => b.upTo);
  if ("terms" in table) return (table.terms as { maxMonths: number | null }[]).map((t) => t.maxMonths);
  return [];
}

describe("rate tables", () => {
  test.each(ALL_RATE_TABLES.map((t) => [t.id, t] as const))("%s has provenance", (_id, table) => {
    expect(table.effectiveFrom).toMatch(ISO_DATE);
    expect(table.verifiedOn).toMatch(ISO_DATE);
    expect(table.effectiveFrom <= table.verifiedOn).toBe(true);
    expect(table.source.url.startsWith("https://")).toBe(true);
    expect(table.crossCheck.length).toBeGreaterThan(0);
    for (const c of table.crossCheck) expect(c.url.startsWith("https://")).toBe(true);
    expect(table.unverified).toBeFalsy();
  });

  test.each(ALL_RATE_TABLES.map((t) => [t.id, t] as const))("%s bands ascend and end open", (_id, table) => {
    const bounds = upperBounds(table);
    if (bounds.length === 0) return;
    expect(bounds.at(-1)).toBeNull();
    const finite = bounds.filter((b): b is number => b !== null);
    expect(finite).toEqual([...finite].sort((a, b) => a - b));
  });

  test("all tables verified on the same date", () => {
    for (const t of ALL_RATE_TABLES) expect(t.verifiedOn).toBe(VERIFIED_ON);
  });

  test("tenancy has no RM2,400 exemption band", () => {
    expect(TENANCY.terms.map((t) => t.ratePerUnit)).toEqual([1, 3, 5, 7]);
  });
});

describe("format helpers", () => {
  test("formatRM", () => {
    expect(formatRM(9000)).toBe("RM9,000");
    expect(formatRM(6250.01)).toBe("RM6,250.01");
    expect(formatRM(0.5)).toBe("RM0.50");
  });

  test("parseAmountInput", () => {
    expect(parseAmountInput("RM 1,234,567")).toBe(1_234_567);
    expect(parseAmountInput("500k")).toBe(500_000);
    expect(parseAmountInput("1.2m")).toBe(1_200_000);
    expect(parseAmountInput("2500.5")).toBe(2500.5);
    expect(parseAmountInput("")).toBeNull();
    expect(parseAmountInput("0")).toBeNull();
    expect(parseAmountInput("-5")).toBeNull();
    expect(parseAmountInput("abc")).toBeNull();
  });
});

import { test as extraTest, expect as extraExpect } from "bun:test";
import { parseAmountInput } from "./format";

extraTest("an amount that rounds to nothing is not a valid amount", () => {
  extraExpect(parseAmountInput("0.001")).toBeNull();
  extraExpect(parseAmountInput("0.01")).toBe(0.01);
});
