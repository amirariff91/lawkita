/**
 * Rate tables for the free calculators under /tools.
 *
 * This is the ONLY place rates live. The calculators in this folder and the
 * band tables rendered on each tool page both read from here, so the page text
 * cannot disagree with the result.
 *
 * Each table records where the figures come from (`source`), at least one
 * independent cross-check (`crossCheck`), the date the rule took effect
 * (`effectiveFrom`, ISO date) and the date someone last checked it against
 * those sources (`verifiedOn`). A table marked `unverified: true` must not be
 * computed: the calculator functions throw and the UI shows a refusal.
 *
 * When a rule changes: add the new table, keep the old one only if the UI
 * needs it, update `verifiedOn`, and update the worked examples in the tests.
 */

export interface RateSource {
  label: string;
  url: string;
}

export interface RateTableMeta {
  id: string;
  title: string;
  /** Statutory basis, e.g. "Stamp Act 1949, First Schedule, item 32(a)". */
  legalBasis: string;
  /** ISO date the rule took effect. */
  effectiveFrom: string;
  /** Shown instead of a bare date when the rule predates the source we cite. */
  effectiveFromNote?: string;
  /** ISO date the figures were last checked against `source` and `crossCheck`. */
  verifiedOn: string;
  source: RateSource;
  crossCheck: RateSource[];
  unverified?: boolean;
}

/** One band of an ad valorem scale. `upTo` is the cumulative upper bound in RM (null = no limit). */
export interface ValueBand {
  upTo: number | null;
  /** Ringgit of duty for every `unit` (or part of a unit) of value in this band. */
  ratePerUnit: number;
}

export interface AdValoremTable extends RateTableMeta {
  kind: "ad-valorem";
  /** Value unit the rate is charged on, e.g. 100 for "every RM100 or part thereof". */
  unit: number;
  bands: ValueBand[];
}

/** Percentage scale (used by the Solicitors' Remuneration Order). */
export interface PercentBand {
  upTo: number | null;
  /** Percent of the value falling in this band, e.g. 1.25 for 1.25%. */
  percent: number;
  /** True when the scale is a ceiling the solicitor may negotiate below. */
  negotiable?: boolean;
}

export interface PercentScaleTable extends RateTableMeta {
  kind: "percent-scale";
  bands: PercentBand[];
  minimumFee: number;
}

export interface TermBand {
  /** Upper bound of the tenancy term in months, inclusive (null = no limit). */
  maxMonths: number | null;
  /** Ringgit of duty for every `unit` (or part of a unit) of annual rent. */
  ratePerUnit: number;
}

export interface TenancyTable extends RateTableMeta {
  kind: "tenancy";
  unit: number;
  terms: TermBand[];
}

export interface MinimumDutyTable extends RateTableMeta {
  kind: "minimum-duty";
  amount: number;
}

export const VERIFIED_ON = "2026-11-26";

const LHDN_FIRST_SCHEDULE_GUIDELINE: RateSource = {
  label:
    "LHDN, Garis Panduan Pengenaan Duti Setem bagi Surat Cara yang Tertakluk kepada Jadual Pertama Akta Setem 1949 (30 June 2026)",
  url: "https://www.hasil.gov.my/wp-content/uploads/garis-panduan-pengenaan-duti-setem-jadual-pertama-as-1949.pdf",
};

const LHDN_INTRO_GUIDELINE: RateSource = {
  label:
    "LHDN, Pengenalan Duti Setem di bawah Akta Setem 1949 (6 November 2025, updated 29 December 2025)",
  url: "https://www.hasil.gov.my/wp-content/uploads/20251229-pengenalan-duti-setem-di-bawah-akta-setem-1949.pdf",
};

/**
 * Memorandum of Transfer (and other instruments of transfer of real property)
 * to a Malaysian citizen, permanent resident or Malaysian company.
 * Duty is on the consideration or market value, whichever is higher.
 */
export const MOT_TIERED: AdValoremTable = {
  kind: "ad-valorem",
  id: "mot-tiered",
  title: "Stamp duty on a property transfer (Memorandum of Transfer)",
  legalBasis: "Stamp Act 1949, First Schedule, item 32(a)",
  effectiveFrom: "2019-07-01",
  verifiedOn: VERIFIED_ON,
  source: LHDN_FIRST_SCHEDULE_GUIDELINE,
  crossCheck: [
    {
      label:
        "EdgeProp, Stamp duty increase for properties exceeding RM1m now effective July 1, 2019",
      url: "https://www.edgeprop.my/content/1457981/stamp-duty-increase-properties-exceeding-rm1m-now-effective-july-1-2019",
    },
    {
      label: "Low & Partners, Stamp Duty on Instrument of Transfer and Loan Agreement",
      url: "https://lowpartners.com/stamp-duty-instrument-transfer-loan-agreement",
    },
  ],
  unit: 100,
  bands: [
    { upTo: 100_000, ratePerUnit: 1 },
    { upTo: 500_000, ratePerUnit: 2 },
    { upTo: 1_000_000, ratePerUnit: 3 },
    { upTo: null, ratePerUnit: 4 },
  ],
};

/**
 * Transfer of residential property to a foreign company or a person who is
 * neither a citizen nor a permanent resident, for transfers from 1 Jan 2026.
 */
export const MOT_FOREIGN_RESIDENTIAL: AdValoremTable = {
  kind: "ad-valorem",
  id: "mot-foreign-residential",
  title:
    "Stamp duty on a transfer of residential property to a foreign buyer",
  legalBasis: "Stamp Act 1949, First Schedule, item 32(ab) (Finance Act 2025)",
  effectiveFrom: "2026-01-01",
  verifiedOn: VERIFIED_ON,
  source: LHDN_FIRST_SCHEDULE_GUIDELINE,
  crossCheck: [
    {
      label: "Skrine, Proposed Amendments to the Stamp Act (November 2025)",
      url: "https://www.skrine.com/insights/alerts/november-2025/proposed-amendments-to-the-stamp-act",
    },
    {
      label: "KPMG, Malaysia: Tax measures in Finance Act 2025",
      url: "https://kpmg.com/us/en/taxnewsflash/news/2026/01/malaysia-tax-measures-finance-act-2025.html",
    },
  ],
  unit: 100,
  bands: [{ upTo: null, ratePerUnit: 8 }],
};

/** Transfer of any other (non-residential) property to a foreign buyer. */
export const MOT_FOREIGN_NON_RESIDENTIAL: AdValoremTable = {
  kind: "ad-valorem",
  id: "mot-foreign-non-residential",
  title:
    "Stamp duty on a transfer of non-residential property to a foreign buyer",
  legalBasis: "Stamp Act 1949, First Schedule, item 32(aa)",
  effectiveFrom: "2024-01-01",
  verifiedOn: VERIFIED_ON,
  source: LHDN_FIRST_SCHEDULE_GUIDELINE,
  crossCheck: [
    {
      label: "Skrine, The Proposed Amendments to the Stamp Act 1949 (November 2023)",
      url: "https://www.skrine.com/insights/alerts/november-2023/the-proposed-amendments-to-the-stamp-act-1949",
    },
  ],
  unit: 100,
  bands: [{ upTo: null, ratePerUnit: 4 }],
};

/** Loan (financing) agreement: RM5 for every RM1,000 or part, i.e. 0.5%. */
export const LOAN_AGREEMENT: AdValoremTable = {
  kind: "ad-valorem",
  id: "loan-agreement",
  title: "Stamp duty on a loan agreement",
  legalBasis: "Stamp Act 1949, First Schedule, item 22",
  effectiveFrom: "2025-12-29",
  effectiveFromNote:
    "Long-standing rate, confirmed in LHDN guidance updated 29 December 2025",
  verifiedOn: VERIFIED_ON,
  source: LHDN_INTRO_GUIDELINE,
  crossCheck: [
    {
      label: "Low & Partners, Stamp Duty on Instrument of Transfer and Loan Agreement",
      url: "https://lowpartners.com/stamp-duty-instrument-transfer-loan-agreement",
    },
  ],
  unit: 1_000,
  bands: [{ upTo: null, ratePerUnit: 5 }],
};

/**
 * Tenancy or lease agreement. Charged on the annual (or average annual) rent,
 * at a rate set by the length of the term. The RM2,400 annual-rent exemption
 * was removed from 1 Jan 2025.
 */
export const TENANCY: TenancyTable = {
  kind: "tenancy",
  id: "tenancy",
  title: "Stamp duty on a tenancy agreement",
  legalBasis: "Stamp Act 1949, First Schedule, item 49(a) (Finance Act 2024)",
  effectiveFrom: "2025-01-01",
  verifiedOn: VERIFIED_ON,
  source: LHDN_FIRST_SCHEDULE_GUIDELINE,
  crossCheck: [
    {
      label: "Richard Wee Chambers, Finance Act 2024 Amendments: The Stamp Duty Focus",
      url: "https://www.richardweechambers.com/finance-act-2024-amendments-the-stamp-duty-focus/",
    },
    {
      label: "StashAway, Stamp Duty and Administration Fees for Tenancy Agreements in Malaysia (2026)",
      url: "https://www.stashaway.my/r/stamp-duty-tenancy-agreement-malaysia",
    },
  ],
  unit: 250,
  terms: [
    { maxMonths: 12, ratePerUnit: 1 },
    { maxMonths: 36, ratePerUnit: 3 },
    { maxMonths: 60, ratePerUnit: 5 },
    { maxMonths: null, ratePerUnit: 7 },
  ],
};

/** Minimum duty on any instrument (except cheques and contract notes). */
export const MINIMUM_DUTY: MinimumDutyTable = {
  kind: "minimum-duty",
  id: "minimum-duty",
  title: "Minimum stamp duty per instrument",
  legalBasis: "Stamp Act 1949, section 36CB (Finance Act 2024)",
  effectiveFrom: "2025-01-01",
  verifiedOn: VERIFIED_ON,
  source: {
    label: "Richard Wee Chambers, Finance Act 2024 Amendments: The Stamp Duty Focus",
    url: "https://www.richardweechambers.com/finance-act-2024-amendments-the-stamp-duty-focus/",
  },
  crossCheck: [
    {
      label: "PwC, 2026/2027 Malaysian Tax Booklet: Stamp duty",
      url: "https://www.pwc.com/my/en/publications/mtb/stamp-duty.html",
    },
  ],
  amount: 10,
};

const SRO_2023_CROSS_CHECK: RateSource[] = [
  {
    label: "Malaysian Bar, Circular No 185/2023 (Solicitors' Remuneration Order 2023)",
    url: "https://www.malaysianbar.org.my/cms/upload_files/document/Circular%20No%20185-2023.pdf",
  },
  {
    label:
      "The Edge Malaysia, MyCC: Higher conveyancing fees conflict with govt's bid to improve housing affordability (July 2023)",
    url: "https://theedgemalaysia.com/node/675093",
  },
];

const SRO_2023_SOURCE: RateSource = {
  label: "Richard Wee Chambers via Conventus Law, The Solicitors' Remuneration Order 2023",
  url: "https://conventuslaw.com/report/malaysia-the-solicitors-remuneration-order-2023/",
};

const SRO_2023_BANDS: PercentBand[] = [
  { upTo: 500_000, percent: 1.25 },
  { upTo: 7_500_000, percent: 1 },
  { upTo: null, percent: 1, negotiable: true },
];

/**
 * Scale fee for a sale and purchase agreement / transfer (Peninsular Malaysia).
 * Above RM7.5m the fee on the excess is negotiable but capped at 1%.
 */
export const SRO_SALE_AND_PURCHASE: PercentScaleTable = {
  kind: "percent-scale",
  id: "sro-sale-and-purchase",
  title: "Scale legal fee for a sale and purchase agreement",
  legalBasis: "Solicitors' Remuneration Order 2023, First Schedule, Table A",
  effectiveFrom: "2023-07-15",
  verifiedOn: VERIFIED_ON,
  source: SRO_2023_SOURCE,
  crossCheck: SRO_2023_CROSS_CHECK,
  bands: SRO_2023_BANDS,
  minimumFee: 500,
};

/** Scale fee for the principal loan / charge / financing document (Peninsular Malaysia). */
export const SRO_LOAN: PercentScaleTable = {
  kind: "percent-scale",
  id: "sro-loan",
  title: "Scale legal fee for a loan agreement",
  legalBasis: "Solicitors' Remuneration Order 2023, Third Schedule, Table A",
  effectiveFrom: "2023-07-15",
  verifiedOn: VERIFIED_ON,
  source: SRO_2023_SOURCE,
  crossCheck: SRO_2023_CROSS_CHECK,
  bands: SRO_2023_BANDS,
  minimumFee: 500,
};

export const ALL_RATE_TABLES: RateTableMeta[] = [
  MOT_TIERED,
  MOT_FOREIGN_RESIDENTIAL,
  MOT_FOREIGN_NON_RESIDENTIAL,
  LOAN_AGREEMENT,
  TENANCY,
  MINIMUM_DUTY,
  SRO_SALE_AND_PURCHASE,
  SRO_LOAN,
];
