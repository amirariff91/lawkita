/**
 * Scale legal fees under the Solicitors' Remuneration Order 2023 (Peninsular
 * Malaysia), plus the stamp duty from ./stamp-duty.ts for a total estimate.
 */

import { SRO_LOAN, SRO_SALE_AND_PURCHASE, type PercentScaleTable, type RateTableMeta } from "./rates";
import { formatPercent } from "./format";
import {
  assertPositiveAmount,
  assertVerified,
  bandLabel,
  loanStampDuty,
  motStampDuty,
  type BreakdownLine,
  type BuyerType,
  type CalcResult,
} from "./stamp-duty";

function roundSen(amount: number): number {
  return Math.round(amount * 100) / 100;
}

export function percentRateLabel(percent: number, negotiable?: boolean): string {
  return negotiable ? `Up to ${formatPercent(percent)} (negotiable)` : formatPercent(percent);
}

export interface ScaleFeeResult extends CalcResult {
  /** True when part of the fee falls in a negotiable band, so the total is a ceiling. */
  includesNegotiable: boolean;
}

/** Apply a percentage scale with a minimum fee. */
export function computeScaleFee(table: PercentScaleTable, value: number): ScaleFeeResult {
  assertVerified(table);
  assertPositiveAmount(value, "Amount");

  const lines: BreakdownLine[] = [];
  let lower = 0;
  let includesNegotiable = false;

  table.bands.forEach((band, index) => {
    if (value <= lower) return;
    const upper = band.upTo === null ? value : Math.min(band.upTo, value);
    const portion = upper - lower;
    if (band.negotiable) includesNegotiable = true;
    lines.push({
      label: bandLabel(lower, band.upTo, index === 0),
      base: roundSen(portion),
      rateLabel: percentRateLabel(band.percent, band.negotiable),
      amount: roundSen((portion * band.percent) / 100),
    });
    lower = upper;
  });

  const subtotal = roundSen(lines.reduce((sum, line) => sum + line.amount, 0));
  const minimumApplied = subtotal < table.minimumFee;
  return {
    lines,
    subtotal,
    minimumApplied,
    total: minimumApplied ? table.minimumFee : subtotal,
    tables: [table],
    includesNegotiable,
  };
}

/** Scale fee for the sale and purchase agreement on a property of `price`. */
export function spaLegalFee(price: number): ScaleFeeResult {
  return computeScaleFee(SRO_SALE_AND_PURCHASE, price);
}

/** Scale fee for the principal loan document on a loan of `loanAmount`. */
export function loanLegalFee(loanAmount: number): ScaleFeeResult {
  return computeScaleFee(SRO_LOAN, loanAmount);
}

export interface PurchaseCostInput {
  /** Purchase price or market value, whichever is higher. */
  price: number;
  /** 0 or omitted when the purchase is not financed. */
  loanAmount?: number;
  buyer?: BuyerType;
}

export interface PurchaseCostItem {
  key: "spa-fee" | "loan-fee" | "mot-duty" | "loan-duty";
  label: string;
  result: CalcResult;
  /** True when the figure is a ceiling rather than a fixed amount. */
  isCeiling: boolean;
}

export interface PurchaseCostEstimate {
  items: PurchaseCostItem[];
  legalFees: number;
  stampDuty: number;
  total: number;
  tables: RateTableMeta[];
}

/**
 * Legal fees for the SPA and loan agreement, plus stamp duty on the transfer
 * and the loan. Excludes disbursements, SST on legal fees, exemptions and
 * remissions, and any discount the solicitor may give.
 */
export function purchaseCostEstimate({ price, loanAmount = 0, buyer = "local" }: PurchaseCostInput): PurchaseCostEstimate {
  assertPositiveAmount(price, "Property price");
  if (!Number.isFinite(loanAmount) || loanAmount < 0) {
    throw new RangeError("Loan amount must be zero or a positive number");
  }

  const spa = spaLegalFee(price);
  const items: PurchaseCostItem[] = [
    { key: "spa-fee", label: "Legal fee: sale and purchase agreement", result: spa, isCeiling: spa.includesNegotiable },
  ];

  if (loanAmount > 0) {
    const loan = loanLegalFee(loanAmount);
    items.push({ key: "loan-fee", label: "Legal fee: loan agreement", result: loan, isCeiling: loan.includesNegotiable });
  }

  items.push({ key: "mot-duty", label: "Stamp duty: Memorandum of Transfer", result: motStampDuty(price, buyer), isCeiling: false });

  if (loanAmount > 0) {
    items.push({ key: "loan-duty", label: "Stamp duty: loan agreement", result: loanStampDuty(loanAmount), isCeiling: false });
  }

  const sum = (keys: PurchaseCostItem["key"][]) =>
    roundSen(items.filter((i) => keys.includes(i.key)).reduce((s, i) => s + i.result.total, 0));

  const legalFees = sum(["spa-fee", "loan-fee"]);
  const stampDuty = sum(["mot-duty", "loan-duty"]);
  const tables = Array.from(new Map(items.flatMap((i) => i.result.tables).map((t) => [t.id, t])).values());

  return { items, legalFees, stampDuty, total: roundSen(legalFees + stampDuty), tables };
}
