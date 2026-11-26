"use client";

import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BUYER_TYPE_LABELS, type BuyerType } from "@/lib/tools/stamp-duty";

export function BuyerTypeSelect({ value, onChange }: { value: BuyerType; onChange: (v: BuyerType) => void }) {
  return (
    <div className="space-y-2">
      <Label htmlFor="buyer-type">Who is buying?</Label>
      <Select value={value} onValueChange={(v) => onChange(v as BuyerType)}>
        <SelectTrigger id="buyer-type" className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(Object.keys(BUYER_TYPE_LABELS) as BuyerType[]).map((key) => (
            <SelectItem key={key} value={key}>
              {BUYER_TYPE_LABELS[key]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {value !== "local" && (
        <p className="text-xs text-muted-foreground">
          &quot;Foreign buyer&quot; means a foreign company or a person who is neither a Malaysian citizen nor a
          permanent resident.
          {value === "foreign-residential" &&
            " The 8% rate applies to transfers of residential property from 1 January 2026. If your SPA was signed before then, ask your lawyer which rate LHDN will apply."}
        </p>
      )}
    </div>
  );
}
