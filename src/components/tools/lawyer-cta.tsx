"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getStateBySlug, getStateOptions } from "@/lib/constants/locations";

const ANY_STATE = "any";
const STATE_OPTIONS = getStateOptions();

interface LawyerCtaProps {
  /** Controlled state slug; omit to let the CTA manage its own dropdown. */
  stateSlug?: string;
  onStateChange?: (slug: string) => void;
  /** Hide the dropdown when the parent form already asks for the state. */
  hideStateSelect?: boolean;
  heading?: string;
  practiceAreaLabel?: string;
  /** Practice-area hub the button links to. */
  practiceAreaSlug?: string;
}

/** Contextual link into the directory below a calculator result. */
export function LawyerCta({
  stateSlug,
  onStateChange,
  hideStateSelect,
  heading = "Need a lawyer to handle it?",
  practiceAreaLabel = "conveyancing lawyer",
  practiceAreaSlug = "conveyancing",
}: LawyerCtaProps) {
  const [ownState, setOwnState] = useState(ANY_STATE);
  const selected = stateSlug ?? ownState;
  const state = selected === ANY_STATE ? undefined : getStateBySlug(selected);

  const setState = (slug: string) => {
    if (onStateChange) onStateChange(slug);
    else setOwnState(slug);
  };

  return (
    <section aria-labelledby="lawyer-cta-heading" className="rounded-lg border bg-muted/40 p-4 sm:p-5">
      <h2 id="lawyer-cta-heading" className="text-base font-semibold">
        {heading}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Compare lawyers listed on LawKita and ask for a quote. A lawyer can confirm the exact figure and any
        exemption you qualify for.
      </p>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        {!hideStateSelect && (
          <div className="space-y-2 sm:w-56">
            <Label htmlFor="cta-state">Your state (optional)</Label>
            <Select value={selected} onValueChange={setState}>
              <SelectTrigger id="cta-state" className="w-full">
                <SelectValue placeholder="Any state" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY_STATE}>Any state</SelectItem>
                {STATE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button asChild>
            <Link href={`/lawyers/practice-area/${practiceAreaSlug}`}>
              Find a {practiceAreaLabel}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </Button>
          {state && (
            <Button asChild variant="outline">
              <Link href={`/lawyers/location/${state.slug}`}>
                Lawyers in {state.name}
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}

export { ANY_STATE };
