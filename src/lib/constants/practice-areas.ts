// Practice Areas for Malaysian Legal System
// Level 1: Main categories (user-facing)
// Level 2: Subcategories (user-facing)
// Level 3: Detailed specializations (SEO/filtering only)

export interface PracticeAreaDefinition {
  name: string;
  slug: string;
  icon: string;
  description: string;
  level: 1 | 2 | 3;
  isUserFacing: boolean;
  children?: PracticeAreaDefinition[];
}

export const PRACTICE_AREAS: PracticeAreaDefinition[] = [
  {
    name: "Criminal Law",
    slug: "criminal-law",
    icon: "gavel",
    description:
      "Defense and prosecution in criminal matters including theft, assault, fraud, and white-collar crimes",
    level: 1,
    isUserFacing: true,
    children: [
      {
        name: "White Collar Crime",
        slug: "white-collar-crime",
        icon: "briefcase",
        description: "Financial crimes, fraud, and corporate misconduct",
        level: 2,
        isUserFacing: true,
        children: [
          {
            name: "Securities Fraud",
            slug: "securities-fraud",
            icon: "trending-up",
            description: "Stock market manipulation and insider trading",
            level: 3,
            isUserFacing: false,
          },
          {
            name: "Tax Evasion",
            slug: "tax-evasion",
            icon: "receipt",
            description: "Tax fraud and evasion cases",
            level: 3,
            isUserFacing: false,
          },
        ],
      },
      {
        name: "Drug Offenses",
        slug: "drug-offenses",
        icon: "pill",
        description: "Drug possession, trafficking, and related charges",
        level: 2,
        isUserFacing: true,
      },
      {
        name: "Violent Crimes",
        slug: "violent-crimes",
        icon: "shield-alert",
        description: "Murder, assault, robbery, and other violent offenses",
        level: 2,
        isUserFacing: true,
      },
    ],
  },
  {
    name: "Family Law",
    slug: "family-law",
    icon: "users",
    description:
      "Divorce, child custody, adoption, and matrimonial property matters",
    level: 1,
    isUserFacing: true,
    children: [
      {
        name: "Divorce & Separation",
        slug: "divorce-separation",
        icon: "heart-crack",
        description: "Divorce proceedings and legal separation",
        level: 2,
        isUserFacing: true,
      },
      {
        name: "Child Custody",
        slug: "child-custody",
        icon: "baby",
        description: "Custody arrangements and child welfare",
        level: 2,
        isUserFacing: true,
      },
      {
        name: "Adoption",
        slug: "adoption",
        icon: "hand-heart",
        description: "Legal adoption processes",
        level: 2,
        isUserFacing: true,
      },
      {
        name: "Syariah Family Law",
        slug: "syariah-family-law",
        icon: "moon",
        description: "Islamic family law matters for Muslims",
        level: 2,
        isUserFacing: true,
      },
    ],
  },
  {
    name: "Corporate & Commercial",
    slug: "corporate-commercial",
    icon: "building-2",
    description:
      "Business formation, contracts, mergers & acquisitions, and corporate governance",
    level: 1,
    isUserFacing: true,
    children: [
      {
        name: "Mergers & Acquisitions",
        slug: "mergers-acquisitions",
        icon: "git-merge",
        description: "Business combinations and takeovers",
        level: 2,
        isUserFacing: true,
      },
      {
        name: "Contract Law",
        slug: "contract-law",
        icon: "file-signature",
        description: "Contract drafting, review, and disputes",
        level: 2,
        isUserFacing: true,
      },
      {
        name: "Corporate Governance",
        slug: "corporate-governance",
        icon: "shield-check",
        description: "Board compliance and corporate structure",
        level: 2,
        isUserFacing: true,
      },
    ],
  },
  {
    name: "Property & Real Estate",
    slug: "property-real-estate",
    icon: "home",
    description:
      "Property transactions, land disputes, tenancy, and strata management",
    level: 1,
    isUserFacing: true,
    children: [
      {
        name: "Conveyancing",
        slug: "conveyancing",
        icon: "file-key",
        description: "Property sales, purchases, and transfers",
        level: 2,
        isUserFacing: true,
      },
      {
        name: "Land Disputes",
        slug: "land-disputes",
        icon: "map-pin",
        description: "Boundary disputes and land ownership issues",
        level: 2,
        isUserFacing: true,
      },
      {
        name: "Tenancy Law",
        slug: "tenancy-law",
        icon: "key",
        description: "Landlord-tenant relationships and disputes",
        level: 2,
        isUserFacing: true,
      },
    ],
  },
  {
    name: "Intellectual Property",
    slug: "intellectual-property",
    icon: "lightbulb",
    description:
      "Patents, trademarks, copyrights, and trade secrets protection",
    level: 1,
    isUserFacing: true,
    children: [
      {
        name: "Trademarks",
        slug: "trademarks",
        icon: "badge-check",
        description: "Brand protection and trademark registration",
        level: 2,
        isUserFacing: true,
      },
      {
        name: "Patents",
        slug: "patents",
        icon: "flask-conical",
        description: "Invention protection and patent filing",
        level: 2,
        isUserFacing: true,
      },
      {
        name: "Copyright",
        slug: "copyright",
        icon: "copyright",
        description: "Creative works and content protection",
        level: 2,
        isUserFacing: true,
      },
    ],
  },
  {
    name: "Employment Law",
    slug: "employment-law",
    icon: "briefcase-business",
    description:
      "Workplace disputes, wrongful termination, employment contracts",
    level: 1,
    isUserFacing: true,
    children: [
      {
        name: "Wrongful Termination",
        slug: "wrongful-termination",
        icon: "user-x",
        description: "Unfair dismissal and termination disputes",
        level: 2,
        isUserFacing: true,
      },
      {
        name: "Workplace Disputes",
        slug: "workplace-disputes",
        icon: "message-square-warning",
        description: "Harassment, discrimination, and workplace conflicts",
        level: 2,
        isUserFacing: true,
      },
      {
        name: "Employment Contracts",
        slug: "employment-contracts",
        icon: "file-text",
        description: "Contract drafting and negotiation",
        level: 2,
        isUserFacing: true,
      },
    ],
  },
  {
    name: "Banking & Finance",
    slug: "banking-finance",
    icon: "landmark",
    description:
      "Banking regulations, loan agreements, Islamic finance, and financial disputes",
    level: 1,
    isUserFacing: true,
    children: [
      {
        name: "Islamic Finance",
        slug: "islamic-finance",
        icon: "moon",
        description: "Shariah-compliant banking and finance",
        level: 2,
        isUserFacing: true,
      },
      {
        name: "Loan Recovery",
        slug: "loan-recovery",
        icon: "wallet",
        description: "Debt collection and loan disputes",
        level: 2,
        isUserFacing: true,
      },
    ],
  },
  {
    name: "Litigation & Dispute Resolution",
    slug: "litigation-dispute-resolution",
    icon: "scale",
    description:
      "Civil litigation, arbitration, mediation, and court representation",
    level: 1,
    isUserFacing: true,
    children: [
      {
        name: "Civil Litigation",
        slug: "civil-litigation",
        icon: "gavel",
        description: "Court proceedings for civil matters",
        level: 2,
        isUserFacing: true,
      },
      {
        name: "Arbitration",
        slug: "arbitration",
        icon: "handshake",
        description: "Alternative dispute resolution outside courts",
        level: 2,
        isUserFacing: true,
      },
      {
        name: "Mediation",
        slug: "mediation",
        icon: "users-round",
        description: "Facilitated negotiation and settlement",
        level: 2,
        isUserFacing: true,
      },
    ],
  },
  {
    name: "Personal Injury",
    slug: "personal-injury",
    icon: "heart-pulse",
    description:
      "Accident claims, medical negligence, and personal injury compensation",
    level: 1,
    isUserFacing: true,
    children: [
      {
        name: "Motor Vehicle Accidents",
        slug: "motor-vehicle-accidents",
        icon: "car",
        description: "Road accident injury claims",
        level: 2,
        isUserFacing: true,
      },
      {
        name: "Medical Negligence",
        slug: "medical-negligence",
        icon: "stethoscope",
        description: "Medical malpractice and healthcare liability",
        level: 2,
        isUserFacing: true,
      },
      {
        name: "Workplace Injuries",
        slug: "workplace-injuries",
        icon: "hard-hat",
        description: "Occupational accidents and SOCSO claims",
        level: 2,
        isUserFacing: true,
      },
    ],
  },
  {
    name: "Immigration",
    slug: "immigration",
    icon: "plane",
    description: "Work permits, visas, citizenship, and immigration appeals",
    level: 1,
    isUserFacing: true,
    children: [
      {
        name: "Work Permits",
        slug: "work-permits",
        icon: "id-card",
        description: "Employment pass and work permit applications",
        level: 2,
        isUserFacing: true,
      },
      {
        name: "Visa Applications",
        slug: "visa-applications",
        icon: "stamp",
        description: "Tourist, student, and long-term visas",
        level: 2,
        isUserFacing: true,
      },
      {
        name: "Citizenship",
        slug: "citizenship",
        icon: "flag",
        description: "Citizenship applications and appeals",
        level: 2,
        isUserFacing: true,
      },
    ],
  },
  {
    name: "Wills & Estate",
    slug: "wills-estate",
    icon: "scroll",
    description: "Estate planning, wills, probate, and inheritance matters",
    level: 1,
    isUserFacing: true,
    children: [
      {
        name: "Will Drafting",
        slug: "will-drafting",
        icon: "pen-line",
        description: "Creating and updating wills",
        level: 2,
        isUserFacing: true,
      },
      {
        name: "Probate",
        slug: "probate",
        icon: "file-check",
        description: "Estate administration after death",
        level: 2,
        isUserFacing: true,
      },
      {
        name: "Estate Disputes",
        slug: "estate-disputes",
        icon: "file-warning",
        description: "Inheritance and beneficiary disputes",
        level: 2,
        isUserFacing: true,
      },
    ],
  },
  {
    name: "Constitutional Law",
    slug: "constitutional-law",
    icon: "book-open",
    description:
      "Fundamental rights, constitutional challenges, and public law",
    level: 1,
    isUserFacing: true,
  },
  {
    name: "Administrative Law",
    slug: "administrative-law",
    icon: "building",
    description: "Government decisions, judicial review, and public authority",
    level: 1,
    isUserFacing: true,
  },
  {
    name: "Tax Law",
    slug: "tax-law",
    icon: "calculator",
    description:
      "Tax planning, compliance, disputes, and IRB audit representation",
    level: 1,
    isUserFacing: true,
  },
  {
    name: "Cyberlaw & Technology",
    slug: "cyberlaw-technology",
    icon: "shield",
    description: "Data protection, cybersecurity, and technology contracts",
    level: 1,
    isUserFacing: true,
    children: [
      {
        name: "Data Protection",
        slug: "data-protection",
        icon: "lock",
        description: "PDPA compliance and data privacy",
        level: 2,
        isUserFacing: true,
      },
      {
        name: "E-Commerce",
        slug: "e-commerce",
        icon: "shopping-cart",
        description: "Online business and digital transactions",
        level: 2,
        isUserFacing: true,
      },
    ],
  },
  {
    name: "Environmental Law",
    slug: "environmental-law",
    icon: "leaf",
    description: "Environmental compliance, permits, and sustainability",
    level: 1,
    isUserFacing: true,
  },
  {
    name: "Shipping & Maritime",
    slug: "shipping-maritime",
    icon: "ship",
    description: "Maritime law, shipping disputes, and admiralty",
    level: 1,
    isUserFacing: true,
  },
  {
    name: "Insurance",
    slug: "insurance",
    icon: "umbrella",
    description: "Insurance claims, disputes, and coverage issues",
    level: 1,
    isUserFacing: true,
  },
  {
    name: "Construction",
    slug: "construction",
    icon: "construction",
    description: "Construction contracts, disputes, and defects",
    level: 1,
    isUserFacing: true,
  },
];

// Flatten practice areas for easy lookup
export function flattenPracticeAreas(
  areas: PracticeAreaDefinition[] = PRACTICE_AREAS,
  parentSlug?: string
): (PracticeAreaDefinition & { parentSlug?: string })[] {
  return areas.reduce(
    (acc, area) => {
      const flatArea = { ...area, parentSlug };
      acc.push(flatArea);
      if (area.children) {
        acc.push(...flattenPracticeAreas(area.children, area.slug));
      }
      return acc;
    },
    [] as (PracticeAreaDefinition & { parentSlug?: string })[]
  );
}

// Get user-facing practice areas only (levels 1 and 2)
export function getUserFacingPracticeAreas(): PracticeAreaDefinition[] {
  return PRACTICE_AREAS.map((area) => ({
    ...area,
    children: area.children?.filter((child) => child.isUserFacing),
  }));
}

// Get practice area by slug
export function getPracticeAreaBySlug(
  slug: string
): PracticeAreaDefinition | undefined {
  const flattened = flattenPracticeAreas();
  return flattened.find((area) => area.slug === slug);
}

// Get level 1 practice areas only
export function getMainPracticeAreas(): PracticeAreaDefinition[] {
  return PRACTICE_AREAS;
}
