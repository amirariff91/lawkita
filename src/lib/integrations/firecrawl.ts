/**
 * Firecrawl Integration
 * Handles news crawling for famous cases and lawyer-case associations
 */

interface CrawlResult {
  success: boolean;
  status: string;
  total: number;
  creditsUsed: number;
  expiresAt: string;
  data: Array<{
    markdown?: string;
    html?: string;
    links?: string[];
    metadata?: {
      title?: string;
      description?: string;
      language?: string;
      sourceURL?: string;
      publishedAt?: string;
    };
  }>;
}

interface ScrapeResult {
  success: boolean;
  data: {
    markdown?: string;
    html?: string;
    metadata?: {
      title?: string;
      description?: string;
      sourceURL?: string;
      publishedAt?: string;
    };
  };
}

const FIRECRAWL_API_URL = "https://api.firecrawl.dev/v1";

function getApiKey(): string | undefined {
  return process.env.FIRECRAWL_API_KEY;
}

/**
 * Crawl a website for news articles
 */
export async function crawlWebsite(
  url: string,
  options: {
    limit?: number;
    includePaths?: string[];
    excludePaths?: string[];
    maxDepth?: number;
  } = {}
): Promise<CrawlResult | null> {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.warn("FIRECRAWL_API_KEY not configured");
    return null;
  }

  try {
    const response = await fetch(`${FIRECRAWL_API_URL}/crawl`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        url,
        limit: options.limit || 100,
        scrapeOptions: {
          formats: ["markdown"],
        },
        includePaths: options.includePaths,
        excludePaths: options.excludePaths,
        maxDepth: options.maxDepth || 2,
      }),
    });

    if (!response.ok) {
      console.error("Firecrawl crawl error:", await response.text());
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("Failed to crawl:", error);
    return null;
  }
}

/**
 * Scrape a single page
 */
export async function scrapePage(url: string): Promise<ScrapeResult | null> {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.warn("FIRECRAWL_API_KEY not configured");
    return null;
  }

  try {
    const response = await fetch(`${FIRECRAWL_API_URL}/scrape`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        url,
        formats: ["markdown"],
      }),
    });

    if (!response.ok) {
      console.error("Firecrawl scrape error:", await response.text());
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("Failed to scrape:", error);
    return null;
  }
}

/**
 * Malaysian news sources with trust scores
 */
export const NEWS_SOURCES = [
  // Mainstream (trust score 1.0)
  { url: "https://www.thestar.com.my", name: "The Star", trustScore: 1.0, type: "mainstream" },
  { url: "https://www.nst.com.my", name: "New Straits Times", trustScore: 1.0, type: "mainstream" },
  { url: "https://www.malaymail.com", name: "Malay Mail", trustScore: 1.0, type: "mainstream" },
  { url: "https://www.freemalaysiatoday.com", name: "Free Malaysia Today", trustScore: 0.9, type: "mainstream" },
  { url: "https://www.theedgemarkets.com", name: "The Edge", trustScore: 1.0, type: "mainstream" },
  { url: "https://www.bernama.com", name: "Bernama", trustScore: 1.0, type: "government" },

  // Legal News (trust score 0.9)
  { url: "https://focusmalaysia.my", name: "Focus Malaysia", trustScore: 0.8, type: "legal" },

  // International covering Malaysia (trust score 0.9)
  { url: "https://www.reuters.com", name: "Reuters", trustScore: 1.0, type: "international" },
  { url: "https://www.channelnewsasia.com", name: "CNA", trustScore: 0.9, type: "international" },
];

/**
 * Search patterns for legal news
 */
export const LEGAL_SEARCH_PATTERNS = [
  // Court cases
  "/tag/court",
  "/tag/legal",
  "/tag/judiciary",
  "/tag/trial",
  "/news/nation/courts-crime",
  "/news/courts-crime",

  // Specific search queries
  "?q=court+case",
  "?q=lawyer+trial",
  "?q=high+court+malaysia",
];

/**
 * Extract case and lawyer mentions from article content
 */
export interface ExtractedMention {
  type: "case" | "lawyer";
  name: string;
  role?: string;
  confidence: number;
  context: string;
}

export function extractMentions(markdown: string): ExtractedMention[] {
  const mentions: ExtractedMention[] = [];

  // Common patterns for lawyer mentions
  const lawyerPatterns = [
    // "lawyer [Name]" or "counsel [Name]"
    /(?:lawyer|counsel|advocate|solicitor)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/gi,
    // "[Name], who is representing"
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+),?\s+who\s+(?:is\s+)?represent(?:ing|ed)/gi,
    // "represented by [Name]"
    /represented\s+by\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/gi,
    // "defense/prosecution lawyer [Name]"
    /(?:defence|defense|prosecution)\s+(?:lawyer|counsel)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/gi,
  ];

  // Common patterns for case mentions
  const casePatterns = [
    // "The [Name] case" or "[Name] trial"
    /(?:the\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:case|trial|scandal|affair)/gi,
    // "Case No. [number]"
    /case\s+(?:no\.?|number)\s*:?\s*([A-Za-z0-9\-\/]+)/gi,
    // "PP v [Name]" or "[Name] v PP"
    /(?:PP|Public\s+Prosecutor)\s+v\.?\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi,
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+v\.?\s+(?:PP|Public\s+Prosecutor)/gi,
  ];

  // Extract lawyer mentions
  for (const pattern of lawyerPatterns) {
    const matches = markdown.matchAll(pattern);
    for (const match of matches) {
      if (match[1]) {
        const name = match[1].trim();
        // Skip common false positives
        if (!isCommonWord(name) && name.length > 3) {
          const contextStart = Math.max(0, match.index! - 100);
          const contextEnd = Math.min(markdown.length, match.index! + match[0].length + 100);
          mentions.push({
            type: "lawyer",
            name,
            confidence: 0.7,
            context: markdown.slice(contextStart, contextEnd),
          });
        }
      }
    }
  }

  // Extract case mentions
  for (const pattern of casePatterns) {
    const matches = markdown.matchAll(pattern);
    for (const match of matches) {
      if (match[1]) {
        const name = match[1].trim();
        if (!isCommonWord(name) && name.length > 3) {
          const contextStart = Math.max(0, match.index! - 100);
          const contextEnd = Math.min(markdown.length, match.index! + match[0].length + 100);
          mentions.push({
            type: "case",
            name,
            confidence: 0.6,
            context: markdown.slice(contextStart, contextEnd),
          });
        }
      }
    }
  }

  return mentions;
}

function isCommonWord(word: string): boolean {
  const commonWords = new Set([
    "The", "This", "That", "These", "Those", "Which", "What", "Who",
    "When", "Where", "Why", "How", "Court", "High", "Federal", "Sessions",
    "Today", "Yesterday", "Monday", "Tuesday", "Wednesday", "Thursday",
    "Friday", "Saturday", "Sunday", "January", "February", "March", "April",
    "May", "June", "July", "August", "September", "October", "November", "December",
  ]);
  return commonWords.has(word.split(" ")[0]);
}

export function isFirecrawlConfigured(): boolean {
  return Boolean(getApiKey());
}
