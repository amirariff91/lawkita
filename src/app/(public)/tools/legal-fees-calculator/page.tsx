import { DEFAULT_OG_IMAGES } from "@/lib/utils/seo";
import type { Metadata } from "next";
import Link from "next/link";
import { LegalFeesCalculator } from "@/components/tools/legal-fees-calculator";
import { RateTable } from "@/components/tools/rate-table";
import { ToolPage, type Faq } from "@/components/tools/tool-page";
import { formatIsoDate, formatRM } from "@/lib/tools/format";
import { spaLegalFee } from "@/lib/tools/legal-fees";
import { SRO_LOAN, SRO_SALE_AND_PURCHASE } from "@/lib/tools/rates";
import { getTool } from "@/lib/tools/registry";

const tool = getTool("legal-fees-calculator");

export const metadata: Metadata = {
  title: tool.metaTitle,
  description: tool.description,
  alternates: { canonical: tool.path },
  openGraph: { images: DEFAULT_OG_IMAGES, title: tool.metaTitle, description: tool.description, url: tool.path },
  twitter: { card: "summary_large_image", title: tool.metaTitle, description: tool.description },
};

const example = spaLegalFee(1_000_000);

const faqs: Faq[] = [
  {
    question: "Are conveyancing legal fees fixed by law in Malaysia?",
    answer: `In Peninsular Malaysia the Solicitors' Remuneration Order 2023 sets a scale fee for conveyancing, in effect from ${formatIsoDate(SRO_SALE_AND_PURCHASE.effectiveFrom)}. The scale is the full fee a lawyer may charge for the sale and purchase agreement and the loan agreement; treat it as the most you should expect to pay and ask for a written quote.`,
  },
  {
    question: "Does the estimate include SST and disbursements?",
    answer:
      "No. Lawyers add service tax (SST) to their professional fee, and they also charge disbursements such as searches, registration fees and printing. Ask for these in the quote; they are not part of the scale.",
  },
  {
    question: "Is the fee different when buying from a developer?",
    answer:
      "Yes. Purchases under the Housing Development Act are charged on a lower scale (Table B of the Order). This calculator shows the full Table A scale, so a developer purchase will usually cost less in legal fees.",
  },
  {
    question: "What about properties above RM7.5 million?",
    answer:
      "The fee on the part above RM7,500,000 is negotiable but may not exceed 1%. The calculator shows that 1% as a ceiling.",
  },
  {
    question: "Does this work for Sabah and Sarawak?",
    answer:
      "Only the stamp duty part. The 2023 scale applies in Peninsular Malaysia; Sabah, Sarawak and Labuan follow different rules, so pick the state and the calculator will show stamp duty only.",
  },
];

export default function LegalFeesCalculatorPage() {
  return (
    <ToolPage
      tool={tool}
      intro={
        <p>
          Estimate what a property purchase costs in lawyer&apos;s fees and stamp duty. Enter the price and loan
          amount to get the scale legal fee for the sale and purchase agreement (SPA) and the loan agreement, plus
          the stamp duty from our{" "}
          <Link href="/tools/stamp-duty-calculator" className="text-primary underline-offset-2 hover:underline">
            stamp duty calculator
          </Link>
          .
        </p>
      }
      calculator={<LegalFeesCalculator />}
      howItWorks={
        <>
          <p className="text-muted-foreground">
            The scale fee is a percentage of the price for the SPA, and of the loan amount for the loan agreement,
            charged in bands. For a {formatRM(1_000_000)} property the SPA fee is{" "}
            {example.lines.map((l) => formatRM(l.amount)).join(" + ")} = {formatRM(example.total)}.
          </p>
          <RateTable table={SRO_SALE_AND_PURCHASE} bandHeading="Price" />
          <RateTable table={SRO_LOAN} bandHeading="Loan amount" />
          <p className="text-muted-foreground">
            Stamp duty is then added for the Memorandum of Transfer and the loan agreement, using the rates shown on
            the{" "}
            <Link href="/tools/stamp-duty-calculator" className="text-primary underline-offset-2 hover:underline">
              stamp duty calculator
            </Link>
            . The total leaves out SST, disbursements, the Housing Development Act scale and any stamp duty
            exemption.
          </p>
        </>
      }
      faqs={faqs}
    />
  );
}
