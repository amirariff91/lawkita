import { db } from "@/lib/db";
import { lawyers, caseLawyers } from "@/lib/db/schema";
import { eq, ilike, sql } from "drizzle-orm";
import type { LawyerRole, SourceType } from "@/types/case";
import {
  calculateConfidence,
  shouldAutoVerify,
  compareConfidence,
} from "./confidence-scoring";

// Minimum similarity score for fuzzy name matching (0.0-1.0)
const MIN_NAME_SIMILARITY = 0.85;

export interface ScrapedLawyerData {
  name: string;
  barMembershipNumber?: string;
  firmName?: string;
  photo?: string;
  state?: string;
  city?: string;
}

export interface CaseLawyerAssociation {
  caseId: string;
  role: LawyerRole;
  roleDescription?: string;
  sourceType: SourceType;
  sourceUrl?: string;
}

export interface LawyerMatchResult {
  lawyerId: string;
  slug: string;
  name: string;
  matchType: "bar_number" | "name_exact" | "name_fuzzy" | "created";
  matchScore: number;
}

/**
 * Generate a URL-friendly slug from a name.
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s-]/g, "") // Remove special characters
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Replace multiple hyphens with single
    .trim();
}

/**
 * Generate a unique slug by appending a number if necessary.
 */
async function generateUniqueSlug(baseName: string): Promise<string> {
  const baseSlug = generateSlug(baseName);
  let slug = baseSlug;
  let suffix = 1;

  while (true) {
    const existing = await db
      .select({ id: lawyers.id })
      .from(lawyers)
      .where(eq(lawyers.slug, slug))
      .limit(1);

    if (existing.length === 0) {
      return slug;
    }

    suffix++;
    slug = `${baseSlug}-${suffix}`;
  }
}

/**
 * Find a lawyer by bar membership number (exact match).
 */
async function findByBarNumber(
  barNumber: string
): Promise<LawyerMatchResult | null> {
  const result = await db
    .select({
      id: lawyers.id,
      slug: lawyers.slug,
      name: lawyers.name,
    })
    .from(lawyers)
    .where(eq(lawyers.barMembershipNumber, barNumber))
    .limit(1);

  if (result.length === 0) {
    return null;
  }

  return {
    lawyerId: result[0].id,
    slug: result[0].slug,
    name: result[0].name,
    matchType: "bar_number",
    matchScore: 1.0,
  };
}

/**
 * Find a lawyer by exact name match (case-insensitive).
 */
async function findByExactName(name: string): Promise<LawyerMatchResult | null> {
  const result = await db
    .select({
      id: lawyers.id,
      slug: lawyers.slug,
      name: lawyers.name,
    })
    .from(lawyers)
    .where(ilike(lawyers.name, name))
    .limit(1);

  if (result.length === 0) {
    return null;
  }

  return {
    lawyerId: result[0].id,
    slug: result[0].slug,
    name: result[0].name,
    matchType: "name_exact",
    matchScore: 1.0,
  };
}

/**
 * Find a lawyer by fuzzy name match using PostgreSQL similarity.
 * Requires the pg_trgm extension to be enabled.
 */
async function findByFuzzyName(
  name: string,
  minSimilarity = MIN_NAME_SIMILARITY
): Promise<LawyerMatchResult | null> {
  // Use PostgreSQL's similarity function (requires pg_trgm extension)
  const result = await db
    .select({
      id: lawyers.id,
      slug: lawyers.slug,
      name: lawyers.name,
      similarity: sql<number>`similarity(${lawyers.name}, ${name})`,
    })
    .from(lawyers)
    .where(sql`similarity(${lawyers.name}, ${name}) >= ${minSimilarity}`)
    .orderBy(sql`similarity(${lawyers.name}, ${name}) DESC`)
    .limit(1);

  if (result.length === 0) {
    return null;
  }

  return {
    lawyerId: result[0].id,
    slug: result[0].slug,
    name: result[0].name,
    matchType: "name_fuzzy",
    matchScore: result[0].similarity,
  };
}

/**
 * Create a new lawyer profile from scraped data.
 * Only creates if bar membership number is provided (requirement).
 */
async function createLawyer(
  data: ScrapedLawyerData
): Promise<LawyerMatchResult | null> {
  // Require bar number for auto-creation
  if (!data.barMembershipNumber) {
    return null;
  }

  const slug = await generateUniqueSlug(data.name);

  const result = await db
    .insert(lawyers)
    .values({
      slug,
      name: data.name,
      barMembershipNumber: data.barMembershipNumber,
      firmName: data.firmName,
      photo: data.photo,
      state: data.state,
      city: data.city,
      isVerified: false,
      isClaimed: false,
      isActive: true,
    })
    .returning({
      id: lawyers.id,
      slug: lawyers.slug,
      name: lawyers.name,
    });

  if (result.length === 0) {
    return null;
  }

  return {
    lawyerId: result[0].id,
    slug: result[0].slug,
    name: result[0].name,
    matchType: "created",
    matchScore: 1.0,
  };
}

/**
 * Find or create a lawyer from scraped data.
 * Matching priority: bar number > exact name > fuzzy name > create new
 */
export async function findOrCreateLawyer(
  data: ScrapedLawyerData
): Promise<LawyerMatchResult | null> {
  // 1. Try bar number match first (most reliable)
  if (data.barMembershipNumber) {
    const barMatch = await findByBarNumber(data.barMembershipNumber);
    if (barMatch) {
      return barMatch;
    }
  }

  // 2. Try exact name match
  const exactMatch = await findByExactName(data.name);
  if (exactMatch) {
    return exactMatch;
  }

  // 3. Try fuzzy name match
  const fuzzyMatch = await findByFuzzyName(data.name);
  if (fuzzyMatch) {
    return fuzzyMatch;
  }

  // 4. Create new lawyer (requires bar number)
  return createLawyer(data);
}

/**
 * Associate a lawyer with a case, handling duplicates and confidence scoring.
 */
export async function associateLawyerWithCase(
  lawyerMatch: LawyerMatchResult,
  association: CaseLawyerAssociation
): Promise<{ success: boolean; action: "created" | "updated" | "skipped" }> {
  const { caseId, role, roleDescription, sourceType, sourceUrl } = association;

  // Calculate confidence score
  const confidenceResult = calculateConfidence({
    sourceType,
    nameMatchScore: lawyerMatch.matchScore,
    hasBarNumber: lawyerMatch.matchType === "bar_number",
    agreementCount: 1, // Will be updated if we find existing association
  });

  // Check for existing association
  const existing = await db
    .select({
      role: caseLawyers.role,
      sourceType: caseLawyers.sourceType,
      confidenceScore: caseLawyers.confidenceScore,
    })
    .from(caseLawyers)
    .where(
      sql`${caseLawyers.caseId} = ${caseId} AND ${caseLawyers.lawyerId} = ${lawyerMatch.lawyerId}`
    )
    .limit(1);

  if (existing.length > 0) {
    const existingRecord = existing[0];
    const existingConfidence = Number(existingRecord.confidenceScore) || 0;

    // Compare confidence to decide whether to update
    const comparison = compareConfidence(
      { sourceType, score: confidenceResult.score },
      {
        sourceType: existingRecord.sourceType as SourceType,
        score: existingConfidence,
      }
    );

    // Only update if new source is more reliable
    if (comparison > 0) {
      await db
        .update(caseLawyers)
        .set({
          role,
          roleDescription: roleDescription || undefined,
          confidenceScore: String(confidenceResult.score),
          sourceType,
          sourceUrl,
          scrapedAt: new Date(),
          isVerified: shouldAutoVerify(
            sourceType,
            confidenceResult.score,
            lawyerMatch.matchType === "bar_number"
          ),
        })
        .where(
          sql`${caseLawyers.caseId} = ${caseId} AND ${caseLawyers.lawyerId} = ${lawyerMatch.lawyerId}`
        );

      return { success: true, action: "updated" };
    }

    // Skip if existing data is more reliable
    return { success: true, action: "skipped" };
  }

  // Create new association
  await db.insert(caseLawyers).values({
    caseId,
    lawyerId: lawyerMatch.lawyerId,
    role,
    roleDescription,
    confidenceScore: String(confidenceResult.score),
    sourceType,
    sourceUrl,
    scrapedAt: new Date(),
    isVerified: shouldAutoVerify(
      sourceType,
      confidenceResult.score,
      lawyerMatch.matchType === "bar_number"
    ),
  });

  return { success: true, action: "created" };
}

/**
 * Process a batch of scraped lawyer-case associations.
 */
export async function processScrapedAssociations(
  scrapedData: Array<{
    lawyer: ScrapedLawyerData;
    association: CaseLawyerAssociation;
  }>
): Promise<{
  processed: number;
  created: number;
  updated: number;
  skipped: number;
  errors: Array<{ lawyer: string; error: string }>;
}> {
  const results = {
    processed: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [] as Array<{ lawyer: string; error: string }>,
  };

  for (const item of scrapedData) {
    try {
      // Find or create the lawyer
      const lawyerMatch = await findOrCreateLawyer(item.lawyer);

      if (!lawyerMatch) {
        results.skipped++;
        results.errors.push({
          lawyer: item.lawyer.name,
          error: "Could not find or create lawyer (no bar number)",
        });
        continue;
      }

      // Associate with case
      const associationResult = await associateLawyerWithCase(
        lawyerMatch,
        item.association
      );

      results.processed++;
      if (associationResult.action === "created") {
        results.created++;
      } else if (associationResult.action === "updated") {
        results.updated++;
      } else {
        results.skipped++;
      }
    } catch (error) {
      results.errors.push({
        lawyer: item.lawyer.name,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return results;
}
