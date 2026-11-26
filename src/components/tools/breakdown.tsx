import { ExternalLink } from "lucide-react";
import { formatIsoDate, formatRM } from "@/lib/tools/format";
import { MINIMUM_DUTY, type RateTableMeta } from "@/lib/tools/rates";
import type { CalcResult } from "@/lib/tools/stamp-duty";

/** Band-by-band breakdown of one calculation. Safe in server and client components. */
export function Breakdown({ result, caption }: { result: CalcResult; caption: string }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th scope="col" className="py-2 pr-3 font-medium">Band</th>
            <th scope="col" className="py-2 pr-3 font-medium">Rate</th>
            <th scope="col" className="py-2 text-right font-medium">Amount</th>
          </tr>
        </thead>
        <tbody>
          {result.lines.map((line) => (
            <tr key={line.label} className="border-b align-top">
              <td className="py-2 pr-3">{line.label}</td>
              <td className="py-2 pr-3 text-muted-foreground">{line.rateLabel}</td>
              <td className="py-2 text-right tabular-nums">{formatRM(line.amount)}</td>
            </tr>
          ))}
          {result.minimumApplied && (
            <tr className="border-b align-top">
              <td className="py-2 pr-3" colSpan={2}>
                Raised to the minimum of {formatRM(MINIMUM_DUTY.amount)}
              </td>
              <td className="py-2 text-right tabular-nums">{formatRM(result.total)}</td>
            </tr>
          )}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row" colSpan={2} className="py-2 pr-3 text-left font-semibold">
              Total
            </th>
            <td className="py-2 text-right font-semibold tabular-nums">{formatRM(result.total)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

/** Effective date, source link and last-checked date for each rule used. */
export function RuleSources({ tables }: { tables: RateTableMeta[] }) {
  return (
    <ul className="space-y-3 text-xs text-muted-foreground">
      {tables.map((table) => (
        <li key={table.id}>
          <p className="font-medium text-foreground">{table.title}</p>
          <p>
            {table.legalBasis}.{" "}
            {table.effectiveFromNote
              ? `${table.effectiveFromNote}.`
              : `In effect from ${formatIsoDate(table.effectiveFrom)}.`}{" "}
            Last checked {formatIsoDate(table.verifiedOn)}.
          </p>
          <p>
            Source:{" "}
            <a
              href={table.source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 underline underline-offset-2 hover:text-foreground"
            >
              {table.source.label}
              <ExternalLink className="size-3" aria-hidden="true" />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          </p>
        </li>
      ))}
    </ul>
  );
}

/** The plain-language notice every result carries. */
export function EstimateNotice({ extra }: { extra?: string }) {
  return (
    <p className="rounded-md border border-amber-300/60 bg-amber-50 p-3 text-xs text-amber-950 dark:border-amber-500/30 dark:bg-amber-950/30 dark:text-amber-100">
      This is an estimate only. It excludes disbursements and SST unless shown, does not apply any stamp duty
      exemption or remission, and is not legal advice. {extra}
    </p>
  );
}
