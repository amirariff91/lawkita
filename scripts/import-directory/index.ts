import { homedir } from "node:os";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { closeDb } from "@/lib/db";
import { loadData } from "./data";
import { planImport } from "./plan";
import { parseApprovals, prepareReportDir, summarize, writeReports } from "./report";
import { runWithDatabase } from "./write";

const usage = `bun --no-env-file run scripts/import-directory/index.ts --data <dir> --release <label> [options]
  --report-dir <dir>       Default: ~/data/lawkita-directory/reports/<release>/
  --only=firms|lawyers     Default: both; lawyers require existing firm external IDs
  --limit <n>              Select the first n stable keys per entity
  --status-approvals <csv> An edited status_review.csv; a row permits a standing write only with
                           approved=yes and the fingerprint that report printed for it
  --apply --confirm-db <host:port>/<dbname>
                           Default: read-only dry run; uses exported DATABASE_URL.
                           The value must match the connection exactly, host included.
`;

async function main() {
  const { values } = parseArgs({ args: Bun.argv.slice(2), options: {
    data: { type: "string" }, release: { type: "string" }, "report-dir": { type: "string" },
    only: { type: "string" }, "status-approvals": { type: "string" }, limit: { type: "string" },
    apply: { type: "boolean", default: false }, "confirm-db": { type: "string" }, help: { type: "boolean" },
  } });
  if (values.help) {
    console.log(usage);
    return;
  }
  const { data, release, only, apply } = values;
  if (!data || !release || !/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(release)) {
    throw new Error("--data and a --release label (letters, digits, dots, underscores, or hyphens) are required");
  }
  if (only !== undefined && only !== "firms" && only !== "lawyers") throw new Error("--only must be firms or lawyers");
  const limit = values.limit === undefined ? undefined : Number(values.limit);
  if (limit !== undefined && (!/^[1-9]\d*$/.test(values.limit!) || !Number.isSafeInteger(limit))) {
    throw new Error("--limit must be a positive integer");
  }
  if (apply && !values["confirm-db"]) throw new Error("--apply requires --confirm-db <host:port>/<dbname>");
  // Dates are read from and written to a timestamp-without-time-zone column
  // through the host's local time. The day arithmetic in the matcher is only
  // right when that is UTC.
  if (new Date().getTimezoneOffset() !== 0) throw new Error("Run the importer with TZ=UTC");
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL must be exported in the environment");
  let databaseUrl: URL;
  try {
    databaseUrl = new URL(connectionString);
    if (!/^postgres(?:ql)?:$/.test(databaseUrl.protocol) || !databaseUrl.hostname) throw new Error();
  } catch {
    throw new Error("DATABASE_URL must be a PostgreSQL URL with a host");
  }
  console.log(`Database host: ${databaseUrl.host}`);
  const input = await loadData(data, only);
  const approvalsPath = values["status-approvals"];
  const approvals = approvalsPath ? parseApprovals(await Bun.file(approvalsPath).text()) : new Map<string, string>();
  const requestedDir = values["report-dir"] ?? join(homedir(), "data/lawkita-directory/reports", release);
  const reportDir = await prepareReportDir(requestedDir, data, approvalsPath);
  // Invalid source rows can hide contenders, so do not use a partially valid release for writes.
  const runApply = apply && input.issues.length === 0;
  const result = await runWithDatabase({
    apply: runApply, includeLawyers: only !== "firms",
    confirmDatabase(name) {
      const target = `${databaseUrl.host}/${name}`;
      console.log(`Connected database: ${target}`);
      // Two servers often share a database name; the host is part of the confirmation.
      if (apply && values["confirm-db"] !== target) throw new Error(`--confirm-db does not match the connection (${target})`);
    },
    plan: (existing) => planImport(input, existing, { now: new Date(), release, approvals, only, limit }),
    permitApply: (plan) => only !== "lawyers" || plan.unresolvedFirmReferences === 0,
  });
  if (!result.acquired) throw new Error("Another directory import holds the advisory lock; no writes made");
  const { plan, countUpdates, applied } = result.value;
  const summary = summarize(plan, input.issues, { release, mode: applied ? "apply" : "dry-run", countUpdates });
  try {
    await writeReports(reportDir, plan, input.issues, summary);
  } catch (error) {
    if (applied) console.error("Database transaction committed, but report generation failed.");
    throw error;
  }
  console.log(JSON.stringify(summary, null, 2));
  if (input.issues.length) throw new Error("Dataset validation failed; see conflicts.csv. No database writes made.");
  if (runApply && !applied) throw new Error("Lawyers-only apply requires existing external IDs for all referenced firms. No database writes made.");
}

if (import.meta.main) {
  try {
    await main();
  } catch (error) {
    // Drizzle errors contain SQL parameter data; Postgres connection errors can contain credentials.
    const failure = error as Error & { code?: string; cause?: { code?: string } };
    console.error(failure.cause?.code || failure.code ? `Import failed (${failure.cause?.code ?? failure.code})` :
      failure.cause ? "Import failed during database or filesystem work" : failure.message);
    process.exitCode = 1;
  } finally {
    await closeDb();
  }
}
