import type { SourceType } from "@/types/case";

// Base confidence scores by source type
const SOURCE_BASE_CONFIDENCE: Record<SourceType, number> = {
  court_record: 1.0,
  bar_council: 0.95,
  law_firm: 0.85,
  news: 0.7,
  manual: 1.0,
};

// Weighting factors for confidence calculation
const CONFIDENCE_WEIGHTS = {
  sourceType: 0.4, // Base source reliability
  nameMatch: 0.25, // How well the name matches
  barNumberPresent: 0.2, // Whether bar number was found
  multiSourceAgreement: 0.15, // Multiple sources agree
};

export interface ConfidenceInput {
  sourceType: SourceType;
  nameMatchScore?: number; // 0.0-1.0, from fuzzy matching
  hasBarNumber: boolean;
  agreementCount?: number; // How many sources agree on this association
}

export interface ConfidenceResult {
  score: number; // 0.00-1.00
  breakdown: {
    sourceTypeContribution: number;
    nameMatchContribution: number;
    barNumberContribution: number;
    multiSourceContribution: number;
  };
}

/**
 * Calculate confidence score for a lawyer-case association.
 * Higher scores indicate more reliable data.
 */
export function calculateConfidence(input: ConfidenceInput): ConfidenceResult {
  const {
    sourceType,
    nameMatchScore = 1.0, // Assume perfect match if not provided
    hasBarNumber,
    agreementCount = 1,
  } = input;

  // Source type contribution (0.0-1.0)
  const sourceTypeScore = SOURCE_BASE_CONFIDENCE[sourceType];
  const sourceTypeContribution = sourceTypeScore * CONFIDENCE_WEIGHTS.sourceType;

  // Name match contribution (0.0-1.0)
  const nameMatchContribution = nameMatchScore * CONFIDENCE_WEIGHTS.nameMatch;

  // Bar number contribution (binary: 0 or 1)
  const barNumberScore = hasBarNumber ? 1.0 : 0.5; // Partial credit if no bar number
  const barNumberContribution = barNumberScore * CONFIDENCE_WEIGHTS.barNumberPresent;

  // Multi-source agreement contribution
  // Logarithmic scale: 1 source = 0.5, 2 sources = 0.75, 3+ sources = 1.0
  const agreementScore = Math.min(1.0, 0.5 + Math.log2(agreementCount) * 0.25);
  const multiSourceContribution =
    agreementScore * CONFIDENCE_WEIGHTS.multiSourceAgreement;

  // Total score (capped at 1.0)
  const totalScore = Math.min(
    1.0,
    sourceTypeContribution +
      nameMatchContribution +
      barNumberContribution +
      multiSourceContribution
  );

  return {
    score: Math.round(totalScore * 100) / 100, // Round to 2 decimal places
    breakdown: {
      sourceTypeContribution: Math.round(sourceTypeContribution * 100) / 100,
      nameMatchContribution: Math.round(nameMatchContribution * 100) / 100,
      barNumberContribution: Math.round(barNumberContribution * 100) / 100,
      multiSourceContribution: Math.round(multiSourceContribution * 100) / 100,
    },
  };
}

/**
 * Determine if a confidence score meets the threshold for auto-verification.
 * Court records and manual entries with bar numbers are auto-verified.
 */
export function shouldAutoVerify(
  sourceType: SourceType,
  confidenceScore: number,
  hasBarNumber: boolean
): boolean {
  // Court records are always trusted
  if (sourceType === "court_record") {
    return true;
  }

  // Manual entries with bar numbers are trusted
  if (sourceType === "manual" && hasBarNumber) {
    return true;
  }

  // Bar council with bar number is highly trusted
  if (sourceType === "bar_council" && hasBarNumber && confidenceScore >= 0.9) {
    return true;
  }

  // Other sources need very high confidence and bar number
  return hasBarNumber && confidenceScore >= 0.95;
}

/**
 * Compare two confidence scores and determine which should take precedence.
 * Returns positive if scoreA wins, negative if scoreB wins, 0 if equal.
 */
export function compareConfidence(
  sourceA: { sourceType: SourceType; score: number },
  sourceB: { sourceType: SourceType; score: number }
): number {
  // Court records always win
  if (
    sourceA.sourceType === "court_record" &&
    sourceB.sourceType !== "court_record"
  ) {
    return 1;
  }
  if (
    sourceB.sourceType === "court_record" &&
    sourceA.sourceType !== "court_record"
  ) {
    return -1;
  }

  // Manual entries win over scraped data (human verification)
  if (sourceA.sourceType === "manual" && sourceB.sourceType !== "manual") {
    return 1;
  }
  if (sourceB.sourceType === "manual" && sourceA.sourceType !== "manual") {
    return -1;
  }

  // Otherwise compare by score
  return sourceA.score - sourceB.score;
}
