/** The free calculators under /tools: used by the index page, cross-links and JSON-LD. */

export interface ToolDefinition {
  slug: string;
  path: string;
  /** H1, matching the search phrase. */
  name: string;
  /** Meta title (the root layout appends "| LawKita"). */
  metaTitle: string;
  description: string;
  summary: string;
}

export const TOOLS: ToolDefinition[] = [
  {
    slug: "stamp-duty-calculator",
    path: "/tools/stamp-duty-calculator",
    name: "Stamp Duty Calculator Malaysia",
    metaTitle: "Stamp Duty Calculator Malaysia (MOT & Loan)",
    description:
      "Free stamp duty calculator for Malaysia: property transfer (MOT) and loan agreement duty, band by band, with LHDN sources.",
    summary:
      "Stamp duty on a property transfer (Memorandum of Transfer) and on a loan agreement, including the foreign-buyer rates.",
  },
  {
    slug: "legal-fees-calculator",
    path: "/tools/legal-fees-calculator",
    name: "Legal Fees Calculator for SPA and Loan Agreement",
    metaTitle: "Legal Fees Calculator Malaysia (SPA & Loan)",
    description:
      "Free legal fees calculator for Malaysian property purchases: SPA and loan agreement scale fees under the 2023 order, plus stamp duty.",
    summary:
      "Scale legal fees for the sale and purchase agreement and loan agreement, plus stamp duty, for a total estimate.",
  },
  {
    slug: "tenancy-stamp-duty-calculator",
    path: "/tools/tenancy-stamp-duty-calculator",
    name: "Tenancy Agreement Stamp Duty Calculator",
    metaTitle: "Tenancy Agreement Stamp Duty Calculator (2026)",
    description:
      "Free tenancy agreement stamp duty calculator for Malaysia. Enter the monthly rent and tenancy length to get the duty under current LHDN rates.",
    summary: "Stamp duty on a tenancy agreement from the monthly rent and the length of the tenancy.",
  },
];

export function getTool(slug: string): ToolDefinition {
  const tool = TOOLS.find((t) => t.slug === slug);
  if (!tool) throw new Error(`Unknown tool: ${slug}`);
  return tool;
}
