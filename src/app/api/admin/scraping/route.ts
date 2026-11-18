import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { desc, eq, isNotNull } from "drizzle-orm";
import {
  scrapeBarCouncilDirectory,
  MALAYSIAN_STATES,
  type MalaysianState,
} from "@/lib/scrapers/malaysian-bar-scraper";
import { runNewsCrawlerJob } from "@/lib/jobs/news-crawler";
import {
  scrapeJudgmentsList,
  saveJudgmentsToDatabase,
} from "@/lib/scrapers/ejudgment-scraper";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { lawyers, scrapingLogs, user } from "@/lib/db/schema";

async function isAdmin(userId: string): Promise<boolean> {
  const currentUser = await db.query.user.findFirst({
    where: eq(user.id, userId),
    columns: { role: true },
  });
  return currentUser?.role === "admin";
}

/**
 * POST /api/admin/scraping
 * Trigger a scraping job for the Malaysian Bar Council directory
 *
 * Body:
 * - source: "bar_council" (required)
 * - states: string[] (optional, defaults to all states)
 * - maxPages: number (optional, defaults to 100)
- dryRun: boolean (optional, defaults to true)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user || !(await isAdmin(session.user.id))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { source, states, maxPages, dryRun } = body;
    const shouldDryRun = dryRun !== false;

    if (
      maxPages !== undefined &&
      (typeof maxPages !== "number" ||
        !Number.isFinite(maxPages) ||
        maxPages <= 0)
    ) {
      return NextResponse.json(
        { error: "maxPages must be a positive number" },
        { status: 400 }
      );
    }


    // Handle news crawler source
    if (source === "news") {
      const result = await runNewsCrawlerJob();
      return NextResponse.json({
        success: result.success,
        message: "News crawler completed",
        stats: {
          sourcesProcessed: result.sourcesProcessed,
          articlesFound: result.articlesFound,
          casesCreated: result.casesCreated,
          casesUpdated: result.casesUpdated,
          lawyerAssociationsCreated: result.lawyerAssociationsCreated,
          durationMs: result.duration,
          errorCount: result.errors.length,
        },
        errors: result.errors.slice(0, 20),
      });
    }

    // Handle eJudgment source
    if (source === "ejudgment") {
      const { keyword, court, year, limit } = body.searchParams || {};
      const judgments = await scrapeJudgmentsList({
        keyword,
        court,
        year,
        limit: limit || maxPages || 50,
      });

      if (judgments.length === 0) {
        return NextResponse.json({
          success: true,
          message: "No judgments found matching criteria",
          stats: {
            totalProcessed: 0,
            casesCreated: 0,
            lawyerAssociationsCreated: 0,
          },
        });
      }

      // Save judgments to database
      const saveResult = await saveJudgmentsToDatabase(judgments);

      return NextResponse.json({
        success: true,
        message: "eJudgment scraping completed",
        stats: {
          totalProcessed: judgments.length,
          casesCreated: saveResult.casesCreated,
          casesUpdated: saveResult.casesUpdated,
          lawyerAssociationsCreated: saveResult.lawyerAssociationsCreated,
          durationMs: saveResult.duration,
          errorCount: saveResult.errors.length,
        },
        errors: saveResult.errors.slice(0, 20),
      });
    }

    if (source !== "bar_council") {
      return NextResponse.json(
        { error: "Invalid source. Supported sources: 'bar_council', 'news', 'ejudgment'" },
        { status: 400 }
      );
    }

    // Validate states if provided
    let validStates: MalaysianState[] | undefined;
    if (states && Array.isArray(states)) {
      validStates = states.filter((s: string) =>
        MALAYSIAN_STATES.includes(s as MalaysianState)
      ) as MalaysianState[];

      if (validStates.length === 0) {
        return NextResponse.json(
          { error: "No valid states provided", validStates: [...MALAYSIAN_STATES] },
          { status: 400 }
        );
      }
    }

    // Start scraping (this runs in the background)
    const result = await scrapeBarCouncilDirectory({
      states: validStates,
      maxPages: maxPages ?? 100,
      dryRun: shouldDryRun,
    });

    return NextResponse.json({
      success: result.success,
      message: shouldDryRun ? "Dry run completed" : "Scraping completed",
      stats: {
        totalProcessed: result.totalProcessed,
        created: result.created,
        updated: result.updated,
        skipped: result.skipped,
        errorCount: result.errors.length,
        durationMs: result.duration,
      },
      errors: result.errors.slice(0, 20), // Only return first 20 errors
    });
  } catch (error) {
    console.error("[Admin Scraping] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/scraping
 * Get recent scraping jobs and their status
 */
export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user || !(await isAdmin(session.user.id))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const jobs = await db
      .select()
      .from(scrapingLogs)
      .orderBy(desc(scrapingLogs.startedAt))
      .limit(20);

    // Get stats summary
    const stats = await db
      .select({
        id: lawyers.id,
        lastScrapedAt: lawyers.lastScrapedAt,
        isClaimed: lawyers.isClaimed,
        subscriptionTier: lawyers.subscriptionTier,
      })
      .from(lawyers)
      .where(isNotNull(lawyers.lastScrapedAt));

    const scrapedCount = stats.length;
    const claimedCount = stats.filter((lawyer) => lawyer.isClaimed).length;
    const paidCount = stats.filter((lawyer) => lawyer.subscriptionTier !== "free").length;

    return NextResponse.json({
      jobs: jobs || [],
      summary: {
        totalScrapedLawyers: scrapedCount,
        claimedProfiles: claimedCount,
        paidSubscriptions: paidCount,
        availableStates: [...MALAYSIAN_STATES],
        availableSources: ["bar_council", "news", "ejudgment"],
      },
    });
  } catch (error) {
    console.error("[Admin Scraping] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
