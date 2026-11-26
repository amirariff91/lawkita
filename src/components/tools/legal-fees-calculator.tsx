"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getStateOptions } from "@/lib/constants/locations";
import { formatRM, parseAmountInput } from "@/lib/tools/format";
import { purchaseCostEstimate } from "@/lib/tools/legal-fees";
import { loanStampDuty, motStampDuty, type BuyerType } from "@/lib/tools/stamp-duty";
import { Breakdown, EstimateNotice, RuleSources } from "./breakdown";
import { BuyerTypeSelect } from "./buyer-type-select";
import { ANY_STATE, LawyerCta } from "./lawyer-cta";
import { MoneyInput } from "./money-input";

const STATE_OPTIONS = getStateOptions();

/** The Solicitors' Remuneration Order 2023 scale covers Peninsular Malaysia only. */
const OUTSIDE_SRO = new Set(["sabah", "sarawak", "labuan"]);

export function LegalFeesCalculator() {
  const [price, setPrice] = useState("500,000");
  const [loan, setLoan] = useState("450,000");
  const [buyer, setBuyer] = useState<BuyerType>("local");
  const [stateSlug, setStateSlug] = useState(ANY_STATE);

  const priceValue = parseAmountInput(price);
  const loanValue = parseAmountInput(loan) ?? 0;
  const outsideSro = OUTSIDE_SRO.has(stateSlug);

  const estimate = useMemo(() => {
    if (priceValue === null || outsideSro) return null;
    return purchaseCostEstimate({ price: priceValue, loanAmount: loanValue, buyer });
  }, [priceValue, loanValue, buyer, outsideSro]);

  const stampOnly = useMemo(() => {
    if (priceValue === null || !outsideSro) return null;
    const items = [{ label: "Stamp duty: Memorandum of Transfer", result: motStampDuty(priceValue, buyer) }];
    if (loanValue > 0) items.push({ label: "Stamp duty: loan agreement", result: loanStampDuty(loanValue) });
    return items;
  }, [priceValue, loanValue, buyer, outsideSro]);

  const hasCeiling = estimate?.items.some((i) => i.isCeiling) ?? false;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Your purchase</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-5" onSubmit={(e) => e.preventDefault()} aria-label="Legal fees inputs">
            <MoneyInput
              id="price"
              label="Property price"
              hint="Stamp duty uses the price or market value, whichever is higher."
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
            <div className="space-y-2">
              <Label htmlFor="property-state">
                Where is the property? <span className="font-normal text-muted-foreground">(optional)</span>
              </Label>
              <Select value={stateSlug} onValueChange={setStateSlug}>
                <SelectTrigger id="property-state" className="w-full">
                  <SelectValue placeholder="Any state" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ANY_STATE}>Peninsular Malaysia (any state)</SelectItem>
                  {STATE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-4" aria-live="polite">
        {estimate && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Estimated total: <span className="tabular-nums">{formatRM(estimate.total)}</span>
                {hasCeiling && <span className="font-normal text-muted-foreground"> (at most)</span>}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Legal fees {formatRM(estimate.legalFees)} + stamp duty {formatRM(estimate.stampDuty)}
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {estimate.items.map((item) => (
                <div key={item.key}>
                  <h3 className="mb-1 text-sm font-semibold">
                    {item.label}: {formatRM(item.result.total)}
                    {item.isCeiling && <span className="font-normal text-muted-foreground"> (ceiling)</span>}
                  </h3>
                  <Breakdown result={item.result} caption={`${item.label} by band`} />
                  {item.result.minimumApplied && item.key.endsWith("fee") && (
                    <p className="mt-1 text-xs text-muted-foreground">The scale sets a minimum fee of RM500.</p>
                  )}
                </div>
              ))}
              <EstimateNotice extra="Legal fees shown are the full scale fee before SST, disbursements and any discount the lawyer may lawfully give. Purchases from a developer under the Housing Development Act are charged on a lower scale that is not calculated here." />
              <RuleSources tables={estimate.tables} />
            </CardContent>
          </Card>
        )}

        {stampOnly && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Stamp duty only</CardTitle>
              <p className="text-sm text-muted-foreground">
                The Solicitors&apos; Remuneration Order 2023 scale applies in Peninsular Malaysia. Legal fees in
                Sabah, Sarawak and Labuan follow different rules, so this calculator does not estimate them. Ask a
                local lawyer for a quote.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {stampOnly.map((item) => (
                <div key={item.label}>
                  <h3 className="mb-1 text-sm font-semibold">
                    {item.label}: {formatRM(item.result.total)}
                  </h3>
                  <Breakdown result={item.result} caption={item.label} />
                </div>
              ))}
              <EstimateNotice />
              <RuleSources
                tables={Array.from(
                  new Map(stampOnly.flatMap((i) => i.result.tables).map((t) => [t.id, t])).values(),
                )}
              />
            </CardContent>
          </Card>
        )}

        {priceValue === null && (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Enter a property price to see the legal fees and stamp duty.
            </CardContent>
          </Card>
        )}

        {priceValue !== null && (
          <LawyerCta stateSlug={stateSlug} onStateChange={setStateSlug} hideStateSelect />
        )}
      </div>
    </div>
  );
}
