/**
 * News Crawler Job
 * Daily batch job to crawl Malaysian news for famous cases and lawyer associations
 *
 * This can be run via:
 * - Vercel Cron
 * - GitHub Actions
 * - Manual trigger via API
 */

import { db } from "@/lib/db";
import { cases, caseLawyers, caseMediaReferences, lawyers, scrapingLogs } from "@/lib/db/schema";
import { eq, ilike, or } from "drizzle-orm";
import {
  scrapePage,
  crawlWebsite,
  NEWS_SOURCES,
  extractMentions,
  type ExtractedMention,
} from "@/lib/integrations/firecrawl";
import { extractCaseDataFromArticle, matchLawyersToDatabase } from "@/lib/ai/extraction";

interface CrawlJobResult {
  success: boolean;
  sourcesProcessed: number;
  articlesFound: number;
  casesCreated: number;
  casesUpdated: number;
  lawyerAssociationsCreated: number;
  errors: string[];
  duration: number;
}

interface CrawledArticle {
  url: string;
  title: string;
  content: string;
  publishedAt?: string;
  sourceInfo: (typeof NEWS_SOURCES)[0];
}

/**
 * Main crawler job entry point
 */
export async function runNewsCrawlerJob(): Promise<CrawlJobResult> {
  const startTime = Date.now();
  const result: CrawlJobResult = {
    success: true,
    sourcesProcessed: 0,
    articlesFound: 0,
    casesCreated: 0,
    casesUpdated: 0,
    lawyerAssociationsCreated: 0,
    errors: [],
    duration: 0,
  };

  console.log("[NewsCrawler] Starting daily news crawl...");

  // Create scraping log entry
  const [logEntry] = await db
    .insert(scrapingLogs)
    .values({
      jobType: "news_extraction",
      sourceType: "news",
      status: "running",
    })
    .returning();

  try {
    // Process each news source
    for (const source of NEWS_SOURCES) {
      try {
        console.log(`[NewsCrawler] Processing ${source.name}...`);

        // Get legal news URLs to scrape
        const legalNewsUrls = await findLegalNewsUrls(source);
        result.sourcesProcessed++;

        for (const url of legalNewsUrls.slice(0, 10)) {
          // Limit per source
          try {
            const article = await scrapeArticle(url, source);
            if (!article) continue;

            result.articlesFound++;

            // Extract case data using AI
            const extraction = await extractCaseDataFromArticle(
              article.content,
              article.title,
              article.url,
              article.publishedAt
            );

            if (extraction.success && extraction.caseData) {
              // Process the extracted case
              const caseResult = await processExtractedCase(
                extraction.caseData,
                article,
                source.trustScore
              );

              if (caseResult.created) result.casesCreated++;
              if (caseResult.updated) result.casesUpdated++;
              result.lawyerAssociationsCreated += caseResult.lawyerAssociations;
            }
          } catch (articleError) {
            const error = `Error processing article ${url}: ${articleError}`;
            console.error(`[NewsCrawler] ${error}`);
            result.errors.push(error);
          }
        }
      } catch (sourceError) {
        const error = `Error processing source ${source.name}: ${sourceError}`;
        console.error(`[NewsCrawler] ${error}`);
        result.errors.push(error);
      }
    }
  } catch (error) {
    result.success = false;
    result.errors.push(`Fatal error: ${error}`);
  }

  result.duration = Date.now() - startTime;
  console.log(
    `[NewsCrawler] Completed in ${result.duration}ms. ` +
      `Cases: ${result.casesCreated} created, ${result.casesUpdated} updated. ` +
      `Errors: ${result.errors.length}`
  );

  // Update scraping log
  await db
    .update(scrapingLogs)
    .set({
      status: result.success ? (result.errors.length > 0 ? "partial" : "completed") : "failed",
      recordsProcessed: result.articlesFound,
      recordsCreated: result.casesCreated,
      recordsUpdated: result.casesUpdated,
      errorCount: result.errors.length,
      errors: result.errors.length > 0 ? result.errors.slice(0, 50).map((e) => ({ message: e })) : undefined,
      completedAt: new Date(),
      durationMs: result.duration,
      metadata: {
        sourcesProcessed: result.sourcesProcessed,
        lawyerAssociationsCreated: result.lawyerAssociationsCreated,
      },
    })
    .where(eq(scrapingLogs.id, logEntry.id));

  return result;
}

/**
 * Legal content keywords for filtering
 */
const LEGAL_KEYWORDS = [
  "court", "judge", "lawyer", "attorney", "trial", "verdict",
  "prosecution", "defendant", "accused", "charged", "sentenced",
  "mahkamah", "hakim", "peguam", "tuduhan", "hukuman",
  "high court", "federal court", "sessions court", "appeal",
  "acquitted", "convicted", "bail", "custody",
];

/**
 * Check if content appears to be legal/court-related
 */
function isLegalContent(text: string): boolean {
  const lowerText = text.toLowerCase();
  let matchCount = 0;

  for (const keyword of LEGAL_KEYWORDS) {
    if (lowerText.includes(keyword)) {
      matchCount++;
      // Require at least 2 keyword matches for confidence
      if (matchCount >= 2) return true;
    }
  }

  return false;
}

/**
 * Find legal news URLs from a source using Firecrawl crawl endpoint
 */
async function findLegalNewsUrls(source: (typeof NEWS_SOURCES)[0]): Promise<string[]> {
  try {
    // Use Firecrawl to crawl the news source and discover legal articles
    const crawlResult = await crawlWebsite(source.url, {
      limit: 30,
      includePaths: [
        "/news/courts*",
        "/news/nation/courts*",
        "/tag/court*",
        "/tag/legal*",
        "/courts*",
        "/crime*",
        "/nation/courts*",
      ],
      excludePaths: [
        "/sports*",
        "/lifestyle*",
        "/entertainment*",
        "/business/markets*",
        "/tech*",
        "/photos*",
        "/videos*",
      ],
      maxDepth: 2,
    });

    if (!crawlResult?.success || !crawlResult.data) {
      console.warn(`[NewsCrawler] Crawl failed for ${source.name}, falling back to predefined sections`);
      // Fallback to predefined legal news sections
      return [
        `${source.url}/tag/court`,
        `${source.url}/tag/legal`,
        `${source.url}/news/courts-crime`,
        `${source.url}/nation/courts-crime`,
      ];
    }

    // Filter results for legal content
    const urls: string[] = [];

    for (const page of crawlResult.data) {
      const sourceUrl = page.metadata?.sourceURL;
      if (!sourceUrl) continue;

      // Check if the page content is legal-related
      const content = page.markdown || "";
      if (content && isLegalContent(content)) {
        urls.push(sourceUrl);
      }
    }

    console.log(`[NewsCrawler] Found ${urls.length} legal news URLs from ${source.name}`);

    // If no legal content found via crawl, return fallback URLs
    if (urls.length === 0) {
      return [
        `${source.url}/tag/court`,
        `${source.url}/tag/legal`,
        `${source.url}/news/courts-crime`,
        `${source.url}/nation/courts-crime`,
      ];
    }

    return urls;
  } catch (error) {
    console.error(`[NewsCrawler] Error finding legal news URLs for ${source.name}:`, error);
    // Return fallback URLs on error
    return [
      `${source.url}/tag/court`,
      `${source.url}/tag/legal`,
      `${source.url}/news/courts-crime`,
      `${source.url}/nation/courts-crime`,
    ];
  }
}

/**
 * Scrape a single article
 */
async function scrapeArticle(
  url: string,
  source: (typeof NEWS_SOURCES)[0]
): Promise<CrawledArticle | null> {
  const result = await scrapePage(url);
  if (!result?.success || !result.data?.markdown) {
    return null;
  }

  return {
    url,
    title: result.data.metadata?.title || "Untitled",
    content: result.data.markdown,
    publishedAt: result.data.metadata?.publishedAt,
    sourceInfo: source,
  };
}

/**
 * Process extracted case data
 */
async function processExtractedCase(
  caseData: Awaited<ReturnType<typeof extractCaseDataFromArticle>>["caseData"],
  article: CrawledArticle,
  trustScore: number
): Promise<{ created: boolean; updated: boolean; lawyerAssociations: number }> {
  if (!caseData) {
    return { created: false, updated: false, lawyerAssociations: 0 };
  }

  // Check if case already exists
  const existingCase = await db.query.cases.findFirst({
    where: or(
      ilike(cases.title, `%${caseData.caseName}%`),
      ...caseData.alternativeNames.map((name) => ilike(cases.title, `%${name}%`))
    ),
  });

  let caseId: string;
  let created = false;
  let updated = false;

  if (existingCase) {
    // Update existing case
    caseId = existingCase.id;
    updated = true;

    // Only update if new data seems more complete
    const shouldUpdate =
      caseData.confidence >= 70 && trustScore >= 0.8;

    if (shouldUpdate) {
      await db
        .update(cases)
        .set({
          status: caseData.status,
          verdictSummary: caseData.verdict || existingCase.verdictSummary,
          updatedAt: new Date(),
        })
        .where(eq(cases.id, caseId));
    }
  } else {
    // Create new case
    const slug = generateSlug(caseData.caseName);
    const [newCase] = await db
      .insert(cases)
      .values({
        slug,
        title: caseData.caseName,
        subtitle: caseData.summary,
        description: caseData.summary,
        category: caseData.category,
        status: caseData.status,
        verdictSummary: caseData.verdict,
        isPublished: caseData.confidence >= 80 && trustScore >= 0.9, // Only auto-publish high confidence
        tags: caseData.alternativeNames,
      })
      .returning();

    caseId = newCase.id;
    created = true;
  }

  // Add media reference
  await db
    .insert(caseMediaReferences)
    .values({
      caseId,
      source: article.sourceInfo.name,
      title: article.title,
      url: article.url,
      publishedAt: article.publishedAt ? new Date(article.publishedAt) : new Date(),
    })
    .onConflictDoNothing(); // Skip if already exists

  // Process lawyer associations
  let lawyerAssociations = 0;

  for (const lawyerData of caseData.lawyers) {
    // Search for lawyer in database
    const matches = await matchLawyersToDatabase([lawyerData], async (name) => {
      const results = await db.query.lawyers.findMany({
        where: ilike(lawyers.name, `%${name}%`),
        columns: { id: true, name: true },
        limit: 5,
      });
      return results;
    });

    const match = matches[0];
    if (match?.matchedId && match.matchConfidence >= 0.7) {
      // Create association
      await db
        .insert(caseLawyers)
        .values({
          caseId,
          lawyerId: match.matchedId,
          role: lawyerData.role,
          roleDescription: lawyerData.roleDescription,
          isVerified: false, // News-sourced associations need verification
        })
        .onConflictDoNothing();

      lawyerAssociations++;
    }
  }

  return { created, updated, lawyerAssociations };
}

/**
 * Generate URL-safe slug from case name
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 100);
}

/**
 * Calculate profile strength score for a lawyer
 * Used for gamification and encouraging profile completion
 */
export function calculateProfileStrength(lawyer: {
  bio?: string | null;
  photo?: string | null;
  email?: string | null;
  phone?: string | null;
  state?: string | null;
  city?: string | null;
  barMembershipNumber?: string | null;
  yearsAtBar?: number | null;
  practiceAreaCount?: number;
  educationCount?: number;
  reviewCount?: number;
  caseCount?: number;
}): { score: number; missing: string[]; suggestions: string[] } {
  const weights = {
    bio: 15,
    photo: 10,
    email: 10,
    phone: 10,
    location: 10,
    barInfo: 10,
    experience: 10,
    practiceAreas: 10,
    education: 5,
    reviews: 5,
    cases: 5,
  };

  let score = 0;
  const missing: string[] = [];
  const suggestions: string[] = [];

  // Bio (longer = better)
  if (lawyer.bio && lawyer.bio.length >= 100) {
    score += weights.bio;
  } else if (lawyer.bio && lawyer.bio.length > 0) {
    score += weights.bio * 0.5;
    suggestions.push("Expand your bio to at least 100 characters");
  } else {
    missing.push("Bio");
  }

  // Photo
  if (lawyer.photo) {
    score += weights.photo;
  } else {
    missing.push("Profile photo");
  }

  // Contact info
  if (lawyer.email) score += weights.email;
  else missing.push("Email");

  if (lawyer.phone) score += weights.phone;
  else missing.push("Phone number");

  // Location
  if (lawyer.state && lawyer.city) {
    score += weights.location;
  } else if (lawyer.state || lawyer.city) {
    score += weights.location * 0.5;
    missing.push("Complete location (state and city)");
  } else {
    missing.push("Location");
  }

  // Bar info
  if (lawyer.barMembershipNumber) {
    score += weights.barInfo;
  } else {
    missing.push("Bar membership number");
  }

  // Experience
  if (lawyer.yearsAtBar && lawyer.yearsAtBar > 0) {
    score += weights.experience;
  }

  // Practice areas
  if (lawyer.practiceAreaCount && lawyer.practiceAreaCount >= 1) {
    score += weights.practiceAreas;
    if (lawyer.practiceAreaCount < 3) {
      suggestions.push("Add more practice areas (at least 3 recommended)");
    }
  } else {
    missing.push("Practice areas");
  }

  // Education
  if (lawyer.educationCount && lawyer.educationCount >= 1) {
    score += weights.education;
  } else {
    suggestions.push("Add your educational background");
  }

  // Reviews (external factor)
  if (lawyer.reviewCount && lawyer.reviewCount >= 3) {
    score += weights.reviews;
  } else {
    suggestions.push("Encourage clients to leave reviews");
  }

  // Famous cases
  if (lawyer.caseCount && lawyer.caseCount >= 1) {
    score += weights.cases;
  }

  return {
    score: Math.round(score),
    missing,
    suggestions,
  };
}
