import type { LawyerCardData } from "@/types/lawyer";

// Malaysian states grouped by region for proximity scoring
const REGION_MAPPING: Record<string, string[]> = {
  "Northern": ["Perlis", "Kedah", "Penang", "Perak"],
  "Central": ["Selangor", "Wilayah Persekutuan Kuala Lumpur", "Negeri Sembilan"],
  "Southern": ["Melaka", "Johor"],
  "East Coast": ["Pahang", "Terengganu", "Kelantan"],
  "East Malaysia": ["Sabah", "Sarawak", "Labuan"],
};

// State to region mapping
function getRegion(state: string | null): string | null {
  if (!state) return null;
  for (const [region, states] of Object.entries(REGION_MAPPING)) {
    if (states.includes(state)) return region;
  }
  return null;
}

// Adjacent regions
const ADJACENT_REGIONS: Record<string, string[]> = {
  "Northern": ["Central"],
  "Central": ["Northern", "Southern", "East Coast"],
  "Southern": ["Central"],
  "East Coast": ["Central"],
  "East Malaysia": [],
};

/**
 * Calculate location similarity score (0-1)
 */
export function calculateLocationScore(
  lawyer1State: string | null,
  lawyer1City: string | null,
  lawyer2State: string | null,
  lawyer2City: string | null
): number {
  // Same city
  if (lawyer1City && lawyer2City && lawyer1City === lawyer2City) {
    return 1.0;
  }

  // Same state, different city
  if (lawyer1State && lawyer2State && lawyer1State === lawyer2State) {
    return 0.6;
  }

  // Adjacent region
  const region1 = getRegion(lawyer1State);
  const region2 = getRegion(lawyer2State);

  if (region1 && region2) {
    if (region1 === region2) return 0.5;
    if (ADJACENT_REGIONS[region1]?.includes(region2)) return 0.3;
  }

  // Different region
  return 0.1;
}

/**
 * Calculate practice area overlap using Jaccard similarity (0-1)
 */
export function calculatePracticeOverlap(
  areas1: string[],
  areas2: string[]
): number {
  if (areas1.length === 0 || areas2.length === 0) return 0;

  const set1 = new Set(areas1);
  const set2 = new Set(areas2);

  const intersection = [...set1].filter((x) => set2.has(x)).length;
  const union = new Set([...set1, ...set2]).size;

  return union > 0 ? intersection / union : 0;
}

/**
 * Calculate experience similarity score (0-1)
 */
export function calculateExperienceSimilarity(
  years1: number | null,
  years2: number | null
): number {
  if (years1 === null || years2 === null) return 0.5; // Default middle score if unknown

  const diff = Math.abs(years1 - years2);

  if (diff <= 2) return 1.0;
  if (diff <= 5) return 0.7;
  if (diff <= 10) return 0.4;
  return 0.2;
}

/**
 * Calculate overall similarity score between two lawyers (0-1)
 * Uses balanced weighting: location (33%), practice (34%), experience (33%)
 */
export function calculateSimilarity(
  lawyer1: {
    state: string | null;
    city: string | null;
    practiceAreas: string[];
    yearsAtBar: number | null;
  },
  lawyer2: {
    state: string | null;
    city: string | null;
    practiceAreas: string[];
    yearsAtBar: number | null;
  }
): number {
  const locationScore = calculateLocationScore(
    lawyer1.state,
    lawyer1.city,
    lawyer2.state,
    lawyer2.city
  );

  const practiceScore = calculatePracticeOverlap(
    lawyer1.practiceAreas,
    lawyer2.practiceAreas
  );

  const experienceScore = calculateExperienceSimilarity(
    lawyer1.yearsAtBar,
    lawyer2.yearsAtBar
  );

  return locationScore * 0.33 + practiceScore * 0.34 + experienceScore * 0.33;
}

/**
 * Get similar lawyers from a list, sorted by similarity score
 */
export function getSimilarLawyersFromList(
  targetLawyer: LawyerCardData,
  allLawyers: LawyerCardData[],
  limit = 4
): LawyerCardData[] {
  return allLawyers
    .filter((l) => l.id !== targetLawyer.id) // Exclude self
    .filter((l) => l.barStatus === "active" || l.barStatus === null) // Active only
    .map((lawyer) => ({
      lawyer,
      score: calculateSimilarity(
        {
          state: targetLawyer.state,
          city: targetLawyer.city,
          practiceAreas: targetLawyer.practiceAreas,
          yearsAtBar: targetLawyer.yearsAtBar,
        },
        {
          state: lawyer.state,
          city: lawyer.city,
          practiceAreas: lawyer.practiceAreas,
          yearsAtBar: lawyer.yearsAtBar,
        }
      ),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ lawyer }) => lawyer);
}
