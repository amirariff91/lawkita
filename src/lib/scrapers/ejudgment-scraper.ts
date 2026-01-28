// e-Judgment Portal Scraper (kehakiman.gov.my)
// Extracts case information and lawyer names from Malaysian court judgments

import type { LawyerRole, SourceType } from "@/types/case";

export interface JudgmentData {
  caseNumber: string;
  citation?: string;
  court: string;
  title: string;
  judgmentDate: string;
  lawyers: ExtractedLawyer[];
  sourceUrl: string;
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
 * Main scraper function to fetch and parse e-Judgment data
 * Note: Actual implementation would need to handle:
 * - Authentication if required
 * - Rate limiting
 * - HTML parsing
 * - robots.txt compliance
 */
export async function scrapeEJudgment(url: string): Promise<JudgmentData | null> {
  try {
    // TODO: Implement actual HTTP fetch and HTML parsing
    // This is a placeholder showing the expected structure

    // In production, this would:
    // 1. Fetch the page HTML
    // 2. Parse using cheerio or similar
    // 3. Extract relevant sections
    // 4. Call extraction functions

    console.log(`[e-Judgment] Scraping URL: ${url}`);

    // Placeholder return
    return null;
  } catch (error) {
    console.error(`[e-Judgment] Scraping failed: ${error}`);
    return null;
  }
}

/**
 * Scrape multiple judgments from a list or search results
 */
export async function scrapeJudgmentsList(
  searchParams: {
    keyword?: string;
    court?: string;
    year?: number;
    limit?: number;
  }
): Promise<JudgmentData[]> {
  // TODO: Implement search functionality
  // Would search the e-Judgment portal and return matching cases

  console.log(`[e-Judgment] Searching with params:`, searchParams);

  return [];
}

// Export source type for this scraper
export const SOURCE_TYPE: SourceType = "court_record";
export const SOURCE_NAME = "e-Judgment Portal";
export const SOURCE_BASE_URL = "https://efiling.kehakiman.gov.my";
