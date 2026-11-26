/**
 * Pure stamp duty calculations for Malaysia. Rates come from ./rates.ts only.
 */

import {
  LOAN_AGREEMENT,
  MINIMUM_DUTY,
  MOT_FOREIGN_NON_RESIDENTIAL,
  MOT_FOREIGN_RESIDENTIAL,
  MOT_TIERED,
  TENANCY,
  type AdValoremTable,
  type RateTableMeta,
  type TenancyTable,
} from "./rates";
import { formatPercent, formatRM } from "./format";

export interface BreakdownLine {
  label: string;
  /** Amount the rate is applied to, in RM. */
  base: number;
  rateLabel: string;
  amount: number;
}

export interface CalcResult {
  lines: BreakdownLine[];
  /** Sum of lines before any minimum. */
  subtotal: number;
  /** True when a statutory minimum raised the total. */
  minimumApplied: boolean;
  total: number;
  /** Tables used, for citing sources next to the result. */
  tables: RateTableMeta[];
}

export class UnverifiedRateError extends Error {
  constructor(table: RateTableMeta) {
    super(`Rate table "${table.id}" is marked unverified and cannot be computed.`);
    this.name = "UnverifiedRateError";
  }
}

export function assertVerified(table: RateTableMeta): void {
  if (table.unverified) throw new UnverifiedRateError(table);
}

export function assertPositiveAmount(value: number, name: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${name} must be a positive number`);
  }
}

/** Describe a band for the breakdown and the rendered table. */
export function bandLabel(lower: number, upper: number | null, isFirst: boolean): string {
  if (upper === null) return isFirst ? "Whole amount" : `Above ${formatRM(lower)}`;
  if (isFirst) return `First ${formatRM(upper)}`;
  return `Next ${formatRM(upper - lower)} (${formatRM(lower + 1)} to ${formatRM(upper)})`;
}

export function adValoremRateLabel(ratePerUnit: number, unit: number): string {
  return `RM${ratePerUnit} per ${formatRM(unit)} or part (${formatPercent((ratePerUnit / unit) * 100)})`;
}

/**
 * Apply an ad valorem table charged "for every RM{unit} or part thereof".
 * The value is rounded up to the next whole unit first. Band boundaries are
 * whole multiples of the unit, so only the top band carries the part-unit.
 */
export function computeAdValorem(table: AdValoremTable, value: number): BreakdownLine[] {
  assertVerified(table);
  assertPositiveAmount(value, "Amount");

  const units = Math.ceil(value / table.unit);
  const rounded = units * table.unit;
  const lines: BreakdownLine[] = [];
  let lower = 0;

  table.bands.forEach((band, index) => {
    if (rounded <= lower) return;
    const upper = band.upTo === null ? rounded : Math.min(band.upTo, rounded);
    const portion = upper - lower;
    const portionUnits = portion / table.unit;
    lines.push({
      label: bandLabel(lower, band.upTo, index === 0),
      // The value actually falling in this band, before rounding up.
      base: Math.min(value, band.upTo ?? value) - lower,
      rateLabel: adValoremRateLabel(band.ratePerUnit, table.unit),
      amount: portionUnits * band.ratePerUnit,
    });
    lower = upper;
  });

  return lines;
}

function finish(lines: BreakdownLine[], tables: RateTableMeta[], applyMinimum: boolean): CalcResult {
  const subtotal = lines.reduce((sum, line) => sum + line.amount, 0);
  const minimumApplied = applyMinimum && subtotal < MINIMUM_DUTY.amount;
  return {
    lines,
    subtotal,
    minimumApplied,
    total: minimumApplied ? MINIMUM_DUTY.amount : subtotal,
    tables: minimumApplied ? [...tables, MINIMUM_DUTY] : tables,
  };
}

export type BuyerType =
  | "local"
  | "foreign-residential"
  | "foreign-non-residential";

export const BUYER_TYPE_LABELS: Record<BuyerType, string> = {
  local: "Malaysian citizen, permanent resident or Malaysian company",
  "foreign-residential": "Foreign buyer, residential property",
  "foreign-non-residential": "Foreign buyer, non-residential property",
};

export function motTableFor(buyer: BuyerType): AdValoremTable {
  switch (buyer) {
    case "local":
      return MOT_TIERED;
    case "foreign-residential":
      return MOT_FOREIGN_RESIDENTIAL;
    case "foreign-non-residential":
      return MOT_FOREIGN_NON_RESIDENTIAL;
  }
}

/**
 * Stamp duty on a Memorandum of Transfer. `value` is the purchase price or the
 * market value, whichever is higher. No exemptions or remissions are applied.
 */
export function motStampDuty(value: number, buyer: BuyerType = "local"): CalcResult {
  const table = motTableFor(buyer);
  return finish(computeAdValorem(table, value), [table], true);
}

/** Stamp duty on a loan agreement for `loanAmount`. No exemptions or remissions are applied. */
export function loanStampDuty(loanAmount: number): CalcResult {
  return finish(computeAdValorem(LOAN_AGREEMENT, loanAmount), [LOAN_AGREEMENT], true);
}

export function tenancyRateFor(termMonths: number, table: TenancyTable = TENANCY): number {
  const band = table.terms.find((t) => t.maxMonths === null || termMonths <= t.maxMonths);
  // The last band is open-ended, so a band is always found.
  return band!.ratePerUnit;
}

export function tenancyTermLabel(
  lowerMonths: number,
  maxMonths: number | null,
): string {
  const years = (m: number) => (m % 12 === 0 ? `${m / 12} year${m === 12 ? "" : "s"}` : `${m} months`);
  if (lowerMonths === 0 && maxMonths !== null) return `Up to ${years(maxMonths)}`;
  if (maxMonths === null) return `More than ${years(lowerMonths)}`;
  return `More than ${years(lowerMonths)}, up to ${years(maxMonths)}`;
}

export interface TenancyInput {
  monthlyRent: number;
  /** Whole months. */
  termMonths: number;
}

/**
 * Stamp duty on a tenancy agreement with a fixed monthly rent.
 * Annual rent is monthly rent x 12; for terms under 12 months this is the
 * annualised rent LHDN asks for. Duty is RM{rate} per RM250 or part of the
 * annual rent, with the rate set by the term, subject to the RM10 minimum.
 */
export function tenancyStampDuty({ monthlyRent, termMonths }: TenancyInput): CalcResult {
  assertVerified(TENANCY);
  assertPositiveAmount(monthlyRent, "Monthly rent");
  if (!Number.isInteger(termMonths) || termMonths <= 0) {
    throw new RangeError("Tenancy term must be a whole number of months");
  }

  const annualRent = Math.round(monthlyRent * 12 * 100) / 100;
  const rate = tenancyRateFor(termMonths);
  const units = Math.ceil(annualRent / TENANCY.unit);

  const line: BreakdownLine = {
    label: `Annual rent ${formatRM(annualRent)} = ${units} unit${units === 1 ? "" : "s"} of ${formatRM(TENANCY.unit)}`,
    base: annualRent,
    rateLabel: `RM${rate} per ${formatRM(TENANCY.unit)} or part (term of ${termMonths} month${termMonths === 1 ? "" : "s"})`,
    amount: units * rate,
  };

  return finish([line], [TENANCY], true);
}
