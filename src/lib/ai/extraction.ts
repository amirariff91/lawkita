/**
 * AI-powered entity extraction for lawyer-case associations
 * Uses OpenAI to extract structured data from news articles
 */

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

interface LawyerCaseAssociation {
  lawyerName: string;
  role: "prosecution" | "defense" | "judge" | "other";
  roleDescription?: string;
  confidence: number;
}

interface ExtractedCaseData {
  caseName: string;
  alternativeNames: string[];
  category: "corruption" | "political" | "corporate" | "criminal" | "constitutional" | "other";
  status: "ongoing" | "concluded" | "appeal";
  court: string;
  judges: string[];
  lawyers: LawyerCaseAssociation[];
  keyDates: Array<{ date: string; event: string }>;
  summary: string;
  charges?: string[];
  verdict?: string;
  confidence: number;
}

interface ArticleExtractionResult {
  success: boolean;
  caseData: ExtractedCaseData | null;
  rawResponse?: string;
  error?: string;
}

/**
 * Extract case and lawyer information from a news article
 */
export async function extractCaseDataFromArticle(
  articleContent: string,
  articleTitle: string,
  sourceUrl: string,
  publishedAt?: string
): Promise<ArticleExtractionResult> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return {
      success: false,
      caseData: null,
      error: "OpenAI API key not configured",
    };
  }

  try {
    const response = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a legal data extraction assistant for LawKita, a Malaysian lawyer directory.
Your task is to extract structured case and lawyer information from Malaysian news articles.

Respond ONLY with valid JSON in this format:
{
  "hasLegalCase": boolean,
  "caseData": {
    "caseName": string (e.g., "1MDB Trial", "Najib Razak Corruption Case"),
    "alternativeNames": string[] (other names the case is known by),
    "category": "corruption" | "political" | "corporate" | "criminal" | "constitutional" | "other",
    "status": "ongoing" | "concluded" | "appeal",
    "court": string (e.g., "High Court Kuala Lumpur"),
    "judges": string[] (names of judges),
    "lawyers": [
      {
        "lawyerName": string,
        "role": "prosecution" | "defense" | "judge" | "other",
        "roleDescription": string (e.g., "Lead defense counsel")
      }
    ],
    "keyDates": [
      { "date": "YYYY-MM-DD", "event": string }
    ],
    "summary": string (1-2 sentence summary),
    "charges": string[] (if mentioned),
    "verdict": string (if concluded),
    "confidence": number (0-100, your confidence in the extraction)
  }
}

If the article doesn't contain a legal case, return { "hasLegalCase": false, "caseData": null }.

Focus on:
- Malaysian Bar lawyers and their roles
- High-profile cases (corruption, political, corporate fraud)
- Court proceedings and verdicts
- Extract full names when possible`,
          },
          {
            role: "user",
            content: `Extract legal case information from this article:

Title: ${articleTitle}
Source: ${sourceUrl}
${publishedAt ? `Published: ${publishedAt}` : ""}

Content:
${articleContent.slice(0, 8000)}`, // Limit content length
          },
        ],
        max_tokens: 2000,
        temperature: 0,
      }),
    });

    if (!response.ok) {
      console.error("OpenAI extraction error:", await response.text());
      return {
        success: false,
        caseData: null,
        error: "API request failed",
      };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return {
        success: false,
        caseData: null,
        error: "No response from API",
      };
    }

    try {
      // Parse JSON response
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
      const result = JSON.parse(jsonStr);

      if (!result.hasLegalCase || !result.caseData) {
        return {
          success: true,
          caseData: null,
          rawResponse: content,
        };
      }

      return {
        success: true,
        caseData: result.caseData as ExtractedCaseData,
        rawResponse: content,
      };
    } catch (parseError) {
      console.error("Failed to parse extraction response:", parseError);
      return {
        success: false,
        caseData: null,
        error: "Failed to parse response",
        rawResponse: content,
      };
    }
  } catch (error) {
    console.error("Extraction error:", error);
    return {
      success: false,
      caseData: null,
      error: "Extraction failed",
    };
  }
}

/**
 * Match extracted lawyer names to database records
 */
interface LawyerMatch {
  extractedName: string;
  matchedId: string | null;
  matchedName: string | null;
  matchConfidence: number;
}

export async function matchLawyersToDatabase(
  extractedLawyers: LawyerCaseAssociation[],
  searchFunction: (name: string) => Promise<Array<{ id: string; name: string }>>
): Promise<LawyerMatch[]> {
  const matches: LawyerMatch[] = [];

  for (const lawyer of extractedLawyers) {
    const searchResults = await searchFunction(lawyer.lawyerName);

    if (searchResults.length === 0) {
      matches.push({
        extractedName: lawyer.lawyerName,
        matchedId: null,
        matchedName: null,
        matchConfidence: 0,
      });
      continue;
    }

    // Find best match using simple string similarity
    let bestMatch = searchResults[0];
    let bestScore = 0;

    for (const result of searchResults) {
      const score = calculateNameSimilarity(lawyer.lawyerName, result.name);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = result;
      }
    }

    matches.push({
      extractedName: lawyer.lawyerName,
      matchedId: bestScore >= 0.7 ? bestMatch.id : null,
      matchedName: bestScore >= 0.7 ? bestMatch.name : null,
      matchConfidence: bestScore,
    });
  }

  return matches;
}

/**
 * Calculate similarity between two names
 */
function calculateNameSimilarity(name1: string, name2: string): number {
  const n1 = name1.toLowerCase().split(/\s+/);
  const n2 = name2.toLowerCase().split(/\s+/);

  // Count matching words
  let matches = 0;
  for (const word1 of n1) {
    for (const word2 of n2) {
      if (word1 === word2 || word1.includes(word2) || word2.includes(word1)) {
        matches++;
        break;
      }
    }
  }

  // Calculate similarity based on matching words
  const maxWords = Math.max(n1.length, n2.length);
  return matches / maxWords;
}

/**
 * Merge multiple extractions for the same case
 */
export function mergeCaseExtractions(
  extractions: ExtractedCaseData[]
): ExtractedCaseData {
  if (extractions.length === 0) {
    throw new Error("No extractions to merge");
  }

  if (extractions.length === 1) {
    return extractions[0];
  }

  // Use the extraction with highest confidence as base
  const sorted = [...extractions].sort((a, b) => b.confidence - a.confidence);
  const base = { ...sorted[0] };

  // Merge in data from other extractions
  const allLawyers = new Map<string, LawyerCaseAssociation>();
  const allDates = new Map<string, { date: string; event: string }>();
  const allJudges = new Set<string>();
  const allCharges = new Set<string>();
  const allNames = new Set<string>([base.caseName]);

  for (const extraction of extractions) {
    // Merge lawyers
    for (const lawyer of extraction.lawyers) {
      const key = lawyer.lawyerName.toLowerCase();
      if (!allLawyers.has(key)) {
        allLawyers.set(key, lawyer);
      }
    }

    // Merge dates
    for (const date of extraction.keyDates) {
      const key = `${date.date}-${date.event.slice(0, 20)}`;
      if (!allDates.has(key)) {
        allDates.set(key, date);
      }
    }

    // Merge judges
    for (const judge of extraction.judges) {
      allJudges.add(judge);
    }

    // Merge charges
    if (extraction.charges) {
      for (const charge of extraction.charges) {
        allCharges.add(charge);
      }
    }

    // Merge alternative names
    if (extraction.alternativeNames) {
      for (const name of extraction.alternativeNames) {
        allNames.add(name);
      }
    }
    allNames.add(extraction.caseName);
  }

  // Build merged result
  allNames.delete(base.caseName);
  base.alternativeNames = [...allNames];
  base.lawyers = [...allLawyers.values()];
  base.keyDates = [...allDates.values()].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  base.judges = [...allJudges];
  base.charges = [...allCharges];

  // Boost confidence if multiple sources agree
  base.confidence = Math.min(100, base.confidence + extractions.length * 5);

  return base;
}
