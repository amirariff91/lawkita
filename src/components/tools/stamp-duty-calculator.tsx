"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatRM, parseAmountInput } from "@/lib/tools/format";
import { loanStampDuty, motStampDuty, type BuyerType } from "@/lib/tools/stamp-duty";
import { Breakdown, EstimateNotice, RuleSources } from "./breakdown";
import { BuyerTypeSelect } from "./buyer-type-select";
import { LawyerCta } from "./lawyer-cta";
import { MoneyInput } from "./money-input";

export function StampDutyCalculator() {
  const [price, setPrice] = useState("500,000");
  const [loan, setLoan] = useState("450,000");
  const [buyer, setBuyer] = useState<BuyerType>("local");

  const priceValue = parseAmountInput(price);
  const loanValue = parseAmountInput(loan);

  const result = useMemo(() => {
    if (priceValue === null && loanValue === null) return null;
    const mot = priceValue !== null ? motStampDuty(priceValue, buyer) : null;
    const loanDuty = loanValue !== null ? loanStampDuty(loanValue) : null;
    const total = (mot?.total ?? 0) + (loanDuty?.total ?? 0);
    const tables = [...(mot?.tables ?? []), ...(loanDuty?.tables ?? [])];
    const uniqueTables = Array.from(new Map(tables.map((t) => [t.id, t])).values());
    return { mot, loanDuty, total, tables: uniqueTables };
  }, [priceValue, loanValue, buyer]);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Your property</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-5" onSubmit={(e) => e.preventDefault()} aria-label="Stamp duty inputs">
            <MoneyInput
              id="price"
              label="Property price"
              hint="Use the price or the market value, whichever is higher. LHDN charges on the higher figure."
              value={price}
              onChange={setPrice}
              placeholder="500,000"
            />
            <MoneyInput
              id="loan"
              label="Loan amount"
              hint="Leave blank for a cash purchase."
              value={loan}
              onChange={setLoan}
              placeholder="450,000"
              optional
            />
            <BuyerTypeSelect value={buyer} onChange={setBuyer} />
          </form>
        </CardContent>
      </Card>

      <div className="space-y-4" aria-live="polite">
        {result ? (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Estimated stamp duty: <span className="tabular-nums">{formatRM(result.total)}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {result.mot && (
                  <div>
                    <h3 className="mb-1 text-sm font-semibold">
                      Memorandum of Transfer: {formatRM(result.mot.total)}
                    </h3>
                    <Breakdown result={result.mot} caption="Stamp duty on the Memorandum of Transfer by band" />
                  </div>
                )}
                {result.loanDuty && (
                  <div>
                    <h3 className="mb-1 text-sm font-semibold">
                      Loan agreement: {formatRM(result.loanDuty.total)}
                    </h3>
                    <Breakdown result={result.loanDuty} caption="Stamp duty on the loan agreement" />
                  </div>
                )}
                <EstimateNotice extra="First-home buyer exemptions and other remissions may reduce or remove this duty; they are not calculated here." />
                <RuleSources tables={result.tables} />
              </CardContent>
            </Card>
            <LawyerCta />
          </>
        ) : (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Enter a property price or loan amount to see the stamp duty.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
