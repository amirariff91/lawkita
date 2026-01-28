// News Article Lawyer Extractor
// Uses AI to extract lawyer-case associations from news articles

import type { LawyerRole, SourceType } from "@/types/case";

export interface NewsArticle {
  url: string;
  title: string;
  content: string;
  publishedAt?: Date;
  source: string;
}

export interface ExtractedAssociation {
  lawyerName: string;
  role: LawyerRole;
  roleDescription?: string;
  caseTitle?: string;
  caseNumber?: string;
  confidence: number;
}

export interface ExtractionResult {
  article: NewsArticle;
  associations: ExtractedAssociation[];
  matchedCaseId?: string;
}

// Malaysian news sources with legal coverage
export const NEWS_SOURCES = [
  { name: "The Star", domain: "thestar.com.my", reliability: 0.85 },
  { name: "Malaysiakini", domain: "malaysiakini.com", reliability: 0.8 },
  { name: "New Straits Times", domain: "nst.com.my", reliability: 0.85 },
  { name: "Malay Mail", domain: "malaymail.com", reliability: 0.8 },
  { name: "Free Malaysia Today", domain: "freemalaysiatoday.com", reliability: 0.75 },
  { name: "The Edge", domain: "theedgemarkets.com", reliability: 0.9 },
  { name: "Bernama", domain: "bernama.com", reliability: 0.9 },
] as const;

// Keywords that indicate legal case coverage
const LEGAL_KEYWORDS = [
  // English
  "trial",
  "court",
  "lawyer",
  "advocate",
  "prosecution",
  "defense",
  "defendant",
  "accused",
  "plaintiff",
  "verdict",
  "sentence",
  "appeal",
  "judgment",
  "hearing",
  "bail",
  "charged",
  "convicted",
  "acquitted",
  // Malay
  "mahkamah",
  "peguam",
  "pendakwa",
  "tertuduh",
  "hakim",
  "rayuan",
  "hukuman",
  "perbicaraan",
];

// Common Malaysian lawyer name patterns
const LAWYER_NAME_PATTERNS = [
  // With title
  /(?:lawyer|counsel|advocate|peguam)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})/gi,
  // Defense/Prosecution lawyer
  /(?:defense|defence|prosecution)\s+(?:lawyer|counsel)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})/gi,
  // Represented by
  /represented\s+by\s+(?:lawyer\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})/gi,
  // Led by (for senior counsel)
  /led\s+by\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})/gi,
  // Muhammad/Ahmad/other Malay names with patronymic
  /(?:Datuk|Dato'?|Tan Sri)?\s*([A-Z][a-z]+(?:\s+(?:bin|binti|b\.|bt\.)\s+[A-Z][a-z]+)?(?:\s+[A-Z][a-z]+)*)/g,
];

// Role indicators in news text
const ROLE_INDICATORS: Record<LawyerRole, string[]> = {
  prosecution: [
    "prosecution",
    "deputy public prosecutor",
    "DPP",
    "public prosecutor",
    "TPR",
    "pendakwa raya",
    "state",
    "government",
  ],
  defense: [
    "defense",
    "defence",
    "defendant",
    "accused",
    "appellant",
    "respondent",
    "representing",
    "counsel for",
  ],
  judge: [
    "judge",
    "justice",
    "hakim",
    "presiding",
    "ruled",
    "sentenced",
    "acquitted",
    "convicted",
  ],
  other: ["counsel", "lawyer", "peguam", "legal team"],
};

/**
 * Check if article is likely about a legal case
 */
export function isLegalArticle(article: NewsArticle): boolean {
  const text = `${article.title} ${article.content}`.toLowerCase();
  const keywordCount = LEGAL_KEYWORDS.filter((kw) => text.includes(kw)).length;
  return keywordCount >= 3;
}

/**
 * Extract potential lawyer names from text using patterns
 */
export function extractPotentialNames(text: string): string[] {
  const names = new Set<string>();

  for (const pattern of LAWYER_NAME_PATTERNS) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const name = match[1]?.trim();
      if (name && name.length > 5 && name.split(" ").length >= 2) {
        names.add(name);
      }
    }
  }

  return Array.from(names);
}

/**
 * Determine likely role based on context
 */
export function determineRole(name: string, context: string): LawyerRole {
  const lowerContext = context.toLowerCase();

  // Check each role's indicators
  for (const [role, indicators] of Object.entries(ROLE_INDICATORS)) {
    const nameIndex = lowerContext.indexOf(name.toLowerCase());
    if (nameIndex === -1) continue;

    // Look at text surrounding the name (100 chars before and after)
    const start = Math.max(0, nameIndex - 100);
    const end = Math.min(lowerContext.length, nameIndex + name.length + 100);
    const surroundingText = lowerContext.slice(start, end);

    for (const indicator of indicators) {
      if (surroundingText.includes(indicator)) {
        return role as LawyerRole;
      }
    }
  }

  return "other";
}

/**
 * Create prompt for AI extraction
 */
export function createExtractionPrompt(article: NewsArticle): string {
  return `Analyze this Malaysian legal news article and extract lawyer-case associations.

ARTICLE TITLE: ${article.title}
SOURCE: ${article.source}
${article.publishedAt ? `DATE: ${article.publishedAt.toISOString().split("T")[0]}` : ""}

ARTICLE CONTENT:
${article.content.slice(0, 4000)}

TASK: Extract all lawyers, judges, and legal professionals mentioned in relation to legal cases.

For each person found, provide:
1. Full name (as written in the article)
2. Role: "prosecution" | "defense" | "judge" | "other"
3. Role description (e.g., "Lead defense counsel", "Deputy Public Prosecutor")
4. Case they're associated with (if mentioned)
5. Confidence level (0.0-1.0) based on how explicitly they're identified

Return as JSON array:
[
  {
    "name": "Full Name",
    "role": "defense",
    "roleDescription": "Lead defense counsel",
    "caseTitle": "Case Title if mentioned",
    "caseNumber": "Case number if mentioned",
    "confidence": 0.85
  }
]

Return empty array [] if no lawyers/judges are clearly identifiable.
Only include people explicitly identified as lawyers, advocates, or judges.
Do not guess or infer roles not explicitly stated.`;
}

/**
 * Parse AI response into structured data
 */
export function parseAIResponse(response: string): ExtractedAssociation[] {
  try {
    // Try to extract JSON from the response
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return [];
    }

    const parsed = JSON.parse(jsonMatch[0]);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter(
        (item: unknown): item is Record<string, unknown> =>
          typeof item === "object" && item !== null && "name" in item && "role" in item
      )
      .map((item) => ({
        lawyerName: String(item.name),
        role: (["prosecution", "defense", "judge", "other"].includes(String(item.role))
          ? item.role
          : "other") as LawyerRole,
        roleDescription: item.roleDescription ? String(item.roleDescription) : undefined,
        caseTitle: item.caseTitle ? String(item.caseTitle) : undefined,
        caseNumber: item.caseNumber ? String(item.caseNumber) : undefined,
        confidence: typeof item.confidence === "number" ? item.confidence : 0.7,
      }));
  } catch (error) {
    console.error("[News Extractor] Failed to parse AI response:", error);
    return [];
  }
}

/**
 * Extract lawyer associations from a news article using AI
 * Note: Actual implementation would call OpenAI or similar
 */
export async function extractFromArticle(
  article: NewsArticle,
  aiClient?: unknown // Would be OpenAI client
): Promise<ExtractionResult> {
  // Check if article is relevant
  if (!isLegalArticle(article)) {
    return {
      article,
      associations: [],
    };
  }

  // TODO: Call AI for extraction
  // const prompt = createExtractionPrompt(article);
  // const response = await aiClient.complete(prompt);
  // const associations = parseAIResponse(response);

  // Fallback to pattern-based extraction
  const names = extractPotentialNames(article.content);
  const associations: ExtractedAssociation[] = names.map((name) => ({
    lawyerName: name,
    role: determineRole(name, article.content),
    confidence: 0.6, // Lower confidence for pattern-based
  }));

  return {
    article,
    associations,
  };
}

/**
 * Batch extract from multiple articles
 */
export async function extractFromArticles(
  articles: NewsArticle[],
  options?: {
    aiClient?: unknown;
    minConfidence?: number;
  }
): Promise<ExtractionResult[]> {
  const results: ExtractionResult[] = [];
  const minConfidence = options?.minConfidence ?? 0.5;

  for (const article of articles) {
    const result = await extractFromArticle(article, options?.aiClient);

    // Filter by confidence
    result.associations = result.associations.filter(
      (a) => a.confidence >= minConfidence
    );

    if (result.associations.length > 0) {
      results.push(result);
    }
  }

  return results;
}

// Export source type for this extractor
export const SOURCE_TYPE: SourceType = "news";
export const SOURCE_NAME = "News Articles";
