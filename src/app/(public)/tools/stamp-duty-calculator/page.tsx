import type { Metadata } from "next";
import { RateTable } from "@/components/tools/rate-table";
import { StampDutyCalculator } from "@/components/tools/stamp-duty-calculator";
import { ToolPage, type Faq } from "@/components/tools/tool-page";
import { formatRM } from "@/lib/tools/format";
import { LOAN_AGREEMENT, MINIMUM_DUTY, MOT_FOREIGN_NON_RESIDENTIAL, MOT_FOREIGN_RESIDENTIAL, MOT_TIERED } from "@/lib/tools/rates";
import { getTool } from "@/lib/tools/registry";
import { motStampDuty } from "@/lib/tools/stamp-duty";

const tool = getTool("stamp-duty-calculator");

export const metadata: Metadata = {
  title: tool.metaTitle,
  description: tool.description,
  alternates: { canonical: tool.path },
  openGraph: { title: tool.metaTitle, description: tool.description, url: tool.path },
  twitter: { card: "summary_large_image", title: tool.metaTitle, description: tool.description },
};

const example = motStampDuty(500_000);

const faqs: Faq[] = [
  {
    question: "Who pays the stamp duty when buying a property?",
    answer:
      "The buyer pays the stamp duty on the Memorandum of Transfer, and the borrower pays the stamp duty on the loan agreement. This follows the Third Schedule of the Stamp Act 1949.",
  },
  {
    question: "Is stamp duty charged on the purchase price or the market value?",
    answer:
      "On whichever is higher. If the property is valued above the price you agreed, LHDN charges duty on the valuation, so enter the higher figure in the calculator.",
  },
  {
    question: "When must stamp duty be paid?",
    answer:
      "LHDN expects an instrument to be submitted for stamping within 30 days of signing, and the duty to be paid within 30 days of the assessment (or, under self-assessment, of submitting the return). Stamping late costs RM50 or 10% of the unpaid duty (whichever is higher) within three months, and RM100 or 20% after that.",
  },
  {
    question: "Do first-time home buyers pay stamp duty?",
    answer:
      "First-home exemptions are granted by government order for set periods, so whether one applies depends on when you sign and the price. For example, Budget 2027 proposes a full exemption on first homes up to RM500,000 for agreements signed from 1 January 2027 to 31 December 2030; as of 26 November 2026 that is a proposal. This calculator shows duty before any exemption. Your lawyer can confirm what applies to you.",
  },
  {
    question: "How much stamp duty do foreigners pay on Malaysian property?",
    answer: `A foreign company, or a person who is neither a citizen nor a permanent resident, pays a flat 8% on residential property transferred from 1 January 2026, and a flat 4% on other property. Permanent residents pay the same tiered rates as citizens.`,
  },
];

export default function StampDutyCalculatorPage() {
  return (
    <ToolPage
      tool={tool}
      intro={
        <p>
          Work out the stamp duty on a property purchase in Malaysia: the Memorandum of Transfer and, if you take a
          loan, the loan agreement. The result shows each band, the rule it comes from and when we last checked it.
        </p>
      }
      calculator={<StampDutyCalculator />}
      howItWorks={
        <>
          <p className="text-muted-foreground">
            Stamp duty on a transfer is charged in bands on the price or market value, whichever is higher. Each
            band is charged per {formatRM(MOT_TIERED.unit)}, and a part of {formatRM(MOT_TIERED.unit)} counts as a
            whole one. For a {formatRM(500_000)} home that gives{" "}
            {example.lines.map((l) => formatRM(l.amount)).join(" + ")} = {formatRM(example.total)}.
          </p>
          <RateTable table={MOT_TIERED} bandHeading="Price or market value" />
          <p className="text-muted-foreground">
            Foreign buyers pay a flat rate on the whole value instead of the bands above.
          </p>
          <RateTable table={MOT_FOREIGN_RESIDENTIAL} bandHeading="Value" />
          <RateTable table={MOT_FOREIGN_NON_RESIDENTIAL} bandHeading="Value" />
          <p className="text-muted-foreground">
            A loan agreement is charged on the loan amount, per {formatRM(LOAN_AGREEMENT.unit)} or part.
          </p>
          <RateTable table={LOAN_AGREEMENT} bandHeading="Loan amount" />
          <p className="text-muted-foreground">
            Since 1 January 2025 no instrument pays less than {formatRM(MINIMUM_DUTY.amount)} ({MINIMUM_DUTY.legalBasis}).
            Exemptions and remissions, such as first-home exemptions, are not applied.
          </p>
        </>
      }
      faqs={faqs}
    />
  );
}
