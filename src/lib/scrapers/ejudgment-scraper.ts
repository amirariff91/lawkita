// e-Judgment Portal Scraper (kehakiman.gov.my)
// Extracts case information and lawyer names from Malaysian court judgments

import * as cheerio from "cheerio";
import { db } from "@/lib/db";
import { cases, caseLawyers, lawyers, scrapingLogs } from "@/lib/db/schema";
import { eq, ilike, or } from "drizzle-orm";
import type { LawyerRole, SourceType } from "@/types/case";

export interface JudgmentData {
  caseNumber: string;
  citation?: string;
  court: string;
  title: string;
  judgmentDate: string;
  lawyers: ExtractedLawyer[];
  sourceUrl: string;
  category?: "criminal" | "corporate" | "constitutional" | "other";
  summary?: string;
}

export interface ExtractedLawyer {
  name: string;
  role: LawyerRole;
  roleDescription?: string;
  firmName?: string;
}

// Common patterns for identifying lawyers in Malaysian judgments
const PROSECUTION_PATTERNS = [
  /(?:DPP|TPR|Timbalan Pendakwa Raya|Deputy Public Prosecutor)[:\s]+([^,\n]+)/gi,
  /(?:for the (?:prosecution|state|government))[:\s]*([^,\n]+)/gi,
  /(?:Pendakwa Raya|Public Prosecutor)[:\s]*([^,\n]+)/gi,
];

const DEFENSE_PATTERNS = [
  /(?:for the (?:accused|appellant|defendant|respondent))[:\s]*([^,\n]+)/gi,
  /(?:Peguam|Counsel|defended by)[:\s]*([^,\n]+)/gi,
  /(?:represented by)[:\s]*([^,\n]+)/gi,
];

const JUDGE_PATTERNS = [
  /(?:before|coram)[:\s]*(?:Y\.?A\.?|Yang Arif)[:\s]*([^,\n]+)/gi,
  /(?:Judge|Hakim)[:\s]*([^,\n]+)/gi,
  /(?:delivered by)[:\s]*(?:Y\.?A\.?)?[:\s]*([^,\n]+)/gi,
];

// Common law firm name patterns
const FIRM_PATTERNS = [
  /([A-Z][a-z]+(?:\s+&\s+[A-Z][a-z]+)+)/g, // "Smith & Partners"
  /([A-Z][a-z]+,\s*[A-Z][a-z]+(?:\s+&\s+Co\.?)?)/g, // "Lee, Wong & Co"
  /(?:of|from)\s+([A-Z][a-zA-Z\s&]+(?:Advocates|Solicitors|Associates))/gi,
];

/**
 * Clean and normalize lawyer name
 */
function cleanLawyerName(name: string): string {
  return name
    .replace(/\(.*?\)/g, "") // Remove parenthetical content
    .replace(/(?:Esq\.?|Advocate|Solicitor)/gi, "")
    .replace(/^(?:Mr\.?|Mrs\.?|Ms\.?|Datuk|Dato'?|Tan Sri)\s+/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Extract firm name from lawyer string
 */
function extractFirmName(text: string): string | undefined {
  for (const pattern of FIRM_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }
  return undefined;
}

/**
 * Extract lawyers from judgment text using patterns
 */
export function extractLawyersFromText(text: string): ExtractedLawyer[] {
  const lawyers: ExtractedLawyer[] = [];
  const seenNames = new Set<string>();

  // Extract prosecution lawyers
  for (const pattern of PROSECUTION_PATTERNS) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const rawName = match[1];
      const name = cleanLawyerName(rawName);

      if (name && name.length > 3 && !seenNames.has(name.toLowerCase())) {
        seenNames.add(name.toLowerCase());
        lawyers.push({
          name,
          role: "prosecution",
          firmName: extractFirmName(rawName),
        });
      }
    }
  }

  // Extract defense lawyers
  for (const pattern of DEFENSE_PATTERNS) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const rawName = match[1];
      const name = cleanLawyerName(rawName);

      if (name && name.length > 3 && !seenNames.has(name.toLowerCase())) {
        seenNames.add(name.toLowerCase());
        lawyers.push({
          name,
          role: "defense",
          firmName: extractFirmName(rawName),
        });
      }
    }
  }

  // Extract judges
  for (const pattern of JUDGE_PATTERNS) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const rawName = match[1];
      const name = cleanLawyerName(rawName);

      if (name && name.length > 3 && !seenNames.has(name.toLowerCase())) {
        seenNames.add(name.toLowerCase());
        lawyers.push({
          name,
          role: "judge",
          roleDescription: "Presiding Judge",
        });
      }
    }
  }

  return lawyers;
}

/**
 * Parse case number from various formats
 */
export function parseCaseNumber(text: string): string | undefined {
  // Common Malaysian case number patterns
  const patterns = [
    // High Court: WA-22NCC-233-07/2018
    /([A-Z]{2}-\d{2}[A-Z]{2,4}-\d+-\d{2}\/\d{4})/,
    // Court of Appeal: W-01(A)-1-02/2022
    /([A-Z]-\d{2}\([A-Z]\)-\d+-\d{2}\/\d{4})/,
    // Federal Court: 02-63-07/2022
    /(\d{2}-\d{2,3}-\d{2}\/\d{4})/,
    // Generic: Case No. [anything]
    /(?:Case No\.?|Kes No\.?)[:\s]*([A-Z0-9\-\/]+)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return undefined;
}

/**
 * Parse citation from judgment text
 * Example: [2020] MLJU 1234, [2019] 3 MLJ 456
 */
export function parseCitation(text: string): string | undefined {
  const patterns = [
    /\[(\d{4})\]\s+(\d+\s+)?([A-Z]{2,4})\s+(\d+)/,
    /\[(\d{4})\]\s+([A-Z]{3,4}[A-Z]?)\s+(\d+)/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[0];
    }
  }

  return undefined;
}

/**
 * Parse court name from judgment text
 */
export function parseCourt(text: string): string | undefined {
  const courts = [
    "Federal Court",
    "Court of Appeal",
    "High Court",
    "Sessions Court",
    "Magistrate Court",
    "Industrial Court",
    "Mahkamah Persekutuan",
    "Mahkamah Rayuan",
    "Mahkamah Tinggi",
    "Mahkamah Sesyen",
    "Mahkamah Majistret",
  ];

  const locations = [
    "Kuala Lumpur",
    "Putrajaya",
    "Shah Alam",
    "Seremban",
    "Johor Bahru",
    "Ipoh",
    "George Town",
    "Penang",
    "Kota Kinabalu",
    "Kuching",
    "Melaka",
    "Alor Setar",
    "Kuantan",
  ];

  for (const court of courts) {
    const courtPattern = new RegExp(
      `${court}(?:\\s+(?:of|at|in))?\\s+(${locations.join("|")})`,
      "i"
    );
    const match = text.match(courtPattern);
    if (match) {
      return `${court} ${match[1]}`;
    }

    // Court without location
    if (text.includes(court)) {
      return court;
    }
  }

  return undefined;
}

/**
 * Extract date from text in various formats
 */
function extractDate(text: string): string {
  // Try to find date patterns
  const datePatterns = [
    // DD Month YYYY (e.g., "15 January 2024")
    /(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/i,
    // YYYY-MM-DD
    /(\d{4})-(\d{2})-(\d{2})/,
    // DD/MM/YYYY or DD-MM-YYYY
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/,
  ];

  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      // Return ISO date string
      try {
        const date = new Date(match[0]);
        if (!isNaN(date.getTime())) {
          return date.toISOString().split("T")[0];
        }
      } catch {
        // Try to construct date manually
        if (match.length >= 4) {
          const months: Record<string, number> = {
            january: 0, february: 1, march: 2, april: 3,
            may: 4, june: 5, july: 6, august: 7,
            september: 8, october: 9, november: 10, december: 11,
          };
          const monthNum = months[match[2].toLowerCase()];
          if (monthNum !== undefined) {
            const date = new Date(parseInt(match[3]), monthNum, parseInt(match[1]));
            return date.toISOString().split("T")[0];
          }
        }
      }
    }
  }

  // Default to today's date if not found
  return new Date().toISOString().split("T")[0];
}

/**
 * Detect case category from text content
 */
function detectCategory(text: string): JudgmentData["category"] {
  const lowerText = text.toLowerCase();

  if (/corruption|rasuah|amla|macc|sprm/i.test(lowerText)) {
    return "criminal"; // Corruption cases are criminal
  }
  if (/constitution|perlembagaan|fundamental|liberty|article \d+/i.test(lowerText)) {
    return "constitutional";
  }
  if (/company|syarikat|securities|corporate|commercial|contract/i.test(lowerText)) {
    return "corporate";
  }
  if (/murder|pembunuhan|theft|robbery|drug|trafficking/i.test(lowerText)) {
    return "criminal";
  }

  return "other";
}

// e-Judgment Portal base URLs
const EJUDGMENT_BASE_URL = "https://efiling.kehakiman.gov.my";
const EJUDGMENT_SEARCH_URL = `${EJUDGMENT_BASE_URL}/ejudgment/search`;

// User agent for requests
const USER_AGENT = "LawKita Legal Directory Bot/1.0 (+https://lawkita.my/bot)";

/**
 * Main scraper function to fetch and parse e-Judgment data
 */
export async function scrapeEJudgment(url: string): Promise<JudgmentData | null> {
  try {
    console.log(`[eJudgment] Scraping URL: ${url}`);

    // Fetch the judgment page
    const response = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-MY,en;q=0.9,ms;q=0.8",
      },
    });

    if (!response.ok) {
      console.error(`[eJudgment] HTTP ${response.status} for ${url}`);
      return null;
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Extract text content from judgment body
    // The e-Judgment portal typically has the content in specific containers
    const contentSelectors = [
      ".judgment-content",
      ".case-content",
      "#judgment-body",
      "article",
      ".content-area",
      "main",
    ];

    let textContent = "";
    for (const selector of contentSelectors) {
      const element = $(selector);
      if (element.length > 0) {
        textContent = element.text();
        break;
      }
    }

    // Fallback to body text if no specific content found
    if (!textContent) {
      textContent = $("body").text();
    }

    // Extract title
    const titleSelectors = [
      "h1.case-title",
      "h1.judgment-title",
      ".case-header h1",
      "h1",
      "title",
    ];

    let title = "";
    for (const selector of titleSelectors) {
      const element = $(selector).first();
      if (element.length > 0) {
        title = element.text().trim();
        if (title && title.length > 5) break;
      }
    }

    // If no title found, try to extract from case parties
    if (!title) {
      const ppMatch = textContent.match(/(?:PP|Public Prosecutor)\s+v\.?\s+([A-Z][a-zA-Z\s]+)/);
      if (ppMatch) {
        title = `PP v ${ppMatch[1].trim()}`;
      }
    }

    // Extract structured data using helper functions
    const lawyersList = extractLawyersFromText(textContent);
    const caseNumber = parseCaseNumber(textContent);
    const citation = parseCitation(textContent);
    const court = parseCourt(textContent);
    const judgmentDate = extractDate(textContent);
    const category = detectCategory(textContent);

    // Extract summary from meta description or first paragraph
    let summary = $('meta[name="description"]').attr("content");
    if (!summary) {
      const firstPara = $("p").first().text().trim();
      if (firstPara && firstPara.length > 50) {
        summary = firstPara.slice(0, 500);
      }
    }

    if (!title || !court) {
      console.warn(`[eJudgment] Missing essential data for ${url}`);
      return null;
    }

    return {
      caseNumber: caseNumber || "",
      citation,
      court: court || "Unknown Court",
      title,
      judgmentDate,
      lawyers: lawyersList,
      sourceUrl: url,
      category,
      summary,
    };
  } catch (error) {
    console.error(`[eJudgment] Failed to scrape ${url}:`, error);
    return null;
  }
}

/**
 * Search and scrape multiple judgments from the e-Judgment portal
 */
export async function scrapeJudgmentsList(searchParams: {
  keyword?: string;
  court?: string;
  year?: number;
  limit?: number;
}): Promise<JudgmentData[]> {
  const { keyword, court, year, limit = 50 } = searchParams;
  const judgments: JudgmentData[] = [];

  console.log(`[eJudgment] Searching with params:`, searchParams);

  try {
    // Build search URL with query parameters
    const searchUrl = new URL(EJUDGMENT_SEARCH_URL);
    if (keyword) searchUrl.searchParams.set("q", keyword);
    if (court) searchUrl.searchParams.set("court", court);
    if (year) searchUrl.searchParams.set("year", year.toString());
    searchUrl.searchParams.set("limit", Math.min(limit, 100).toString());

    // Fetch search results page
    const response = await fetch(searchUrl.toString(), {
      headers: {
        "User-Agent": USER_AGENT,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-MY,en;q=0.9,ms;q=0.8",
      },
    });

    if (!response.ok) {
      console.error(`[eJudgment] Search failed with HTTP ${response.status}`);
      return [];
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Extract judgment URLs from search results
    // Common patterns for result links
    const linkSelectors = [
      "a.judgment-link",
      ".search-result a",
      ".case-list a",
      'a[href*="judgment"]',
      'a[href*="case"]',
    ];

    const urls: string[] = [];
    for (const selector of linkSelectors) {
      $(selector).each((_, element) => {
        const href = $(element).attr("href");
        if (href) {
          // Resolve relative URLs
          const fullUrl = href.startsWith("http") ? href : new URL(href, EJUDGMENT_BASE_URL).toString();
          if (!urls.includes(fullUrl)) {
            urls.push(fullUrl);
          }
        }
      });
      if (urls.length >= limit) break;
    }

    console.log(`[eJudgment] Found ${urls.length} judgment URLs`);

    // Scrape each judgment with rate limiting
    for (const url of urls.slice(0, limit)) {
      try {
        // Rate limit: wait 500ms between requests
        await new Promise((resolve) => setTimeout(resolve, 500));

        const judgment = await scrapeEJudgment(url);
        if (judgment) {
          judgments.push(judgment);
        }
      } catch (error) {
        console.error(`[eJudgment] Error scraping ${url}:`, error);
      }
    }
  } catch (error) {
    console.error(`[eJudgment] Search error:`, error);
  }

  console.log(`[eJudgment] Successfully scraped ${judgments.length} judgments`);
  return judgments;
}

/**
 * Save scraped judgments to database
 */
export async function saveJudgmentsToDatabase(judgments: JudgmentData[]): Promise<{
  casesCreated: number;
  casesUpdated: number;
  lawyerAssociationsCreated: number;
  errors: string[];
  duration: number;
}> {
  const startTime = Date.now();
  const result = {
    casesCreated: 0,
    casesUpdated: 0,
    lawyerAssociationsCreated: 0,
    errors: [] as string[],
    duration: 0,
  };

  // Create scraping log entry
  const [logEntry] = await db
    .insert(scrapingLogs)
    .values({
      jobType: "case_lawyer",
      sourceType: "court_record",
      sourceUrl: SOURCE_BASE_URL,
      status: "running",
    })
    .returning();

  try {
    for (const judgment of judgments) {
      try {
        // Generate slug from title
        const slug = generateSlug(judgment.title);

        // Check if case already exists
        const existingCase = await db.query.cases.findFirst({
          where: or(
            eq(cases.slug, slug),
            judgment.caseNumber ? eq(cases.caseNumber, judgment.caseNumber) : undefined,
            judgment.citation ? eq(cases.citation, judgment.citation) : undefined
          ),
        });

        let caseId: string;

        if (existingCase) {
          // Update existing case
          caseId = existingCase.id;
          await db
            .update(cases)
            .set({
              court: judgment.court || existingCase.court,
              citation: judgment.citation || existingCase.citation,
              caseNumber: judgment.caseNumber || existingCase.caseNumber,
              description: judgment.summary || existingCase.description,
              updatedAt: new Date(),
            })
            .where(eq(cases.id, caseId));
          result.casesUpdated++;
        } else {
          // Create new case
          const [newCase] = await db
            .insert(cases)
            .values({
              slug,
              title: judgment.title,
              subtitle: judgment.citation || judgment.caseNumber,
              description: judgment.summary,
              category: judgment.category || "other",
              status: "concluded",
              caseNumber: judgment.caseNumber,
              citation: judgment.citation,
              court: judgment.court,
              verdictDate: judgment.judgmentDate ? new Date(judgment.judgmentDate) : undefined,
              isPublished: false, // Require manual review before publishing
            })
            .returning();
          caseId = newCase.id;
          result.casesCreated++;
        }

        // Process lawyer associations
        for (const lawyerData of judgment.lawyers) {
          try {
            // Search for lawyer in database
            const matchedLawyers = await db.query.lawyers.findMany({
              where: ilike(lawyers.name, `%${lawyerData.name}%`),
              columns: { id: true, name: true },
              limit: 5,
            });

            // Find best match
            const exactMatch = matchedLawyers.find(
              (l) => l.name.toLowerCase() === lawyerData.name.toLowerCase()
            );
            const partialMatch = matchedLawyers[0];
            const matchedLawyer = exactMatch || partialMatch;

            if (matchedLawyer) {
              // Create case-lawyer association
              await db
                .insert(caseLawyers)
                .values({
                  caseId,
                  lawyerId: matchedLawyer.id,
                  role: lawyerData.role,
                  roleDescription: lawyerData.roleDescription,
                  isVerified: false,
                  confidenceScore: exactMatch ? "0.95" : "0.80",
                  sourceType: "court_record",
                  sourceUrl: judgment.sourceUrl,
                  scrapedAt: new Date(),
                })
                .onConflictDoNothing();
              result.lawyerAssociationsCreated++;
            }
          } catch (lawyerError) {
            // Don't fail the whole job for individual lawyer association errors
            console.warn(`[eJudgment] Failed to associate lawyer ${lawyerData.name}:`, lawyerError);
          }
        }
      } catch (judgmentError) {
        const errorMsg = `Failed to save judgment "${judgment.title}": ${judgmentError}`;
        console.error(`[eJudgment] ${errorMsg}`);
        result.errors.push(errorMsg);
      }
    }

    // Update scraping log
    result.duration = Date.now() - startTime;
    await db
      .update(scrapingLogs)
      .set({
        status: result.errors.length > 0 ? "partial" : "completed",
        recordsProcessed: judgments.length,
        recordsCreated: result.casesCreated,
        recordsUpdated: result.casesUpdated,
        errorCount: result.errors.length,
        errors: result.errors.length > 0 ? result.errors.map((e) => ({ message: e })) : undefined,
        completedAt: new Date(),
        durationMs: result.duration,
      })
      .where(eq(scrapingLogs.id, logEntry.id));
  } catch (error) {
    // Update scraping log with failure
    result.duration = Date.now() - startTime;
    await db
      .update(scrapingLogs)
      .set({
        status: "failed",
        errorCount: 1,
        errors: [{ message: `Fatal error: ${error}` }],
        completedAt: new Date(),
        durationMs: result.duration,
      })
      .where(eq(scrapingLogs.id, logEntry.id));

    result.errors.push(`Fatal error: ${error}`);
  }

  return result;
}

/**
 * Generate URL-safe slug from title
 */
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 100);
}

// Export source type for this scraper
export const SOURCE_TYPE: SourceType = "court_record";
export const SOURCE_NAME = "e-Judgment Portal";
export const SOURCE_BASE_URL = "https://efiling.kehakiman.gov.my";
