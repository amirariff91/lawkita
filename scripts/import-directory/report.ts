import { randomUUID } from "node:crypto";
import { mkdir, realpath, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";
import type { ValidationIssue } from "./data";
import { normalizeCity } from "./maps/cities";
import type { Match } from "./match";
import type { ImportPlan } from "./plan";
import type { SlugRule } from "./slug";

const reportNames = ["summary.json", "review.csv", "conflicts.csv", "status_review.csv", "slugs.csv"] as const;
const formula = /^[\s]*[=+\-@]|^[\t\r\n]/;

function csv(rows: readonly (readonly (string | number | null | undefined)[])[]): string {
  return rows.map((row) => row.map((value) => {
    const field = String(value ?? "");
    return `"${(formula.test(field) ? `'${field}` : field).replaceAll('"', '""')}"`;
  }).join(",")).join("\r\n") + "\r\n";
}

/**
 * Reads an edited status_review.csv. A row is an approval only with
 * approved=yes and the fingerprint the report printed for it, so an approval
 * cannot carry over to a different status, note, source or target.
 */
export function parseApprovals(contents: string): Map<string, string> {
  const input = contents.replace(/^\uFEFF/, "");
  const field = /(?:"((?:[^"]|"")*)"|([^",\r\n]*))(,|\r\n|\r|\n|$)/y;
  const rows: string[][] = [];
  let row: string[] = [];
  for (let offset = 0; offset < input.length || row.length > 0;) {
    field.lastIndex = offset;
    const match = field.exec(input);
    if (!match) throw new Error("Malformed status approvals CSV");
    row.push(match[1]?.replaceAll('""', '"') ?? match[2]);
    offset = field.lastIndex;
    if (match[3] !== ",") {
      if (row.length !== 1 || row[0] !== "") rows.push(row);
      row = [];
    }
  }
  const header = rows.shift() ?? [];
  const keyColumn = header.indexOf("key");
  const approvalColumn = header.indexOf("approved");
  const fingerprintColumn = header.indexOf("fingerprint");
  if (keyColumn < 0 || approvalColumn < 0 || fingerprintColumn < 0 || new Set(header).size !== header.length) {
    throw new Error("Status approvals CSV must have unique key, fingerprint and approved columns");
  }
  const approved = new Map<string, string>();
  const seen = new Set<string>();
  for (const row of rows) {
    let key = row[keyColumn];
    const decision = row[approvalColumn];
    if (key?.startsWith("'") && formula.test(key.slice(1))) key = key.slice(1);
    if (row.length !== header.length || !key || !["yes", "no", ""].includes(decision) || seen.has(key)) {
      throw new Error("Status approvals CSV has an invalid or duplicate entry (approved must be yes, no, or blank)");
    }
    seen.add(key);
    if (decision === "yes") {
      if (!/^[0-9a-f]{16}$/.test(row[fingerprintColumn])) throw new Error("Status approvals CSV has an approval without a valid fingerprint");
      approved.set(key, row[fingerprintColumn]);
    }
  }
  return approved;
}

function counts(entries: readonly { match: Match; write?: { insert: unknown } | { update: unknown }; slugRule?: SlugRule }[]) {
  const actions = { insert: 0, update: 0, review: 0, conflict: 0 };
  const tiers = { A: 0, B: 0 };
  const writes = { insert: 0, update: 0 };
  const slugRules = { base: 0, city: 0, state: 0, number: 0 };
  for (const { match, write, slugRule } of entries) {
    actions[match.action]++;
    if (match.action === "update") tiers[match.tier]++;
    if (write) writes["insert" in write ? "insert" : "update"]++;
    if (slugRule) slugRules[slugRule]++;
  }
  return { rows: entries.length, actions, tiers, writes, unchanged: actions.update - writes.update, slugRules };
}

export function summarize(plan: ImportPlan, issues: readonly ValidationIssue[], context: {
  release: string; mode: "dry-run" | "apply" | "no-db"; countUpdates?: number;
}) {
  const cities = new Map<string, { state: string; city: string; lawyers: number }>();
  for (const { row } of plan.lawyerPlans) {
    const city = normalizeCity(row.city);
    if (!city) continue;
    const key = `${row.state}:${city.toLowerCase()}`;
    const cityCount = cities.get(key);
    if (cityCount) cityCount.lawyers++;
    else cities.set(key, { state: row.state, city, lawyers: 1 });
  }
  return {
    ...context, runAt: plan.now.toISOString(), firms: counts(plan.firmPlans), lawyers: counts(plan.lawyerPlans),
    externalIds: plan.externalIds.length, practiceLinks: plan.links.length, statusReview: plan.statusReview.length,
    validationFailures: issues.length, unresolvedFirmReferences: plan.unresolvedFirmReferences,
    unmappedPracticeAreas: Object.fromEntries([...plan.unmapped].sort()),
    practiceSlugsMissingInDb: [...plan.missingPracticeSlugs].sort(),
    citiesWithAtLeastTenLawyers: [...cities.values()].filter((city) => city.lawyers >= 10)
      .sort((a, b) => b.lawyers - a.lawyers || a.state.localeCompare(b.state) || a.city.localeCompare(b.city)),
  };
}

async function canonicalPath(path: string): Promise<string> {
  try {
    return await realpath(path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT" || dirname(path) === path) throw error;
    return resolve(await canonicalPath(dirname(path)), relative(dirname(path), path));
  }
}

function within(directory: string, path: string): boolean {
  const suffix = relative(directory, path);
  return suffix !== ".." && !suffix.startsWith(`..${sep}`);
}

export async function prepareReportDir(requested: string, dataDir: string, approvals?: string): Promise<string> {
  const worktree = await realpath(resolve(import.meta.dir, "../.."));
  const git = Bun.spawnSync(["git", "rev-parse", "--path-format=absolute", "--git-common-dir"], { cwd: worktree, stderr: "ignore" });
  const commonDir = git.success ? git.stdout.toString().trim() : null;
  const protectedDirs = [worktree, await realpath(dataDir)];
  if (commonDir && commonDir.endsWith(`${sep}.git`)) protectedDirs.push(await realpath(dirname(commonDir)));
  const path = await canonicalPath(resolve(requested));
  if (protectedDirs.some((directory) => within(directory, path))) {
    throw new Error("Report directory must be outside the repository and dataset");
  }
  if (approvals) {
    const approvalFile = await realpath(approvals);
    if (reportNames.some((name) => join(path, name) === approvalFile)) {
      throw new Error("Status approvals must be a separate file, not an output report");
    }
  }
  await mkdir(path, { recursive: true, mode: 0o700 });
  return path;
}

export async function writeReports(dir: string, plan: ImportPlan, issues: readonly ValidationIssue[], summary: object) {
  const review = [["entity", "key", "name", "state", "reason", "candidates"]];
  const conflicts = [["entity", "key", "name", "state", "reason"]];
  const slugs = [["key", "slug", "status"]];
  function record(entity: string, name: string, { row, key, match, slug }: {
    row: { state: string }; key: string; match: Match; slug?: string;
  }) {
    if (match.action === "review") review.push([entity, key, name, row.state, match.reason, match.candidates.join("; ")]);
    else if (match.action === "conflict") conflicts.push([entity, key, name, row.state, match.reason]);
    else if (slug) slugs.push([key, slug, match.action === "insert" ? "new" : "existing"]);
  }
  for (const entry of plan.firmPlans) record("firm", entry.row.name, entry);
  for (const entry of plan.lawyerPlans) record("lawyer", entry.row.full_name, entry);
  for (const { entity, row, reason } of issues) conflicts.push([entity, "", "", "", `JSON row ${row}: ${reason}`]);
  const status = [["key", "name", "state", "firm", "status", "note", "source_url", "match_tier", "target_slug", "problem", "fingerprint", "approved"],
    ...plan.statusReview.map((row) => [row.key, row.name, row.state, row.firm, row.status, row.note, row.sourceUrl, row.tier,
      row.targetSlug, row.problem, row.fingerprint, ""])];
  const payloads = [JSON.stringify(summary, null, 2) + "\n", csv(review), csv(conflicts), csv(status), csv(slugs)];
  // Replace files, never follow destination symlinks or truncate external hard links.
  for (const [index, name] of reportNames.entries()) {
    const temporary = join(dir, `.${name}.${randomUUID()}`);
    await writeFile(temporary, payloads[index], { flag: "wx", mode: 0o600 });
    try {
      await rename(temporary, join(dir, name));
    } finally {
      await rm(temporary, { force: true });
    }
  }
}
