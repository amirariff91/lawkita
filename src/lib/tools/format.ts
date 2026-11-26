/** Formatting helpers shared by the calculators and the tool pages. */

const RM_WHOLE = new Intl.NumberFormat("en-MY", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const RM_CENTS = new Intl.NumberFormat("en-MY", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** "RM1,234" for whole ringgit, "RM1,234.50" otherwise. */
export function formatRM(amount: number): string {
  const sign = amount < 0 ? "-" : "";
  const abs = Math.abs(amount);
  const formatted = Number.isInteger(abs) ? RM_WHOLE.format(abs) : RM_CENTS.format(abs);
  return `${sign}RM${formatted}`;
}

/** "1,234,567" for an input box. */
export function formatAmountInput(amount: number): string {
  return RM_CENTS.format(amount).replace(/\.00$/, "");
}

/** Parse user input like "RM 1,234,567.50" or "1.2m". Returns null if not a positive number. */
export function parseAmountInput(raw: string): number | null {
  const cleaned = raw.trim().toLowerCase().replace(/^rm/, "").replace(/[\s,]/g, "");
  if (cleaned === "") return null;
  const match = /^(\d+(?:\.\d+)?)(k|m)?$/.exec(cleaned);
  if (!match) return null;
  const multiplier = match[2] === "m" ? 1_000_000 : match[2] === "k" ? 1_000 : 1;
  const value = Number(match[1]) * multiplier;
  if (!Number.isFinite(value) || value <= 0) return null;
  // Round to sen, then check again: "0.001" rounds to nothing.
  const rounded = Math.round(value * 100) / 100;
  return rounded > 0 ? rounded : null;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** "2026-11-26" -> "26 November 2026". Parsed by hand so server and client agree regardless of timezone. */
export function formatIsoDate(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  return `${day} ${MONTHS[month - 1]} ${year}`;
}

/** 0.0125 style percentages without float noise: 1.25 -> "1.25%". */
export function formatPercent(percent: number): string {
  return `${Number(percent.toFixed(4))}%`;
}
