import { NextRequest, NextResponse } from "next/server";
import { runNewsCrawlerJob } from "@/lib/jobs/news-crawler";

/**
 * News Crawler Cron Job
 *
 * Can be triggered via:
 * - Vercel Cron (add to vercel.json)
 * - GitHub Actions
 * - Manual API call with CRON_SECRET
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authorization
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Run the crawler
    const result = await runNewsCrawlerJob();

    return NextResponse.json({
      success: result.success,
      message: "News crawler job completed",
      stats: {
        sourcesProcessed: result.sourcesProcessed,
        articlesFound: result.articlesFound,
        casesCreated: result.casesCreated,
        casesUpdated: result.casesUpdated,
        lawyerAssociationsCreated: result.lawyerAssociationsCreated,
        duration: `${result.duration}ms`,
        errors: result.errors.length,
      },
    });
  } catch (error) {
    console.error("News crawler job failed:", error);
    return NextResponse.json(
      { error: "Job failed", details: String(error) },
      { status: 500 }
    );
  }
}

// Vercel Cron config (optional - can also be in vercel.json)
export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes max
