import type { LawyerWithRelations } from "@/types/lawyer";

interface CompletenessField {
  key: string;
  label: string;
  points: number;
  check: (lawyer: LawyerWithRelations) => boolean;
}

const COMPLETENESS_FIELDS: CompletenessField[] = [
  {
    key: "photo",
    label: "Profile photo",
    points: 15,
    check: (lawyer) => !!lawyer.photo,
  },
  {
    key: "bio",
    label: "Bio",
    points: 15,
    check: (lawyer) => !!lawyer.bio && lawyer.bio.length >= 50,
  },
  {
    key: "phone",
    label: "Phone number",
    points: 10,
    check: (lawyer) => !!lawyer.phone,
  },
  {
    key: "email",
    label: "Email address",
    points: 10,
    check: (lawyer) => !!lawyer.email,
  },
  {
    key: "practiceAreas",
    label: "Practice areas",
    points: 15,
    check: (lawyer) => lawyer.practiceAreas.length > 0,
  },
  {
    key: "education",
    label: "Education",
    points: 15,
    check: (lawyer) => lawyer.education.length > 0,
  },
  {
    key: "qualifications",
    label: "Professional qualifications",
    points: 10,
    check: (lawyer) => lawyer.qualifications.length > 0,
  },
  {
    key: "firmName",
    label: "Firm name",
    points: 5,
    check: (lawyer) => !!lawyer.firmName,
  },
  {
    key: "address",
    label: "Address",
    points: 5,
    check: (lawyer) => !!lawyer.address,
  },
];

export interface ProfileCompletenessResult {
  score: number; // 0-100
  completedFields: string[];
  missingFields: string[];
  breakdown: {
    key: string;
    label: string;
    points: number;
    completed: boolean;
  }[];
}

/**
 * Calculates the profile completeness score and breakdown
 */
export function calculateProfileCompleteness(
  lawyer: LawyerWithRelations
): ProfileCompletenessResult {
  let totalEarned = 0;
  const completedFields: string[] = [];
  const missingFields: string[] = [];

  const breakdown = COMPLETENESS_FIELDS.map((field) => {
    const completed = field.check(lawyer);
    if (completed) {
      totalEarned += field.points;
      completedFields.push(field.label);
    } else {
      missingFields.push(field.label);
    }
    return {
      key: field.key,
      label: field.label,
      points: field.points,
      completed,
    };
  });

  return {
    score: totalEarned,
    completedFields,
    missingFields,
    breakdown,
  };
}

/**
 * Gets a descriptive label for the completeness level
 */
export function getCompletenessLabel(score: number): {
  label: string;
  variant: "default" | "secondary" | "outline" | "destructive";
} {
  if (score >= 90) {
    return { label: "Complete", variant: "default" };
  }
  if (score >= 70) {
    return { label: "Almost complete", variant: "secondary" };
  }
  if (score >= 50) {
    return { label: "Partially complete", variant: "outline" };
  }
  return { label: "Needs attention", variant: "destructive" };
}
