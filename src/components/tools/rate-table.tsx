import { formatIsoDate, formatRM } from "@/lib/tools/format";
import { percentRateLabel } from "@/lib/tools/legal-fees";
import type { AdValoremTable, PercentScaleTable, RateTableMeta, TenancyTable } from "@/lib/tools/rates";
import { adValoremRateLabel, bandLabel, tenancyTermLabel } from "@/lib/tools/stamp-duty";

type AnyTable = AdValoremTable | PercentScaleTable | TenancyTable;

function rows(table: AnyTable): { label: string; rate: string }[] {
  switch (table.kind) {
    case "ad-valorem": {
      let lower = 0;
      return table.bands.map((band, i) => {
        const row = { label: bandLabel(lower, band.upTo, i === 0), rate: adValoremRateLabel(band.ratePerUnit, table.unit) };
        if (band.upTo !== null) lower = band.upTo;
        return row;
      });
    }
    case "percent-scale": {
      let lower = 0;
      return table.bands.map((band, i) => {
        const row = {
          label: band.upTo === null ? `Above ${formatRM(lower)}` : bandLabel(lower, band.upTo, i === 0),
          rate: percentRateLabel(band.percent, band.negotiable),
        };
        if (band.upTo !== null) lower = band.upTo;
        return row;
      });
    }
    case "tenancy": {
      let lower = 0;
      return table.terms.map((term) => {
        const row = {
          label: tenancyTermLabel(lower, term.maxMonths),
          rate: `RM${term.ratePerUnit} per ${formatRM(table.unit)} of annual rent, or part`,
        };
        if (term.maxMonths !== null) lower = term.maxMonths;
        return row;
      });
    }
  }
}

function SourceLine({ table }: { table: RateTableMeta }) {
  return (
    <p className="mt-2 text-xs text-muted-foreground">
      {table.legalBasis}.{" "}
      {table.effectiveFromNote ? `${table.effectiveFromNote}.` : `In effect from ${formatIsoDate(table.effectiveFrom)}.`}{" "}
      Last checked {formatIsoDate(table.verifiedOn)} against{" "}
      <a href={table.source.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
        {table.source.label}
      </a>
      {table.crossCheck.length > 0 && (
        <>
          {" "}and{" "}
          {table.crossCheck.map((c, i) => (
            <span key={c.url}>
              {i > 0 && ", "}
              <a href={c.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                {c.label}
              </a>
            </span>
          ))}
        </>
      )}
      .
    </p>
  );
}

/** Renders a rate table straight from rates.ts, so the page text matches the calculator. */
export function RateTable({ table, bandHeading = "Band" }: { table: AnyTable; bandHeading?: string }) {
  const minimum = table.kind === "percent-scale" ? table.minimumFee : null;
  return (
    <figure className="my-4">
      <figcaption className="mb-2 text-sm font-medium">{table.title}</figcaption>
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr className="text-left">
              <th scope="col" className="px-3 py-2 font-medium">{bandHeading}</th>
              <th scope="col" className="px-3 py-2 font-medium">Rate</th>
            </tr>
          </thead>
          <tbody>
            {rows(table).map((row) => (
              <tr key={row.label} className="border-t">
                <td className="px-3 py-2">{row.label}</td>
                <td className="px-3 py-2">{row.rate}</td>
              </tr>
            ))}
            {minimum !== null && (
              <tr className="border-t">
                <td className="px-3 py-2">Minimum fee</td>
                <td className="px-3 py-2">{formatRM(minimum)}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <SourceLine table={table} />
    </figure>
  );
}
