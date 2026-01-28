// Supabase Edge Function for scraping case-lawyer associations
// Deployed to: supabase functions deploy case-lawyer-scraper
// Trigger via: supabase functions invoke case-lawyer-scraper
// Schedule via pg_cron in Supabase dashboard

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Types
interface ScrapingJob {
  id: string;
  jobType: "case_lawyer" | "lawyer_profile" | "case_details" | "news_extraction";
  sourceType: "court_record" | "news" | "bar_council" | "law_firm" | "wikipedia";
  sourceUrl?: string;
  status: "running" | "completed" | "failed" | "partial";
  recordsProcessed: number;
  recordsCreated: number;
  recordsUpdated: number;
  recordsSkipped: number;
  errorCount: number;
  errors: Array<{ message: string; context?: Record<string, unknown> }>;
  metadata?: Record<string, unknown>;
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
}

interface ScrapedLawyerData {
  name: string;
  barMembershipNumber?: string;
  firmName?: string;
  role: "prosecution" | "defense" | "judge" | "other";
  roleDescription?: string;
}

interface ScrapedCaseData {
  caseId: string;
  lawyers: ScrapedLawyerData[];
  sourceType: string;
  sourceUrl: string;
}

// Initialize Supabase client
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Create a scraping log entry
async function createScrapingLog(
  jobType: ScrapingJob["jobType"],
  sourceType: ScrapingJob["sourceType"],
  sourceUrl?: string
): Promise<string> {
  const { data, error } = await supabase
    .from("scraping_logs")
    .insert({
      job_type: jobType,
      source_type: sourceType,
      source_url: sourceUrl,
      status: "running",
      records_processed: 0,
      records_created: 0,
      records_updated: 0,
      records_skipped: 0,
      error_count: 0,
      errors: [],
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(`Failed to create scraping log: ${error.message}`);
  }

  return data.id;
}

// Update scraping log with results
async function updateScrapingLog(
  logId: string,
  updates: Partial<Omit<ScrapingJob, "id" | "jobType" | "sourceType" | "startedAt">>
): Promise<void> {
  const { error } = await supabase
    .from("scraping_logs")
    .update({
      status: updates.status,
      records_processed: updates.recordsProcessed,
      records_created: updates.recordsCreated,
      records_updated: updates.recordsUpdated,
      records_skipped: updates.recordsSkipped,
      error_count: updates.errorCount,
      errors: updates.errors,
      metadata: updates.metadata,
      completed_at: updates.completedAt,
      duration_ms: updates.durationMs,
    })
    .eq("id", logId);

  if (error) {
    console.error(`Failed to update scraping log: ${error.message}`);
  }
}

// Find or create lawyer (simplified version for edge function)
async function findOrCreateLawyer(
  lawyerData: ScrapedLawyerData
): Promise<{ id: string; action: "found" | "created" | "skipped" } | null> {
  // Try to find by bar number first
  if (lawyerData.barMembershipNumber) {
    const { data: existingByBar } = await supabase
      .from("lawyers")
      .select("id")
      .eq("bar_membership_number", lawyerData.barMembershipNumber)
      .single();

    if (existingByBar) {
      return { id: existingByBar.id, action: "found" };
    }
  }

  // Try to find by exact name
  const { data: existingByName } = await supabase
    .from("lawyers")
    .select("id")
    .ilike("name", lawyerData.name)
    .single();

  if (existingByName) {
    return { id: existingByName.id, action: "found" };
  }

  // Create new lawyer only if we have bar number
  if (!lawyerData.barMembershipNumber) {
    return null; // Skip creation without bar number
  }

  const slug = lawyerData.name
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();

  // Check for slug collision
  const { data: slugCheck } = await supabase
    .from("lawyers")
    .select("slug")
    .like("slug", `${slug}%`);

  const finalSlug =
    slugCheck && slugCheck.length > 0 ? `${slug}-${slugCheck.length + 1}` : slug;

  const { data: newLawyer, error } = await supabase
    .from("lawyers")
    .insert({
      slug: finalSlug,
      name: lawyerData.name,
      bar_membership_number: lawyerData.barMembershipNumber,
      firm_name: lawyerData.firmName,
      is_verified: false,
      is_claimed: false,
      is_active: true,
    })
    .select("id")
    .single();

  if (error) {
    console.error(`Failed to create lawyer: ${error.message}`);
    return null;
  }

  return { id: newLawyer.id, action: "created" };
}

// Associate lawyer with case
async function associateLawyerWithCase(
  caseId: string,
  lawyerId: string,
  lawyerData: ScrapedLawyerData,
  sourceType: string,
  sourceUrl: string
): Promise<"created" | "updated" | "skipped"> {
  // Check for existing association
  const { data: existing } = await supabase
    .from("case_lawyers")
    .select("confidence_score, source_type")
    .eq("case_id", caseId)
    .eq("lawyer_id", lawyerId)
    .single();

  // Calculate confidence score
  const confidenceScore =
    sourceType === "court_record"
      ? 1.0
      : sourceType === "bar_council"
        ? 0.95
        : sourceType === "law_firm"
          ? 0.85
          : 0.7;

  if (existing) {
    const existingScore = Number(existing.confidence_score) || 0;

    // Only update if new source is more reliable
    if (confidenceScore > existingScore) {
      const { error } = await supabase
        .from("case_lawyers")
        .update({
          role: lawyerData.role,
          role_description: lawyerData.roleDescription,
          confidence_score: confidenceScore,
          source_type: sourceType,
          source_url: sourceUrl,
          scraped_at: new Date().toISOString(),
        })
        .eq("case_id", caseId)
        .eq("lawyer_id", lawyerId);

      if (error) {
        throw new Error(`Failed to update association: ${error.message}`);
      }

      return "updated";
    }

    return "skipped";
  }

  // Create new association
  const { error } = await supabase.from("case_lawyers").insert({
    case_id: caseId,
    lawyer_id: lawyerId,
    role: lawyerData.role,
    role_description: lawyerData.roleDescription,
    is_verified: sourceType === "court_record",
    confidence_score: confidenceScore,
    source_type: sourceType,
    source_url: sourceUrl,
    scraped_at: new Date().toISOString(),
  });

  if (error) {
    throw new Error(`Failed to create association: ${error.message}`);
  }

  return "created";
}

// Process scraped case data
async function processScrapedData(
  data: ScrapedCaseData[],
  logId: string
): Promise<{
  processed: number;
  created: number;
  updated: number;
  skipped: number;
  errors: Array<{ message: string; context?: Record<string, unknown> }>;
}> {
  const results = {
    processed: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [] as Array<{ message: string; context?: Record<string, unknown> }>,
  };

  for (const caseData of data) {
    for (const lawyerData of caseData.lawyers) {
      try {
        // Find or create lawyer
        const lawyerResult = await findOrCreateLawyer(lawyerData);

        if (!lawyerResult) {
          results.skipped++;
          results.errors.push({
            message: "Skipped lawyer without bar number",
            context: { name: lawyerData.name, caseId: caseData.caseId },
          });
          continue;
        }

        // Associate with case
        const action = await associateLawyerWithCase(
          caseData.caseId,
          lawyerResult.id,
          lawyerData,
          caseData.sourceType,
          caseData.sourceUrl
        );

        results.processed++;

        if (action === "created") {
          results.created++;
        } else if (action === "updated") {
          results.updated++;
        } else {
          results.skipped++;
        }
      } catch (error) {
        results.errors.push({
          message: error instanceof Error ? error.message : "Unknown error",
          context: { lawyer: lawyerData.name, caseId: caseData.caseId },
        });
      }
    }

    // Periodically update the log
    if (results.processed % 10 === 0) {
      await updateScrapingLog(logId, {
        recordsProcessed: results.processed,
        recordsCreated: results.created,
        recordsUpdated: results.updated,
        recordsSkipped: results.skipped,
        errorCount: results.errors.length,
        errors: results.errors.slice(-50), // Keep last 50 errors
      });
    }
  }

  return results;
}

// Main handler
Deno.serve(async (req) => {
  const startTime = Date.now();

  try {
    // Parse request body for configuration
    const body = await req.json().catch(() => ({}));
    const {
      sourceType = "news",
      limit = 10,
      dryRun = false,
    } = body as {
      sourceType?: ScrapingJob["sourceType"];
      limit?: number;
      dryRun?: boolean;
    };

    // Create scraping log
    const logId = await createScrapingLog("case_lawyer", sourceType);

    console.log(`Starting scraping job ${logId} for source: ${sourceType}`);

    // TODO: Implement actual scraping logic here
    // For now, this is a placeholder that shows the structure
    // The actual implementation would:
    // 1. Fetch cases that need lawyer data
    // 2. Scrape from the appropriate source
    // 3. Extract lawyer information using AI
    // 4. Process and store the data

    // Placeholder: Get cases without lawyers
    const { data: casesWithoutLawyers } = await supabase
      .from("cases")
      .select("id, title, case_number")
      .is("case_number", null) // No case number means likely not processed
      .limit(limit);

    if (!casesWithoutLawyers || casesWithoutLawyers.length === 0) {
      await updateScrapingLog(logId, {
        status: "completed",
        recordsProcessed: 0,
        recordsCreated: 0,
        recordsUpdated: 0,
        recordsSkipped: 0,
        errorCount: 0,
        errors: [],
        completedAt: new Date().toISOString(),
        durationMs: Date.now() - startTime,
        metadata: { message: "No cases to process" },
      });

      return new Response(
        JSON.stringify({
          success: true,
          message: "No cases to process",
          logId,
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    // In a real implementation, this would call the scrapers
    // For now, return a placeholder response
    const durationMs = Date.now() - startTime;

    await updateScrapingLog(logId, {
      status: "completed",
      recordsProcessed: 0,
      recordsCreated: 0,
      recordsUpdated: 0,
      recordsSkipped: casesWithoutLawyers.length,
      errorCount: 0,
      errors: [],
      completedAt: new Date().toISOString(),
      durationMs,
      metadata: {
        message: "Scraping logic not yet implemented",
        casesFound: casesWithoutLawyers.length,
        dryRun,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Scraping job completed (placeholder)",
        logId,
        casesFound: casesWithoutLawyers.length,
        durationMs,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Scraping job failed:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
