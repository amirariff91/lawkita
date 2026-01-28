import type { cases, caseTimeline, caseLawyers, caseMediaReferences } from "@/lib/db/schema";

// Infer types from Drizzle schema
export type Case = typeof cases.$inferSelect;
export type NewCase = typeof cases.$inferInsert;

export type CaseTimeline = typeof caseTimeline.$inferSelect;
export type CaseLawyer = typeof caseLawyers.$inferSelect;
export type CaseMediaReference = typeof caseMediaReferences.$inferSelect;

// Case categories
export const CASE_CATEGORIES = [
  { value: "corruption", label: "Corruption" },
  { value: "political", label: "Political" },
  { value: "corporate", label: "Corporate" },
  { value: "criminal", label: "Criminal" },
  { value: "constitutional", label: "Constitutional" },
  { value: "other", label: "Other" },
] as const;

export type CaseCategory = (typeof CASE_CATEGORIES)[number]["value"];

// Case status
export const CASE_STATUSES = [
  { value: "ongoing", label: "Ongoing" },
  { value: "concluded", label: "Concluded" },
  { value: "appeal", label: "Under Appeal" },
] as const;

export type CaseStatus = (typeof CASE_STATUSES)[number]["value"];

// Case outcome
export const CASE_OUTCOMES = [
  { value: "guilty", label: "Guilty" },
  { value: "not_guilty", label: "Not Guilty" },
  { value: "settled", label: "Settled" },
  { value: "dismissed", label: "Dismissed" },
  { value: "ongoing", label: "Ongoing" },
  { value: "other", label: "Other" },
] as const;

export type CaseOutcome = (typeof CASE_OUTCOMES)[number]["value"];

// Lawyer roles in cases
export const LAWYER_ROLES = [
  { value: "prosecution", label: "Prosecution" },
  { value: "defense", label: "Defense" },
  { value: "judge", label: "Judge" },
  { value: "other", label: "Other" },
] as const;

export type LawyerRole = (typeof LAWYER_ROLES)[number]["value"];

// Card data for listings
export interface CaseCardData {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  category: CaseCategory;
  status: CaseStatus;
  isFeatured: boolean;
  outcome: CaseOutcome | null;
  verdictDate: Date | null;
  tags: string[];
  ogImage: string | null;
}

// Timeline event with optional image
export interface TimelineEvent {
  id: string;
  date: Date;
  title: string;
  description: string | null;
  court: string | null;
  image: string | null;
  sortOrder: number;
}

// Lawyer with case role info
export interface CaseLawyerWithDetails {
  lawyerId: string;
  role: LawyerRole;
  roleDescription: string | null;
  isVerified: boolean;
  lawyer: {
    slug: string;
    name: string;
    photo: string | null;
    firmName: string | null;
    isVerified: boolean;
  };
}

// Full case details with relations
export interface CaseWithRelations extends Case {
  timeline: TimelineEvent[];
  lawyers: CaseLawyerWithDetails[];
  mediaReferences: CaseMediaReference[];
}

// Search/filter params
export interface CaseSearchParams {
  query?: string;
  category?: CaseCategory;
  status?: CaseStatus;
  tag?: string;
  featured?: boolean;
  page?: number;
  limit?: number;
}

// Search result with pagination
export interface CaseSearchResult {
  cases: CaseCardData[];
  total: number;
  page: number;
  totalPages: number;
  hasMore: boolean;
}
