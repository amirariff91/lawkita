import { generateFirmSlug } from "@/lib/db/queries/firms";
import { generateLawyerSlug } from "@/lib/lawyers/slug";
import { primaryKey } from "./keys";
import { text } from "./normalize";

export type SlugRule = "base" | "city" | "state" | "number";
export type SlugAllocation = { slug: string; rule: SlugRule };

export function stableOrder<T extends { canonical_name: string; state: string }>(rows: readonly T[]): T[] {
  return rows.map((row) => [primaryKey(row), row] as const)
    .sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([, row]) => row);
}

function allocate(base: string, used: Set<string>, suffixes: ["city" | "state", string][]): SlugAllocation {
  if (!used.has(base)) {
    used.add(base);
    return { slug: base, rule: "base" };
  }
  for (const [rule, suffix] of suffixes) {
    const slug = `${base}-${suffix}`;
    if (suffix && !used.has(slug)) {
      used.add(slug);
      return { slug, rule };
    }
  }
  for (let n = 2; ; n++) {
    const slug = `${base}-${n}`;
    if (!used.has(slug)) {
      used.add(slug);
      return { slug, rule: "number" };
    }
  }
}

export function lawyerSlug(row: { full_name: string; city?: string | null; state: string }, used: Set<string>) {
  return allocate(generateLawyerSlug(row.full_name), used, [
    ["city", generateLawyerSlug(text(row.city) ?? "")],
    ["state", generateLawyerSlug(row.state)],
  ]);
}

export function firmSlug(row: { name: string; city?: string | null; state: string }, used: Set<string>) {
  return allocate(generateFirmSlug(row.name, text(row.city)), used, [["state", generateFirmSlug(row.state, null)]]);
}
