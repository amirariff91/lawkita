import { join } from "node:path";
import { z } from "zod";
import { primaryKey, type Entity } from "./keys";
import { normalizeState, parseAdmissionDate, text } from "./normalize";
import { generateLawyerSlug } from "@/lib/lawyers/slug";

const optionalText = z.string().nullish();
const strings = z.array(z.string()).default([]);
const releaseId = z.number().int().positive();
const input = {
  id: releaseId,
  canonical_name: z.string().refine((v) => v.length > 0 && v === v.trim() && !/[|\r\n]/.test(v)),
  state: z.string().refine((v) => normalizeState(v) === v, "Unknown state"),
  address: optionalText, city: optionalText, phone: optionalText, email: optionalText,
  linkedin: optionalText, languages: strings, practice_areas: strings, rankings: strings,
  sources: strings, source_urls: strings,
};

export const firmInput = z.looseObject({
  ...input,
  name: z.string().refine((v) => /[a-z0-9]/i.test(v), "No usable slug"),
  description: optionalText, website: optionalText, website_alive: z.boolean().nullish(),
  postcode: optionalText, latitude: z.number().nullish(), longitude: z.number().nullish(),
  fax: optionalText, whatsapp: optionalText, social_links: strings,
  founded_year: z.int32().nullish(), opening_hours: optionalText,
  bank_panels: strings, legal_networks: strings,
});

export const lawyerInput = z.looseObject({
  ...input,
  full_name: z.string().refine((v) => /\w/.test(generateLawyerSlug(v)), "No usable slug"),
  firm_id: releaseId.nullish(), firm_name: optionalText,
  admission_date: optionalText.refine((v) => !text(v) || parseAdmissionDate(v) !== null, "Invalid admission date"),
  status: z.enum(["Active", "Struck Off"]), disciplinary_note: optionalText,
  designation: optionalText, qualification: optionalText, lawyer_types: strings,
});

// Retain the original JSON independently of the validated view (including unknown fields).
export type FirmInput = z.infer<typeof firmInput> & { raw: Record<string, unknown> };
export type LawyerInput = z.infer<typeof lawyerInput> & { raw: Record<string, unknown> };
export type ValidationIssue = { entity: Entity; row: number; reason: string };

function postgresJsonSafe(value: unknown): boolean {
  if (typeof value === "string") return !/\0|[\uD800-\uDFFF]/u.test(value);
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(postgresJsonSafe);
  return !value || typeof value !== "object" || Object.entries(value).every(
    ([key, child]) => postgresJsonSafe(key) && postgresJsonSafe(child),
  );
}

function validate<T extends { id: number; canonical_name: string; state: string }>(
  input: unknown, schema: z.ZodType<T>, entity: Entity, issues: ValidationIssue[],
): (T & { raw: Record<string, unknown> })[] {
  if (!Array.isArray(input)) throw new Error(`Expected a JSON array of ${entity} rows`);
  const ids = new Set<number>();
  const keys = new Set<string>();
  const valid: (T & { raw: Record<string, unknown> })[] = [];
  for (const [index, raw] of input.entries()) {
    const result = schema.safeParse(raw);
    let reason: string;
    if (!result.success) {
      reason = `invalid fields: ${result.error.issues.map((issue) => issue.path.join(".") || "row").join(", ")}`;
    } else if (!postgresJsonSafe(raw)) {
      reason = "unsupported value in PostgreSQL JSON";
    } else {
      const key = primaryKey(result.data);
      if (ids.has(result.data.id)) reason = "duplicate release id";
      else if (keys.has(key)) reason = "duplicate primary key";
      else {
        ids.add(result.data.id);
        keys.add(key);
        valid.push({ ...result.data, raw });
        continue;
      }
    }
    issues.push({ entity, row: index + 1, reason });
  }
  return valid;
}

export async function loadData(dir: string, only?: "firms" | "lawyers") {
  const [firmRows, lawyerRows] = await Promise.all([
    Bun.file(join(dir, "malaysia_law_firms_deduped.json")).json(),
    only === "firms" ? [] : Bun.file(join(dir, "malaysia_lawyers_deduped.json")).json(),
  ]);
  const issues: ValidationIssue[] = [];
  const firms = validate(firmRows, firmInput, "firm", issues);
  const lawyers = validate(lawyerRows, lawyerInput, "lawyer", issues);
  return { firms, lawyers, issues };
}
