import { NextRequest, NextResponse } from "next/server";
import { runCaseLawyerScraper } from "@/workers/case-lawyer-scraper";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");

  if (!cronSecret || authorization !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runCaseLawyerScraper();
    return NextResponse.json(result, { status: result.success ? 200 : 500 });
  } catch (error) {
    console.error("Case-lawyer scraper route failed:", error);
    return NextResponse.json({ error: "Job failed" }, { status: 500 });
  }
}
