import type { lawyers, practiceAreas, reviews } from "@/lib/db/schema";

// Infer types from Drizzle schema
export type Lawyer = typeof lawyers.$inferSelect;
export type NewLawyer = typeof lawyers.$inferInsert;

export type PracticeArea = typeof practiceAreas.$inferSelect;
export type Review = typeof reviews.$inferSelect;

// Extended lawyer type with relations
export interface LawyerWithRelations extends Lawyer {
  practiceAreas: {
    practiceArea: PracticeArea;
    experienceLevel: "beginner" | "intermediate" | "expert" | null;
    yearsExperience: number | null;
  }[];
  reviews: Review[];
  education: {
    id: string;
    institution: string;
    degree: string;
    field: string | null;
    graduationYear: number | null;
  }[];
  qualifications: {
    id: string;
    title: string;
    issuingBody: string | null;
    issuedAt: Date | null;
  }[];
  cases: {
    caseId: string;
    role: "prosecution" | "defense" | "judge" | "other";
    roleDescription: string | null;
    case: {
      id: string;
      slug: string;
      title: string;
      category: string;
      status: string;
    };
  }[];
}

// Lawyer card data (for listings)
export interface LawyerCardData {
  id: string;
  slug: string;
  name: string;
  photo: string | null;
  bio: string | null;
  state: string | null;
  city: string | null;
  firmName: string | null;
  isVerified: boolean;
  isClaimed: boolean;
  subscriptionTier: "free" | "premium" | "featured";
  yearsAtBar: number | null;
  reviewCount: number;
  averageRating: string | null; // decimal stored as string
  responseRate: string | null;
  practiceAreas: string[];
  // Phase 1: Trust signals
  barStatus: "active" | "inactive" | "suspended" | "deceased" | null;
  barMembershipNumber: string | null;
  lastScrapedAt: Date | null;
}

// Search/filter params
export interface LawyerSearchParams {
  query?: string;
  practiceArea?: string;
  state?: string;
  city?: string;
  language?: string;
  experienceLevel?: "junior" | "mid" | "senior";
  sort?: "relevance" | "experience" | "rating" | "reviews";
  page?: number;
  limit?: number;
  showInactive?: boolean;
}

// Search result with pagination
export interface LawyerSearchResult {
  lawyers: LawyerCardData[];
  total: number;
  page: number;
  totalPages: number;
  hasMore: boolean;
}

// Experience level thresholds (years at bar)
export const EXPERIENCE_LEVELS = {
  junior: { min: 0, max: 5, label: "Junior (0-5 years)" },
  mid: { min: 6, max: 15, label: "Mid-Level (6-15 years)" },
  senior: { min: 16, max: Infinity, label: "Senior (16+ years)" },
} as const;

export type ExperienceLevel = keyof typeof EXPERIENCE_LEVELS;

// Sort options
export const SORT_OPTIONS = [
  { value: "relevance", label: "Relevance" },
  { value: "experience", label: "Experience" },
  { value: "rating", label: "Highest Rated" },
  { value: "reviews", label: "Most Reviews" },
] as const;

export type SortOption = (typeof SORT_OPTIONS)[number]["value"];
