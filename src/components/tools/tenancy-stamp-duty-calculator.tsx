"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatRM, parseAmountInput } from "@/lib/tools/format";
import { tenancyStampDuty } from "@/lib/tools/stamp-duty";
import { Breakdown, EstimateNotice, RuleSources } from "./breakdown";
import { LawyerCta } from "./lawyer-cta";
import { MoneyInput } from "./money-input";

const TERM_PRESETS = [
  { months: 6, label: "6 months" },
  { months: 12, label: "1 year" },
  { months: 24, label: "2 years" },
  { months: 36, label: "3 years" },
];

function parseMonths(raw: string): number | null {
  const n = Number(raw.trim());
  return Number.isInteger(n) && n > 0 && n <= 1200 ? n : null;
}

export function TenancyStampDutyCalculator() {
  const [rent, setRent] = useState("2,000");
  const [months, setMonths] = useState("24");

  const rentValue = parseAmountInput(rent);
  const monthsValue = parseMonths(months);
  const monthsInvalid = months.trim() !== "" && monthsValue === null;

  const result = useMemo(() => {
    if (rentValue === null || monthsValue === null) return null;
    return tenancyStampDuty({ monthlyRent: rentValue, termMonths: monthsValue });
  }, [rentValue, monthsValue]);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Your tenancy</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-5" onSubmit={(e) => e.preventDefault()} aria-label="Tenancy inputs">
            <MoneyInput
              id="rent"
              label="Monthly rent"
              hint="If the rent changes during the tenancy, enter the average monthly rent."
              value={rent}
              onChange={setRent}
              placeholder="2,000"
            />
            <div className="space-y-2">
              <Label htmlFor="term">Tenancy length (months)</Label>
              <Input
                id="term"
                inputMode="numeric"
                autoComplete="off"
                className="tabular-nums"
                value={months}
                onChange={(e) => setMonths(e.target.value)}
                aria-invalid={monthsInvalid || undefined}
                aria-describedby={monthsInvalid ? "term-error" : undefined}
              />
              <div className="flex flex-wrap gap-2" role="group" aria-label="Common tenancy lengths">
                {TERM_PRESETS.map((preset) => (
                  <Button
                    key={preset.months}
                    type="button"
                    size="sm"
                    variant={monthsValue === preset.months ? "default" : "outline"}
                    aria-pressed={monthsValue === preset.months}
                    onClick={() => setMonths(String(preset.months))}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
              {monthsInvalid && (
                <p id="term-error" className="text-xs text-destructive">
                  Enter the length in whole months, for example 24.
                </p>
              )}
            </div>
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
                <Breakdown result={result} caption="Stamp duty on the tenancy agreement" />
                {monthsValue !== null && monthsValue < 12 && (
                  <p className="text-xs text-muted-foreground">
                    For a tenancy shorter than 12 months, LHDN charges on the annualised rent (monthly rent x 12).
                  </p>
                )}
                {monthsValue !== null && monthsValue > 36 && (
                  <p className="text-xs text-muted-foreground">
                    A lease longer than three years must also be registered at the land office using Form 15A. That
                    form carries a further RM10 duty once the lease agreement is stamped.
                  </p>
                )}
                <EstimateNotice extra="Duty on extra copies, any premium or lump-sum payment, and late-stamping penalties are not included." />
                <RuleSources tables={result.tables} />
              </CardContent>
            </Card>
            <LawyerCta heading="Need help with a tenancy agreement?" />
          </>
        ) : (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Enter the monthly rent and tenancy length to see the stamp duty.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
