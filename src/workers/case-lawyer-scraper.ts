import { and, eq, ilike, isNull, like } from "drizzle-orm";
import { closeDb, db, withAdvisoryLock } from "@/lib/db";
import {
  cases,
  caseLawyers,
  lawyers,
  scrapingLogs,
} from "@/lib/db/schema";

export const CASE_LAWYER_SCRAPER_LOCK_KEY = 2_024_080_5;

export type CaseLawyerSourceType =
  | "court_record"
  | "news"
  | "bar_council"
  | "law_firm";

export type ScraperSourceType = CaseLawyerSourceType | "wikipedia";

export interface ScrapedLawyerData {
  name: string;
  barMembershipNumber?: string;
  firmName?: string;
  role: "prosecution" | "defense" | "judge" | "other";
  roleDescription?: string;
}

export interface ScrapedCaseData {
  caseId: string;
  lawyers: ScrapedLawyerData[];
  sourceType: ScraperSourceType;
  sourceUrl: string;
}

export interface CaseLawyerScraperOptions {
  sourceType?: ScraperSourceType;
  limit?: number;
  dryRun?: boolean;
  scrapedData?: ScrapedCaseData[];
}

export interface CaseLawyerScraperResult {
  success: boolean;
  acquired: boolean;
  skipped: boolean;
  logId: string | null;
  casesFound: number;
  recordsProcessed: number;
  recordsCreated: number;
  recordsUpdated: number;
  recordsSkipped: number;
  errors: Array<{ message: string; context?: Record<string, unknown> }>;
  durationMs: number;
  message: string;
}

export function slugifyLawyerName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim()
    .replace(/^-+|-+$/g, "");
}

export function confidenceForSource(sourceType: ScraperSourceType): number {
  switch (sourceType) {
    case "court_record":
      return 1;
    case "bar_council":
      return 0.95;
    case "law_firm":
      return 0.85;
    case "news":
    case "wikipedia":
      return 0.7;
  }
}

function associationSourceType(sourceType: ScraperSourceType): CaseLawyerSourceType {
  return sourceType === "wikipedia" ? "news" : sourceType;
}

async function findOrCreateLawyer(
  lawyerData: ScrapedLawyerData
): Promise<{ id: string; action: "found" | "created" } | null> {
  if (lawyerData.barMembershipNumber) {
    const [existingByBar] = await db
      .select({ id: lawyers.id })
      .from(lawyers)
      .where(eq(lawyers.barMembershipNumber, lawyerData.barMembershipNumber))
      .limit(1);
    if (existingByBar) return { id: existingByBar.id, action: "found" };
  }

  const [existingByName] = await db
    .select({ id: lawyers.id })
    .from(lawyers)
    .where(ilike(lawyers.name, lawyerData.name))
    .limit(1);
  if (existingByName) return { id: existingByName.id, action: "found" };

  // Do not create unverifiable profiles from a case mention alone.
  if (!lawyerData.barMembershipNumber) return null;

  const slug = slugifyLawyerName(lawyerData.name);
  const slugMatches = await db
    .select({ slug: lawyers.slug })
    .from(lawyers)
    .where(like(lawyers.slug, `${slug}%`));
  const finalSlug = slugMatches.length ? `${slug}-${slugMatches.length + 1}` : slug;
  const [newLawyer] = await db
    .insert(lawyers)
    .values({
      slug: finalSlug,
      name: lawyerData.name,
      barMembershipNumber: lawyerData.barMembershipNumber,
      firmName: lawyerData.firmName,
      isVerified: false,
      isClaimed: false,
      isActive: true,
    })
    .returning({ id: lawyers.id });

  return newLawyer ? { id: newLawyer.id, action: "created" } : null;
}

export async function associateLawyerWithCase(input: {
  caseId: string;
  lawyerId: string;
  lawyer: ScrapedLawyerData;
  sourceType: ScraperSourceType;
  sourceUrl: string;
}): Promise<"created" | "updated" | "skipped"> {
  const [existing] = await db
    .select({
      confidenceScore: caseLawyers.confidenceScore,
    })
    .from(caseLawyers)
    .where(
      and(
        eq(caseLawyers.caseId, input.caseId),
        eq(caseLawyers.lawyerId, input.lawyerId)
      )
    )
    .limit(1);
  const confidenceScore = confidenceForSource(input.sourceType);
  const sourceType = associationSourceType(input.sourceType);

  if (existing) {
    const existingScore = Number(existing.confidenceScore ?? 0);
    if (confidenceScore <= existingScore) return "skipped";

    await db
      .update(caseLawyers)
      .set({
        role: input.lawyer.role,
        roleDescription: input.lawyer.roleDescription,
        confidenceScore: String(confidenceScore),
        sourceType,
        sourceUrl: input.sourceUrl,
        scrapedAt: new Date(),
      })
      .where(
        and(
          eq(caseLawyers.caseId, input.caseId),
          eq(caseLawyers.lawyerId, input.lawyerId)
        )
      );
    return "updated";
  }

  await db
    .insert(caseLawyers)
    .values({
      caseId: input.caseId,
      lawyerId: input.lawyerId,
      role: input.lawyer.role,
      roleDescription: input.lawyer.roleDescription,
      isVerified: input.sourceType === "court_record",
      confidenceScore: String(confidenceScore),
      sourceType,
      sourceUrl: input.sourceUrl,
      scrapedAt: new Date(),
    })
    .onConflictDoNothing();
  return "created";
}

async function updateRunLog(
  logId: string,
  result: Partial<CaseLawyerScraperResult>,
  status: "completed" | "failed" | "partial"
): Promise<void> {
  await db
    .update(scrapingLogs)
    .set({
      status,
      recordsProcessed: result.recordsProcessed ?? 0,
      recordsCreated: result.recordsCreated ?? 0,
      recordsUpdated: result.recordsUpdated ?? 0,
      recordsSkipped: result.recordsSkipped ?? 0,
      errorCount: result.errors?.length ?? 0,
      errors: result.errors,
      metadata: {
        casesFound: result.casesFound ?? 0,
        message: result.message,
      },
      completedAt: new Date(),
      durationMs: result.durationMs,
    })
    .where(eq(scrapingLogs.id, logId));
}

export async function processScrapedData(
  data: ScrapedCaseData[],
  logId: string
): Promise<Pick<CaseLawyerScraperResult, "recordsProcessed" | "recordsCreated" | "recordsUpdated" | "recordsSkipped" | "errors">> {
  const result = {
    recordsProcessed: 0,
    recordsCreated: 0,
    recordsUpdated: 0,
    recordsSkipped: 0,
    errors: [] as Array<{ message: string; context?: Record<string, unknown> }>,
  };

  for (const caseData of data) {
    for (const lawyerData of caseData.lawyers) {
      try {
        const lawyer = await findOrCreateLawyer(lawyerData);
        if (!lawyer) {
          result.recordsSkipped++;
          result.errors.push({
            message: "Skipped lawyer without a Bar membership number",
            context: { name: lawyerData.name, caseId: caseData.caseId },
          });
          continue;
        }

        const action = await associateLawyerWithCase({
          caseId: caseData.caseId,
          lawyerId: lawyer.id,
          lawyer: lawyerData,
          sourceType: caseData.sourceType,
          sourceUrl: caseData.sourceUrl,
        });
        result.recordsProcessed++;
        if (action === "created") result.recordsCreated++;
        else if (action === "updated") result.recordsUpdated++;
        else result.recordsSkipped++;
      } catch (error) {
        result.errors.push({
          message: error instanceof Error ? error.message : "Unknown error",
          context: { lawyer: lawyerData.name, caseId: caseData.caseId },
        });
      }
    }
  }

  if (logId) {
    await db
      .update(scrapingLogs)
      .set({
        recordsProcessed: result.recordsProcessed,
        recordsCreated: result.recordsCreated,
        recordsUpdated: result.recordsUpdated,
        recordsSkipped: result.recordsSkipped,
        errorCount: result.errors.length,
        errors: result.errors,
      })
      .where(eq(scrapingLogs.id, logId));
  }

  return result;
}

export async function runCaseLawyerScraper(
  options: CaseLawyerScraperOptions = {}
): Promise<CaseLawyerScraperResult> {
  const lockResult = await withAdvisoryLock(CASE_LAWYER_SCRAPER_LOCK_KEY, async () => {
    const startedAt = Date.now();
    const sourceType = options.sourceType ?? "news";
    const limit = Math.min(Math.max(1, options.limit ?? 10), 100);
    const [log] = await db
      .insert(scrapingLogs)
      .values({
        jobType: "case_lawyer",
        sourceType,
        status: "running",
        metadata: { worker: "case-lawyer-scraper", dryRun: options.dryRun ?? false },
      })
      .returning({ id: scrapingLogs.id });
    const logId = log?.id ?? null;

    try {
      const casesWithoutLawyers = await db
        .select({ id: cases.id, title: cases.title, caseNumber: cases.caseNumber })
        .from(cases)
        .where(isNull(cases.caseNumber))
        .limit(limit);
      const scrapedData = options.scrapedData ?? [];

      if (options.dryRun || scrapedData.length === 0) {
        const result: CaseLawyerScraperResult = {
          success: true,
          acquired: true,
          skipped: false,
          logId,
          casesFound: casesWithoutLawyers.length,
          recordsProcessed: 0,
          recordsCreated: 0,
          recordsUpdated: 0,
          recordsSkipped: scrapedData.length ? scrapedData.reduce((sum, item) => sum + item.lawyers.length, 0) : 0,
          errors: [],
          durationMs: Date.now() - startedAt,
          message: scrapedData.length ? "Dry run completed" : "No scraped records supplied",
        };
        if (logId) await updateRunLog(logId, result, "completed");
        return result;
      }

      const processed = await processScrapedData(scrapedData, logId ?? "");
      const result: CaseLawyerScraperResult = {
        success: processed.errors.length === 0,
        acquired: true,
        skipped: false,
        logId,
        casesFound: casesWithoutLawyers.length,
        ...processed,
        durationMs: Date.now() - startedAt,
        message: "Case-lawyer scraper completed",
      };
      if (logId) await updateRunLog(logId, result, result.success ? "completed" : "partial");
      return result;
    } catch (error) {
      const result: CaseLawyerScraperResult = {
        success: false,
        acquired: true,
        skipped: false,
        logId,
        casesFound: 0,
        recordsProcessed: 0,
        recordsCreated: 0,
        recordsUpdated: 0,
        recordsSkipped: 0,
        errors: [{ message: error instanceof Error ? error.message : "Unknown error" }],
        durationMs: Date.now() - startedAt,
        message: "Case-lawyer scraper failed",
      };
      if (logId) await updateRunLog(logId, result, "failed");
      return result;
    }
  });

  if (!lockResult.acquired) {
    return {
      success: true,
      acquired: false,
      skipped: true,
      logId: null,
      casesFound: 0,
      recordsProcessed: 0,
      recordsCreated: 0,
      recordsUpdated: 0,
      recordsSkipped: 0,
      errors: [],
      durationMs: 0,
      message: "Another case-lawyer scraper run is already in progress",
    };
  }

  return lockResult.value;
}

if (import.meta.main) {
  try {
    const result = await runCaseLawyerScraper({
      limit: Number(process.env.CASE_LAWYER_SCRAPER_LIMIT ?? 10),
      dryRun: process.env.CASE_LAWYER_SCRAPER_DRY_RUN === "true",
    });
    console.log(JSON.stringify(result));
    process.exitCode = result.success ? 0 : 1;
  } finally {
    await closeDb();
  }
}
