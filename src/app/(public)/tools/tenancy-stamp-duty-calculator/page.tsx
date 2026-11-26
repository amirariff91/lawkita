import { DEFAULT_OG_IMAGES } from "@/lib/utils/seo";
import type { Metadata } from "next";
import { RateTable } from "@/components/tools/rate-table";
import { TenancyStampDutyCalculator } from "@/components/tools/tenancy-stamp-duty-calculator";
import { ToolPage, type Faq } from "@/components/tools/tool-page";
import { formatIsoDate, formatRM } from "@/lib/tools/format";
import { MINIMUM_DUTY, TENANCY } from "@/lib/tools/rates";
import { getTool } from "@/lib/tools/registry";
import { tenancyRateFor, tenancyStampDuty } from "@/lib/tools/stamp-duty";

const tool = getTool("tenancy-stamp-duty-calculator");

export const metadata: Metadata = {
  title: tool.metaTitle,
  description: tool.description,
  alternates: { canonical: tool.path },
  openGraph: { images: DEFAULT_OG_IMAGES, title: tool.metaTitle, description: tool.description, url: tool.path },
  twitter: { card: "summary_large_image", title: tool.metaTitle, description: tool.description },
};

const example = tenancyStampDuty({ monthlyRent: 2_000, termMonths: 24 });

const faqs: Faq[] = [
  {
    question: "Who pays the stamp duty on a tenancy agreement?",
    answer:
      "Under the Stamp Act the tenant pays the duty on the original agreement and the landlord pays for the copy. Many agreements say otherwise, so check yours.",
  },
  {
    question: "Is the first RM2,400 of rent still exempt?",
    answer: `No. The exemption for annual rent up to RM2,400 was removed from ${formatIsoDate(TENANCY.effectiveFrom)}, so duty is charged from the first ringgit, with a minimum of ${formatRM(MINIMUM_DUTY.amount)}.`,
  },
  {
    question: "How do I stamp a tenancy agreement?",
    answer:
      "Online, through e-Duti Setem on MyTax. Since 1 January 2026 tenancy agreements are under LHDN's self-assessment system: you fill in the stamp duty return, the system works out the duty, and you pay. Submit within 30 days of signing.",
  },
  {
    question: "How is a tenancy shorter than one year charged?",
    answer:
      "The rent is annualised first (monthly rent x 12) and charged at the lowest rate. A six-month tenancy at RM2,000 a month is charged on RM24,000 a year.",
  },
  {
    question: "What happens if the agreement is not stamped?",
    answer:
      "An unstamped agreement cannot be used as evidence in court until it is stamped, which matters if you need to claim unpaid rent or your deposit. Late stamping also carries a penalty of RM50 or 10% of the duty within three months, and RM100 or 20% after that.",
  },
];

export default function TenancyStampDutyCalculatorPage() {
  return (
    <ToolPage
      tool={tool}
      intro={
        <p>
          Enter the monthly rent and the length of the tenancy to get the stamp duty on a tenancy agreement in
          Malaysia, using the rates in force since {formatIsoDate(TENANCY.effectiveFrom)}.
        </p>
      }
      calculator={<TenancyStampDutyCalculator />}
      howItWorks={
        <>
          <p className="text-muted-foreground">
            Duty is charged on the annual rent. Divide it into units of {formatRM(TENANCY.unit)} (a part counts as a
            whole unit) and multiply by the rate for the length of the tenancy. For {formatRM(2_000)} a month over two
            years: {example.lines[0].label}, at RM{tenancyRateFor(24)} each = {formatRM(example.total)}.
          </p>
          <RateTable table={TENANCY} bandHeading="Length of tenancy" />
          <p className="text-muted-foreground">
            The minimum duty on any instrument is {formatRM(MINIMUM_DUTY.amount)} ({MINIMUM_DUTY.legalBasis}).
          </p>
        </>
      }
      faqs={faqs}
    />
  );
}
