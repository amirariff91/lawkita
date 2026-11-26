"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatAmountInput, parseAmountInput } from "@/lib/tools/format";

interface MoneyInputProps {
  id: string;
  label: string;
  hint?: string;
  value: string;
  onChange: (raw: string) => void;
  placeholder?: string;
  optional?: boolean;
}

/** Ringgit amount input: accepts "500000", "500,000", "500k" or "1.2m" and tidies the text on blur. */
export function MoneyInput({ id, label, hint, value, onChange, placeholder, optional }: MoneyInputProps) {
  const [touched, setTouched] = useState(false);
  const invalid = touched && value.trim() !== "" && parseAmountInput(value) === null;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = invalid ? `${id}-error` : undefined;

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label}
        {optional && <span className="font-normal text-muted-foreground"> (optional)</span>}
      </Label>
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground">
          RM
        </span>
        <Input
          id={id}
          inputMode="decimal"
          autoComplete="off"
          className="pl-11 tabular-nums"
          value={value}
          placeholder={placeholder}
          aria-invalid={invalid || undefined}
          aria-describedby={[hintId, errorId].filter(Boolean).join(" ") || undefined}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => {
            setTouched(true);
            const parsed = parseAmountInput(value);
            if (parsed !== null) onChange(formatAmountInput(parsed));
          }}
        />
      </div>
      {hint && (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {invalid && (
        <p id={errorId} className="text-xs text-destructive">
          Enter an amount in ringgit, for example 500,000.
        </p>
      )}
    </div>
  );
}
