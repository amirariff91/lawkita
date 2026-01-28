# LawKita - Malaysia Lawyer Directory
## Product Requirements Document (PRD)

**Version:** 1.0
**Last Updated:** 2026-01-27
**Domain:** lawkita.com
**Status:** Ready for Development

---

## Executive Summary

LawKita is a comprehensive Malaysian lawyer directory with a "Famous Cases Explorer" as the viral hook. Think MyParliament for lawyers - bringing transparency and accountability to the legal profession. The platform serves the general public finding lawyers, businesses seeking legal counsel, and lawyers wanting visibility and leads.

### Vision
Build the definitive Malaysian lawyer directory that:
1. **Goes viral** with Famous Cases Explorer (1MDB, political cases)
2. **Converts traffic** to lawyer directory usage
3. **Monetizes** through lawyer subscriptions and lead generation
4. **Expands** to Singapore and beyond

---

## 1. Target Users

### 1.1 Primary Users

| User Type | Need | Success Metric |
|-----------|------|----------------|
| **General Public** | Find a trustworthy lawyer for personal legal matters (divorce, accident, disputes) | Time to contact lawyer < 5 minutes |
| **Businesses** | Find law firms for retainers, M&A, contracts, IP | Quality of matched firms |
| **Lawyers/Firms** | Visibility, leads, showcase track record | Enquiries received, profile views |

### 1.2 User Personas

**Persona 1: "Ahmad the Divorcee"**
- 35yo, going through divorce, never hired a lawyer
- Needs: Find affordable family lawyer in KL, read reviews, understand costs
- Pain: Doesn't know where to start, worried about being scammed

**Persona 2: "Sarah the Startup Founder"**
- 28yo, raising Series A, needs corporate lawyer
- Needs: Find IP/corporate specialist with startup experience
- Pain: Legal 500 is too corporate, Bar directory is too basic

**Persona 3: "Lawyer Tan"**
- 40yo, 15 years experience, solo practitioner
- Needs: More visibility, showcase successful cases, get leads
- Pain: Big firms dominate, hard to compete on marketing

---

## 2. Core Features

### 2.1 Famous Cases Explorer (Viral Hook)

**Purpose:** Drive traffic and social sharing through high-profile case exploration.

**Features:**
- Interactive case timelines with key events
- Lawyer involvement maps (who represented whom)
- Case "report cards" with verifiable stats
- Shareable infographic cards for social media
- Embeddable widgets for news sites

**MVP Cases (10-15):**
1. 1MDB SRC Trial (Najib Razak, Shafee Abdullah)
2. 1MDB Main Trial
3. Rosmah Mansor Corruption Trial
4. Lim Guan Eng Undersea Tunnel Case
5. Anwar Ibrahim cases
6. Altantuya Murder Case
7. Teoh Beng Hock Inquest
8. Indira Gandhi Custody Case
9. MACC-related high-profile cases
10. Major corporate fraud cases

**Data per Case:**
```typescript
interface FamousCase {
  id: string
  slug: string
  title: string                    // "1MDB SRC Trial"
  subtitle: string                 // "RM42 Million Misappropriation"
  category: 'corruption' | 'political' | 'corporate' | 'criminal' | 'constitutional'
  significance: string             // Why this case matters
  tags: string[]                   // ["1MDB", "corruption", "abuse-of-power"]

  parties: {
    prosecution: string[]
    defense: string[]
  }

  lawyers: {
    prosecutionTeam: LawyerAppearance[]
    defenseTeam: LawyerAppearance[]
  }

  timeline: {
    date: string
    title: string
    description: string
    court?: string
  }[]

  verdict: {
    outcome: string
    sentence?: string
    date: string
  }

  mediaReferences: {
    title: string
    url: string
    source: string
  }[]

  stats: {
    durationDays: number
    witnesses: number
    courtAppearances: number
    charges: number
  }
}
```

### 2.2 Lawyer Directory

**Features:**
- Search by name, practice area, location, language
- Filter by experience level, ratings, verified status
- SEO-optimized profile pages with schema markup
- Practice area landing pages (criminal, family, corporate, etc.)
- Location-based browsing (by state, city)

**Search Capabilities:**
- Full-text search (Meilisearch)
- Faceted filtering
- Autocomplete suggestions
- "Near me" location search

### 2.3 Lawyer Profiles

**Public Profile Sections:**
```typescript
interface LawyerProfile {
  // Basic Info
  id: string
  slug: string
  name: string
  title: string                    // "Advocate & Solicitor"
  profilePhoto: string
  coverPhoto?: string

  // Professional
  barMembershipNo: string
  admissionDate: string            // Date admitted to Bar
  yearsExperience: number          // Calculated
  currentFirm: LawFirm
  previousFirms: LawFirm[]

  // Practice Areas (with depth indicators)
  practiceAreas: {
    area: PracticeArea
    experienceLevel: 'expert' | 'experienced' | 'familiar'
    yearsInArea: number
  }[]

  // Qualifications
  education: {
    institution: string
    degree: string
    year: number
    country: string
  }[]
  languages: string[]
  certifications: string[]

  // Content
  bio: string                      // Rich text
  achievements: string[]
  publications: Publication[]

  // Metrics (verifiable only)
  metrics: {
    courtAppearances: number       // From court records
    casesInvolved: number          // From court records
    yearsAtBar: number             // From Bar admission
    reviewCount: number
    averageRating: number
    responseRate: number           // % of enquiries responded
    responseTime: string           // Avg response time
  }

  // Notable Cases (linked to Cases Explorer)
  notableCases: FamousCase[]

  // Reviews
  reviews: Review[]
  peerEndorsements: PeerEndorsement[]

  // Contact
  contactMethods: {
    email?: string
    phone?: string
    whatsapp?: string
    showEnquiryForm: boolean
  }

  // Subscription
  tier: 'free' | 'premium' | 'featured'
  isVerified: boolean
  isClaimed: boolean
}
```

**Verifiable Metrics (NOT win/loss):**
| Metric | Source | Why It's Fair |
|--------|--------|---------------|
| Court Appearances | e-Judgment Portal | Objective count, shows activity |
| Cases Involved | e-Judgment Portal | Shows experience depth |
| Years at Bar | Bar Council | Verifiable tenure |
| Response Rate | Platform data | Shows responsiveness |
| Review Ratings | Client/peer reviews | Aggregated feedback |

### 2.4 Law Firm Profiles

```typescript
interface LawFirmProfile {
  id: string
  slug: string
  name: string
  logo: string
  coverPhoto?: string

  // Firm Details
  foundedYear: number
  firmSize: 'solo' | 'small' | 'medium' | 'large'  // 1, 2-10, 11-50, 50+
  firmType: 'full-service' | 'boutique' | 'specialist'

  // Location
  headquarters: Address
  branchOffices: Address[]

  // Team
  lawyers: LawyerProfile[]
  partnerCount: number
  associateCount: number

  // Practice Areas
  practiceAreas: PracticeArea[]
  industryFocus: string[]

  // Content
  about: string
  achievements: string[]
  clients: string[]                // Notable clients (with permission)

  // Notable Cases
  notableCases: FamousCase[]

  // Reviews
  reviews: Review[]

  // Contact
  website: string
  email: string
  phone: string

  // Subscription
  tier: 'free' | 'premium' | 'featured'
  isVerified: boolean
}
```

### 2.5 Review System

**Dual Review Types:**

1. **Client Reviews**
```typescript
interface ClientReview {
  id: string
  lawyerId: string
  reviewerId: string              // User account

  // Verification
  verificationMethod: 'email' | 'phone' | 'document'
  engagementType: 'consultation' | 'representation' | 'ongoing'
  engagementYear: number
  caseType: PracticeArea

  // Ratings (1-5)
  ratings: {
    overall: number
    communication: number
    expertise: number
    responsiveness: number
    valueForMoney: number
  }

  // Content
  title: string
  content: string                 // Min 50 chars
  pros: string[]
  cons: string[]

  // Outcome (optional, not win/loss)
  satisfiedWithOutcome: boolean
  wouldRecommend: boolean

  // Moderation
  status: 'pending' | 'approved' | 'rejected' | 'flagged'
  lawyerResponse?: string

  createdAt: string
  isVerified: boolean
}
```

2. **Peer Endorsements**
```typescript
interface PeerEndorsement {
  id: string
  fromLawyerId: string           // Must be verified lawyer
  toLawyerId: string

  relationship: 'colleague' | 'opposing_counsel' | 'co_counsel' | 'supervisor' | 'other'
  yearsKnown: number

  endorsedAreas: PracticeArea[]

  content: string                // Professional endorsement

  // Ratings
  ratings: {
    legalKnowledge: number       // 1-5
    analyticalSkills: number
    professionalism: number
    communication: number
  }

  status: 'pending' | 'approved'
  createdAt: string
}
```

### 2.6 Lead Generation

**Enquiry Flow:**
1. User views lawyer profile
2. Clicks "Send Enquiry" or "Request Consultation"
3. Fills form: name, email, phone, case type, brief description
4. Enquiry sent to lawyer dashboard
5. Lawyer responds (tracked for response rate)

```typescript
interface Enquiry {
  id: string
  lawyerId: string

  // Contact Info
  name: string
  email: string
  phone: string
  preferredContact: 'email' | 'phone' | 'whatsapp'

  // Case Details
  caseType: PracticeArea
  urgency: 'urgent' | 'soon' | 'planning'
  description: string

  // Source Tracking
  source: 'profile' | 'search' | 'case_explorer' | 'referral'
  referralCode?: string

  // Status
  status: 'new' | 'viewed' | 'responded' | 'converted' | 'closed'
  responseTime?: number          // Minutes to first response

  // For Premium
  qualityScore: number           // AI-scored lead quality

  createdAt: string
}
```

### 2.7 Claim & Verification System

**Claim Flow:**
1. Lawyer finds their auto-generated profile
2. Clicks "Claim This Profile"
3. Enters Bar membership number
4. System verifies against Bar Directory
5. Email verification to firm email
6. Admin approval (for edge cases)
7. Profile marked as "Verified"

```typescript
interface ClaimRequest {
  id: string
  lawyerId: string
  userId: string

  // Verification Data
  barMembershipNo: string
  firmEmail: string

  // Supporting Documents (optional)
  documents: {
    type: 'practicing_certificate' | 'bar_card' | 'other'
    url: string
  }[]

  // Status
  status: 'pending' | 'verified' | 'rejected'
  verificationMethod: 'bar_directory' | 'email' | 'manual'
  rejectionReason?: string

  createdAt: string
  verifiedAt?: string
}
```

---

## 3. Premium Tiers & Pricing

### 3.1 Pricing Model (Malaysia Market)

| Tier | Monthly (MYR) | Annual (MYR) | Target |
|------|---------------|--------------|--------|
| **Free** | RM 0 | RM 0 | All lawyers (default) |
| **Premium** | RM 299 | RM 2,499 (30% off) | Solo/small firm lawyers |
| **Featured** | RM 799 | RM 6,999 (27% off) | Established lawyers |
| **Firm Premium** | RM 1,499 | RM 12,999 | Law firms |

*Pricing benchmarked against Malaysia market (~$70-350 USD, competitive with local advertising costs)*

### 3.2 Feature Comparison

| Feature | Free | Premium | Featured | Firm |
|---------|------|---------|----------|------|
| Basic profile | ✓ | ✓ | ✓ | ✓ |
| Appear in search | ✓ | ✓ | ✓ | ✓ |
| Receive enquiries | 5/month | Unlimited | Unlimited | Unlimited |
| Profile photo | ✓ | ✓ | ✓ | ✓ |
| Cover photo | - | ✓ | ✓ | ✓ |
| Video intro | - | ✓ | ✓ | ✓ |
| Featured in area | - | - | ✓ | ✓ |
| Homepage spotlight | - | - | Monthly | Weekly |
| Priority in search | - | +10% | +25% | +25% |
| Analytics dashboard | Basic | Full | Full | Full |
| Lead quality scores | - | ✓ | ✓ | ✓ |
| Response templates | - | ✓ | ✓ | ✓ |
| Remove competitor ads | - | - | ✓ | ✓ |
| Team profiles | - | - | - | Up to 20 |
| Firm page | - | - | - | ✓ |
| API access | - | - | - | ✓ |

### 3.3 Lead Generation Fees (Alternative Model)

For lawyers who prefer pay-per-lead:

| Lead Type | Fee (MYR) |
|-----------|-----------|
| Basic enquiry (unqualified) | RM 25 |
| Qualified lead (AI-scored 70%+) | RM 75 |
| Exclusive lead (sent to 1 lawyer) | RM 150 |
| Consultation booked | RM 200 |

### 3.4 Add-On Services

| Service | Price (MYR) |
|---------|-------------|
| Profile writing/optimization | RM 499 one-time |
| Professional photoshoot | RM 799 one-time |
| SEO boost package | RM 299/month |
| Social media kit | RM 199/month |
| Sponsored content/blog | RM 999/post |
| Featured case study | RM 1,499 one-time |

---

## 4. Technical Specification

### 4.1 Tech Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Framework | Next.js 16 (App Router) | SSR/SSG for SEO, React ecosystem |
| Language | TypeScript | Type safety, better DX |
| Styling | Tailwind CSS + shadcn/ui | Rapid development, consistent design |
| Database | PostgreSQL | Relational data, full-text search fallback |
| ORM | Drizzle ORM | Type-safe, performant, good DX |
| Search | Meilisearch | Fast, typo-tolerant, faceted search |
| Auth | NextAuth.js v5 | Flexible, supports multiple providers |
| Storage | MinIO (S3-compatible) | Self-hosted, cost-effective |
| Cache | Redis | Session, rate limiting, job queues |
| Background Jobs | BullMQ | Reliable job processing |
| Deployment | Dokploy | Self-hosted, cost control |

### 4.2 Database Schema

```sql
-- Regions (multi-tenant ready)
CREATE TABLE regions (
  id VARCHAR PRIMARY KEY,
  code VARCHAR(2) NOT NULL,        -- MY, SG
  name VARCHAR NOT NULL,
  currency VARCHAR(3) NOT NULL,    -- MYR, SGD
  is_active BOOLEAN DEFAULT true
);

-- Practice Areas
CREATE TABLE practice_areas (
  id VARCHAR PRIMARY KEY,
  slug VARCHAR UNIQUE NOT NULL,
  name_en VARCHAR NOT NULL,
  name_ms VARCHAR,                 -- Malay
  parent_id VARCHAR REFERENCES practice_areas(id),
  icon VARCHAR,
  display_order INT
);

-- Locations
CREATE TABLE states (
  id VARCHAR PRIMARY KEY,
  region_id VARCHAR REFERENCES regions(id),
  code VARCHAR(10) NOT NULL,
  name_en VARCHAR NOT NULL,
  name_ms VARCHAR
);

CREATE TABLE cities (
  id VARCHAR PRIMARY KEY,
  state_id VARCHAR REFERENCES states(id),
  name VARCHAR NOT NULL,
  latitude DECIMAL,
  longitude DECIMAL
);

-- Law Firms
CREATE TABLE law_firms (
  id VARCHAR PRIMARY KEY,
  slug VARCHAR UNIQUE NOT NULL,
  name VARCHAR NOT NULL,
  logo_url VARCHAR,
  cover_photo_url VARCHAR,

  founded_year INT,
  firm_size VARCHAR CHECK (firm_size IN ('solo', 'small', 'medium', 'large')),
  firm_type VARCHAR CHECK (firm_type IN ('full-service', 'boutique', 'specialist')),

  about TEXT,
  website VARCHAR,
  email VARCHAR,
  phone VARCHAR,

  -- Address
  address_line1 VARCHAR,
  address_line2 VARCHAR,
  city_id VARCHAR REFERENCES cities(id),
  postcode VARCHAR,

  -- Subscription
  tier VARCHAR DEFAULT 'free' CHECK (tier IN ('free', 'premium', 'featured')),
  tier_expires_at TIMESTAMP,

  is_verified BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Lawyers
CREATE TABLE lawyers (
  id VARCHAR PRIMARY KEY,
  slug VARCHAR UNIQUE NOT NULL,
  user_id VARCHAR REFERENCES users(id),     -- If claimed
  firm_id VARCHAR REFERENCES law_firms(id),

  -- Basic Info
  name VARCHAR NOT NULL,
  title VARCHAR DEFAULT 'Advocate & Solicitor',
  profile_photo_url VARCHAR,
  cover_photo_url VARCHAR,

  -- Professional
  bar_membership_no VARCHAR UNIQUE,
  admission_date DATE,

  -- Content
  bio TEXT,
  languages VARCHAR[],

  -- Contact (shown based on settings)
  email VARCHAR,
  phone VARCHAR,
  whatsapp VARCHAR,
  show_enquiry_form BOOLEAN DEFAULT true,

  -- Metrics (auto-calculated)
  court_appearances INT DEFAULT 0,
  cases_involved INT DEFAULT 0,
  review_count INT DEFAULT 0,
  average_rating DECIMAL(2,1),
  response_rate DECIMAL(3,2),
  avg_response_minutes INT,

  -- Subscription
  tier VARCHAR DEFAULT 'free' CHECK (tier IN ('free', 'premium', 'featured')),
  tier_expires_at TIMESTAMP,

  is_verified BOOLEAN DEFAULT false,
  is_claimed BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Lawyer Practice Areas
CREATE TABLE lawyer_practice_areas (
  lawyer_id VARCHAR REFERENCES lawyers(id) ON DELETE CASCADE,
  practice_area_id VARCHAR REFERENCES practice_areas(id),
  experience_level VARCHAR CHECK (experience_level IN ('expert', 'experienced', 'familiar')),
  years_in_area INT,
  PRIMARY KEY (lawyer_id, practice_area_id)
);

-- Lawyer Education
CREATE TABLE lawyer_education (
  id VARCHAR PRIMARY KEY,
  lawyer_id VARCHAR REFERENCES lawyers(id) ON DELETE CASCADE,
  institution VARCHAR NOT NULL,
  degree VARCHAR NOT NULL,
  year INT,
  country VARCHAR
);

-- Famous Cases
CREATE TABLE famous_cases (
  id VARCHAR PRIMARY KEY,
  slug VARCHAR UNIQUE NOT NULL,

  title VARCHAR NOT NULL,
  subtitle VARCHAR,
  category VARCHAR NOT NULL,
  significance TEXT,
  tags VARCHAR[],

  -- Parties
  prosecution_parties VARCHAR[],
  defense_parties VARCHAR[],

  -- Verdict
  verdict_outcome VARCHAR,
  verdict_sentence VARCHAR,
  verdict_date DATE,

  -- Stats
  duration_days INT,
  witness_count INT,
  court_appearances INT,
  charge_count INT,

  is_featured BOOLEAN DEFAULT false,
  is_published BOOLEAN DEFAULT false,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Case Timeline Events
CREATE TABLE case_timeline_events (
  id VARCHAR PRIMARY KEY,
  case_id VARCHAR REFERENCES famous_cases(id) ON DELETE CASCADE,

  event_date DATE NOT NULL,
  title VARCHAR NOT NULL,
  description TEXT,
  court VARCHAR,

  display_order INT,

  created_at TIMESTAMP DEFAULT NOW()
);

-- Case Lawyers (many-to-many)
CREATE TABLE case_lawyers (
  case_id VARCHAR REFERENCES famous_cases(id) ON DELETE CASCADE,
  lawyer_id VARCHAR REFERENCES lawyers(id),

  role VARCHAR NOT NULL CHECK (role IN ('prosecution', 'defense', 'lead_prosecution', 'lead_defense')),

  PRIMARY KEY (case_id, lawyer_id, role)
);

-- Reviews
CREATE TABLE reviews (
  id VARCHAR PRIMARY KEY,
  lawyer_id VARCHAR REFERENCES lawyers(id) ON DELETE CASCADE,
  user_id VARCHAR REFERENCES users(id),

  review_type VARCHAR NOT NULL CHECK (review_type IN ('client', 'peer')),

  -- For client reviews
  engagement_type VARCHAR,
  engagement_year INT,
  practice_area_id VARCHAR REFERENCES practice_areas(id),

  -- For peer reviews
  relationship VARCHAR,
  years_known INT,

  -- Ratings
  rating_overall DECIMAL(2,1) NOT NULL,
  rating_communication DECIMAL(2,1),
  rating_expertise DECIMAL(2,1),
  rating_responsiveness DECIMAL(2,1),
  rating_value DECIMAL(2,1),

  -- Content
  title VARCHAR,
  content TEXT NOT NULL,
  pros VARCHAR[],
  cons VARCHAR[],

  would_recommend BOOLEAN,

  -- Lawyer response
  lawyer_response TEXT,
  response_at TIMESTAMP,

  -- Moderation
  status VARCHAR DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'flagged')),
  rejection_reason VARCHAR,

  is_verified BOOLEAN DEFAULT false,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Enquiries
CREATE TABLE enquiries (
  id VARCHAR PRIMARY KEY,
  lawyer_id VARCHAR REFERENCES lawyers(id),

  -- Contact
  name VARCHAR NOT NULL,
  email VARCHAR NOT NULL,
  phone VARCHAR,
  preferred_contact VARCHAR DEFAULT 'email',

  -- Case
  practice_area_id VARCHAR REFERENCES practice_areas(id),
  urgency VARCHAR CHECK (urgency IN ('urgent', 'soon', 'planning')),
  description TEXT NOT NULL,

  -- Tracking
  source VARCHAR DEFAULT 'profile',
  referral_code VARCHAR,
  quality_score DECIMAL(3,2),

  -- Status
  status VARCHAR DEFAULT 'new' CHECK (status IN ('new', 'viewed', 'responded', 'converted', 'closed')),
  first_viewed_at TIMESTAMP,
  first_response_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT NOW()
);

-- Claim Requests
CREATE TABLE claim_requests (
  id VARCHAR PRIMARY KEY,
  lawyer_id VARCHAR REFERENCES lawyers(id),
  user_id VARCHAR REFERENCES users(id),

  bar_membership_no VARCHAR NOT NULL,
  firm_email VARCHAR NOT NULL,

  status VARCHAR DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
  verification_method VARCHAR,
  rejection_reason VARCHAR,

  created_at TIMESTAMP DEFAULT NOW(),
  verified_at TIMESTAMP
);

-- Users (for auth)
CREATE TABLE users (
  id VARCHAR PRIMARY KEY,
  email VARCHAR UNIQUE NOT NULL,
  name VARCHAR,
  image VARCHAR,

  role VARCHAR DEFAULT 'user' CHECK (role IN ('user', 'lawyer', 'admin')),

  email_verified TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Subscriptions
CREATE TABLE subscriptions (
  id VARCHAR PRIMARY KEY,
  lawyer_id VARCHAR REFERENCES lawyers(id),
  firm_id VARCHAR REFERENCES law_firms(id),

  tier VARCHAR NOT NULL,
  status VARCHAR DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'trial')),

  price_myr DECIMAL(10,2),
  billing_cycle VARCHAR CHECK (billing_cycle IN ('monthly', 'annual')),

  starts_at TIMESTAMP NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  cancelled_at TIMESTAMP,

  payment_provider VARCHAR,
  payment_reference VARCHAR,

  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_lawyers_slug ON lawyers(slug);
CREATE INDEX idx_lawyers_firm ON lawyers(firm_id);
CREATE INDEX idx_lawyers_verified ON lawyers(is_verified) WHERE is_active = true;
CREATE INDEX idx_lawyers_tier ON lawyers(tier) WHERE is_active = true;
CREATE INDEX idx_reviews_lawyer ON reviews(lawyer_id) WHERE status = 'approved';
CREATE INDEX idx_enquiries_lawyer ON enquiries(lawyer_id);
CREATE INDEX idx_famous_cases_slug ON famous_cases(slug);
CREATE INDEX idx_famous_cases_published ON famous_cases(is_published) WHERE is_published = true;
```

### 4.3 API Routes Structure

```
/api
├── /auth
│   ├── [...nextauth]           # NextAuth handlers
│   └── /verify-email           # Email verification
│
├── /lawyers
│   ├── GET /                   # List/search lawyers
│   ├── GET /[slug]             # Get lawyer profile
│   ├── POST /[id]/claim        # Claim profile
│   └── POST /[id]/enquiry      # Send enquiry
│
├── /firms
│   ├── GET /                   # List/search firms
│   └── GET /[slug]             # Get firm profile
│
├── /cases
│   ├── GET /                   # List famous cases
│   └── GET /[slug]             # Get case details
│
├── /reviews
│   ├── POST /                  # Submit review
│   └── POST /[id]/respond      # Lawyer response
│
├── /search
│   └── GET /                   # Unified search endpoint
│
├── /dashboard                  # Protected - lawyer dashboard
│   ├── GET /profile            # Get own profile
│   ├── PUT /profile            # Update profile
│   ├── GET /enquiries          # List enquiries
│   ├── PUT /enquiries/[id]     # Update enquiry status
│   ├── GET /analytics          # View analytics
│   └── GET /subscription       # Subscription status
│
└── /admin                      # Protected - admin only
    ├── /claims                 # Manage claim requests
    ├── /reviews                # Moderate reviews
    ├── /lawyers                # Manage lawyers
    ├── /cases                  # Manage famous cases
    └── /analytics              # Platform analytics
```

### 4.4 Page Routes

```
/                               # Homepage
├── /lawyers                    # Lawyer directory
│   ├── /[slug]                 # Lawyer profile (SEO critical)
│   ├── /practice-area/[area]   # By practice area
│   └── /location/[state]/[city]# By location
│
├── /law-firms                  # Firm directory
│   └── /[slug]                 # Firm profile
│
├── /cases                      # Famous Cases Explorer
│   └── /[slug]                 # Case detail with timeline
│
├── /search                     # Advanced search
│
├── /about                      # About LawKita
├── /contact                    # Contact page
├── /pricing                    # Pricing for lawyers
├── /for-lawyers                # Marketing page for lawyers
│
├── /auth
│   ├── /signin                 # Sign in
│   ├── /signup                 # Sign up
│   └── /verify                 # Email verification
│
├── /claim/[lawyerId]           # Claim profile flow
│
├── /dashboard                  # Lawyer dashboard (protected)
│   ├── /profile                # Edit profile
│   ├── /enquiries              # Manage enquiries
│   ├── /reviews                # View/respond to reviews
│   ├── /analytics              # View stats
│   └── /subscription           # Manage subscription
│
└── /admin                      # Admin panel (protected)
    ├── /claims                 # Review claims
    ├── /reviews                # Moderate reviews
    ├── /lawyers                # Manage lawyers
    ├── /cases                  # Manage cases
    └── /users                  # Manage users
```

### 4.5 SEO Implementation

**Critical SEO Elements:**

1. **Structured Data (JSON-LD)**
```typescript
// For lawyer profiles
const lawyerSchema = {
  "@context": "https://schema.org",
  "@type": "Attorney",
  "name": lawyer.name,
  "image": lawyer.profilePhotoUrl,
  "jobTitle": lawyer.title,
  "worksFor": {
    "@type": "LegalService",
    "name": lawyer.firm.name
  },
  "address": {
    "@type": "PostalAddress",
    "addressLocality": lawyer.city,
    "addressRegion": lawyer.state,
    "addressCountry": "MY"
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": lawyer.averageRating,
    "reviewCount": lawyer.reviewCount
  },
  "knowsAbout": lawyer.practiceAreas.map(pa => pa.name)
}
```

2. **Meta Tags**
```typescript
// Dynamic meta tags per page
export function generateMetadata({ lawyer }) {
  return {
    title: `${lawyer.name} - ${lawyer.practiceAreas[0]} Lawyer in ${lawyer.city} | LawKita`,
    description: `${lawyer.name} is a ${lawyer.practiceAreas.join(', ')} lawyer in ${lawyer.city}, Malaysia. ${lawyer.yearsExperience} years experience. Read reviews and contact directly.`,
    openGraph: {
      title: `${lawyer.name} - Lawyer Profile`,
      description: lawyer.bio.substring(0, 200),
      images: [lawyer.profilePhotoUrl],
      type: 'profile'
    }
  }
}
```

3. **URL Structure**
- Lawyer: `/lawyers/muhammad-shafee-abdullah` (name-based slug)
- Practice area: `/lawyers/practice-area/criminal-defense`
- Location: `/lawyers/location/selangor/petaling-jaya`
- Case: `/cases/1mdb-src-trial-najib-razak`

4. **Internal Linking**
- Each lawyer links to their practice areas
- Each practice area links to top lawyers
- Cases link to involved lawyers
- Lawyers link to their cases

5. **Sitemap Generation**
```typescript
// Generate dynamic sitemap
export async function generateSitemaps() {
  const lawyers = await getLawyerSlugs()
  const cases = await getCaseSlugs()

  return [
    { id: 'lawyers', urls: lawyers },
    { id: 'cases', urls: cases },
    { id: 'practice-areas', urls: practiceAreas },
    { id: 'locations', urls: locations }
  ]
}
```

---

## 5. Data Collection Strategy

### 5.1 Phase 1: MVP Seed Data

**Manual Collection (Week 1-2):**
- 50 lawyers from personal network
- 10-15 famous cases with full timelines
- All practice areas and locations

**Data Sources:**
| Source | Data | Method |
|--------|------|--------|
| Personal network | Lawyer profiles | Direct outreach |
| News articles | Famous cases | Manual research |
| Malaysian Bar Directory | Basic verification | Manual lookup |
| Court calendars | Case timelines | Manual research |

### 5.2 Phase 2: Court Records Scraping

**Target:** e-Judgment Portal (kehakiman.gov.my)

**Data Available:**
- Case numbers and citations
- Parties (plaintiff/defendant)
- Judgment dates
- Court type and location
- PDF judgments (for lawyer extraction)

**Technical Approach:**
```typescript
// Scraper architecture
interface ScraperPipeline {
  // Step 1: Metadata collection
  collectMetadata(dateRange: DateRange): Promise<CaseMetadata[]>

  // Step 2: PDF download
  downloadJudgments(cases: CaseMetadata[]): Promise<JudgmentPDF[]>

  // Step 3: Text extraction
  extractText(pdf: JudgmentPDF): Promise<string>

  // Step 4: Lawyer extraction
  extractLawyers(text: string): Promise<LawyerAppearance[]>

  // Step 5: Cross-reference
  matchToExisting(appearance: LawyerAppearance): Promise<Lawyer | null>
}
```

**Lawyer Extraction Patterns:**
```javascript
// Common patterns in Malaysian judgments
const patterns = [
  /For the (Plaintiff|Defendant|Appellant|Respondent)[:\s]+([^;]+);\s*M\/s\s+([^\n]+)/gi,
  /Counsel for (the\s+)?(Plaintiff|Defendant)[:\s]+([^(]+)\s*\(([^)]+)\)/gi,
]
```

### 5.3 Phase 3: Bar Council Partnership

**Data to Request:**
- Full member registry (name, firm, practice areas)
- Admission dates
- Practicing certificate status
- Disciplinary records (public)

**Approach:**
1. Formal letter to Bar Council
2. Propose data partnership
3. Offer value: free premium listings for Bar events
4. Negotiate API access or data dump

---

## 6. Project Structure

```
lawkita/
├── .env.local                    # Environment variables
├── .env.example                  # Example env file
├── next.config.ts                # Next.js config
├── tailwind.config.ts            # Tailwind config
├── drizzle.config.ts             # Drizzle ORM config
├── package.json
├── tsconfig.json
│
├── prisma/                       # If using Prisma instead
│   └── schema.prisma
│
├── drizzle/                      # Drizzle schema & migrations
│   ├── schema.ts                 # Database schema
│   ├── relations.ts              # Table relations
│   └── migrations/               # SQL migrations
│
├── public/
│   ├── images/
│   │   ├── og/                   # OpenGraph images
│   │   └── icons/                # Practice area icons
│   └── fonts/
│
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── layout.tsx            # Root layout
│   │   ├── page.tsx              # Homepage
│   │   ├── globals.css           # Global styles
│   │   │
│   │   ├── (public)/             # Public pages (with layout)
│   │   │   ├── layout.tsx        # Public layout (header/footer)
│   │   │   ├── lawyers/
│   │   │   │   ├── page.tsx      # Directory listing
│   │   │   │   ├── [slug]/
│   │   │   │   │   └── page.tsx  # Lawyer profile
│   │   │   │   ├── practice-area/
│   │   │   │   │   └── [area]/
│   │   │   │   │       └── page.tsx
│   │   │   │   └── location/
│   │   │   │       └── [state]/
│   │   │   │           └── [city]/
│   │   │   │               └── page.tsx
│   │   │   │
│   │   │   ├── law-firms/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [slug]/
│   │   │   │       └── page.tsx
│   │   │   │
│   │   │   ├── cases/
│   │   │   │   ├── page.tsx      # Famous Cases Explorer
│   │   │   │   └── [slug]/
│   │   │   │       └── page.tsx  # Case detail
│   │   │   │
│   │   │   ├── search/
│   │   │   │   └── page.tsx
│   │   │   │
│   │   │   ├── about/
│   │   │   │   └── page.tsx
│   │   │   ├── pricing/
│   │   │   │   └── page.tsx
│   │   │   └── for-lawyers/
│   │   │       └── page.tsx
│   │   │
│   │   ├── (auth)/               # Auth pages
│   │   │   ├── layout.tsx
│   │   │   ├── signin/
│   │   │   │   └── page.tsx
│   │   │   ├── signup/
│   │   │   │   └── page.tsx
│   │   │   └── verify/
│   │   │       └── page.tsx
│   │   │
│   │   ├── dashboard/            # Lawyer dashboard (protected)
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx          # Dashboard home
│   │   │   ├── profile/
│   │   │   │   └── page.tsx
│   │   │   ├── enquiries/
│   │   │   │   └── page.tsx
│   │   │   ├── reviews/
│   │   │   │   └── page.tsx
│   │   │   ├── analytics/
│   │   │   │   └── page.tsx
│   │   │   └── subscription/
│   │   │       └── page.tsx
│   │   │
│   │   ├── admin/                # Admin panel (protected)
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   ├── claims/
│   │   │   │   └── page.tsx
│   │   │   ├── reviews/
│   │   │   │   └── page.tsx
│   │   │   ├── lawyers/
│   │   │   │   └── page.tsx
│   │   │   └── cases/
│   │   │       └── page.tsx
│   │   │
│   │   ├── claim/
│   │   │   └── [lawyerId]/
│   │   │       └── page.tsx
│   │   │
│   │   └── api/                  # API routes
│   │       ├── auth/
│   │       │   └── [...nextauth]/
│   │       │       └── route.ts
│   │       ├── lawyers/
│   │       │   ├── route.ts
│   │       │   └── [id]/
│   │       │       ├── route.ts
│   │       │       ├── claim/
│   │       │       │   └── route.ts
│   │       │       └── enquiry/
│   │       │           └── route.ts
│   │       ├── firms/
│   │       │   └── route.ts
│   │       ├── cases/
│   │       │   └── route.ts
│   │       ├── reviews/
│   │       │   └── route.ts
│   │       ├── search/
│   │       │   └── route.ts
│   │       └── webhooks/
│   │           └── stripe/
│   │               └── route.ts
│   │
│   ├── components/
│   │   ├── ui/                   # shadcn/ui components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── input.tsx
│   │   │   └── ...
│   │   │
│   │   ├── layout/
│   │   │   ├── header.tsx
│   │   │   ├── footer.tsx
│   │   │   ├── mobile-nav.tsx
│   │   │   └── sidebar.tsx
│   │   │
│   │   ├── lawyers/
│   │   │   ├── lawyer-card.tsx
│   │   │   ├── lawyer-grid.tsx
│   │   │   ├── lawyer-profile.tsx
│   │   │   ├── lawyer-metrics.tsx
│   │   │   ├── lawyer-reviews.tsx
│   │   │   └── enquiry-form.tsx
│   │   │
│   │   ├── firms/
│   │   │   ├── firm-card.tsx
│   │   │   └── firm-profile.tsx
│   │   │
│   │   ├── cases/
│   │   │   ├── case-card.tsx
│   │   │   ├── case-timeline.tsx
│   │   │   ├── case-lawyers.tsx
│   │   │   ├── case-stats.tsx
│   │   │   └── share-card.tsx
│   │   │
│   │   ├── search/
│   │   │   ├── search-bar.tsx
│   │   │   ├── search-filters.tsx
│   │   │   └── search-results.tsx
│   │   │
│   │   ├── reviews/
│   │   │   ├── review-card.tsx
│   │   │   ├── review-form.tsx
│   │   │   └── rating-stars.tsx
│   │   │
│   │   └── dashboard/
│   │       ├── stats-card.tsx
│   │       ├── enquiry-list.tsx
│   │       └── profile-form.tsx
│   │
│   ├── lib/
│   │   ├── db/
│   │   │   ├── index.ts          # Database connection
│   │   │   ├── schema.ts         # Drizzle schema
│   │   │   └── queries/
│   │   │       ├── lawyers.ts
│   │   │       ├── cases.ts
│   │   │       └── reviews.ts
│   │   │
│   │   ├── auth/
│   │   │   ├── config.ts         # NextAuth config
│   │   │   └── utils.ts
│   │   │
│   │   ├── search/
│   │   │   └── meilisearch.ts    # Search client
│   │   │
│   │   ├── utils/
│   │   │   ├── seo.ts            # SEO helpers
│   │   │   ├── format.ts         # Formatters
│   │   │   └── validators.ts     # Zod schemas
│   │   │
│   │   └── constants/
│   │       ├── practice-areas.ts
│   │       ├── locations.ts
│   │       └── pricing.ts
│   │
│   ├── hooks/
│   │   ├── use-search.ts
│   │   ├── use-lawyer.ts
│   │   └── use-enquiry.ts
│   │
│   └── types/
│       ├── lawyer.ts
│       ├── firm.ts
│       ├── case.ts
│       └── review.ts
│
├── scripts/
│   ├── seed.ts                   # Seed database
│   ├── scrape-ejudgment.ts       # Court records scraper
│   └── import-lawyers.ts         # Import from CSV
│
└── tests/
    ├── e2e/
    └── unit/
```

---

## 7. Implementation Phases

### Phase 1: Foundation (Week 1-2)

**Goal:** Project setup and core infrastructure

**Tasks:**
1. Initialize Next.js 16 project with TypeScript
2. Configure Tailwind CSS + shadcn/ui
3. Set up PostgreSQL on Dokploy
4. Configure Drizzle ORM with schema
5. Set up NextAuth.js v5
6. Create base layout components (header, footer, navigation)
7. Implement responsive design system

**Deliverables:**
- Running Next.js app on Dokploy
- Database with all tables created
- Basic auth flow working
- Base layout with navigation

### Phase 2: Lawyer Directory (Week 3-4)

**Goal:** Core lawyer directory with SEO

**Tasks:**
1. Build lawyer listing page with filters
2. Build lawyer profile page with all sections
3. Implement SEO (meta tags, JSON-LD, sitemap)
4. Build practice area landing pages
5. Build location-based pages
6. Implement search (PostgreSQL full-text first)
7. Seed 50 lawyer profiles

**Deliverables:**
- `/lawyers` directory page
- `/lawyers/[slug]` profile pages
- `/lawyers/practice-area/[area]` pages
- `/lawyers/location/[state]/[city]` pages
- Basic search functionality
- 50 seeded lawyer profiles

### Phase 3: Famous Cases Explorer (Week 5-6)

**Goal:** Viral hook feature

**Tasks:**
1. Build case listing page
2. Build case detail page with timeline
3. Create interactive timeline component
4. Build lawyer involvement visualization
5. Create shareable infographic cards
6. Curate 10-15 famous cases with timelines
7. Link cases to lawyer profiles

**Deliverables:**
- `/cases` explorer page
- `/cases/[slug]` detail pages
- Interactive timeline component
- Share cards for social media
- 10-15 curated famous cases

### Phase 4: Reviews & Enquiries (Week 7-8)

**Goal:** User engagement features

**Tasks:**
1. Build review submission form
2. Implement review moderation
3. Build enquiry form
4. Create enquiry notifications (email)
5. Build basic lawyer dashboard
6. Implement response rate tracking

**Deliverables:**
- Review submission working
- Enquiry form working
- Email notifications
- Basic dashboard for lawyers

### Phase 5: Claim & Verification (Week 9-10)

**Goal:** Lawyer onboarding

**Tasks:**
1. Build claim profile flow
2. Implement Bar membership verification
3. Build email verification
4. Create admin claim review panel
5. Build profile editing interface
6. Implement Meilisearch for better search

**Deliverables:**
- Claim flow working end-to-end
- Admin panel for claim management
- Lawyers can edit their profiles
- Meilisearch integrated

### Phase 6: Premium & Monetization (Week 11-12)

**Goal:** Revenue infrastructure

**Tasks:**
1. Build pricing page
2. Implement subscription tiers
3. Integrate payment gateway (Stripe/local)
4. Build subscription management
5. Implement premium features (featured listings, analytics)
6. Create marketing pages for lawyers

**Deliverables:**
- Pricing page
- Payment integration
- Premium tier features working
- Analytics dashboard for lawyers

---

## 8. Verification & Testing

### 8.1 Development Verification

```bash
# Start development server
npm run dev

# Run type checking
npm run type-check

# Run linting
npm run lint

# Run tests
npm run test
```

### 8.2 SEO Verification

1. **Google Rich Results Test**
   - Test lawyer profile pages for Attorney schema
   - Test case pages for Article schema

2. **Lighthouse Audit**
   - Target: 90+ Performance, 100 SEO
   - Run on key pages: homepage, lawyer profile, cases

3. **Social Card Testing**
   - Facebook Sharing Debugger
   - Twitter Card Validator

### 8.3 User Flow Testing

**Critical Flows:**
1. User searches for lawyer → Views profile → Sends enquiry
2. Lawyer signs up → Claims profile → Verifies → Edits profile
3. User views famous case → Clicks lawyer → Views profile
4. Lawyer subscribes to premium → Payment → Features unlocked

### 8.4 Pre-Launch Checklist

- [ ] 50+ lawyer profiles seeded
- [ ] 10+ famous cases with timelines
- [ ] All practice areas have content
- [ ] All state/city pages work
- [ ] Search returns relevant results
- [ ] Enquiry emails delivered
- [ ] Mobile responsive on all pages
- [ ] Load time < 3s on 3G
- [ ] SSL certificate configured
- [ ] Analytics tracking (Google Analytics/Plausible)
- [ ] Error monitoring (Sentry)
- [ ] Backup configured
- [ ] Rate limiting on API routes

---

## 9. Success Metrics

### 9.1 Launch Targets (Month 1)

| Metric | Target |
|--------|--------|
| Lawyer profiles | 100+ |
| Famous cases | 15+ |
| Monthly visitors | 10,000 |
| Enquiries sent | 100 |
| Lawyers claimed | 20 |
| Social shares | 1,000 |

### 9.2 Growth Targets (Month 3)

| Metric | Target |
|--------|--------|
| Lawyer profiles | 500+ |
| Monthly visitors | 50,000 |
| Enquiries sent | 500 |
| Lawyers claimed | 100 |
| Premium subscribers | 10 |
| MRR | RM 5,000 |

### 9.3 Key Performance Indicators

1. **Traffic:** Monthly unique visitors, page views
2. **Engagement:** Time on site, pages per session
3. **Conversion:** Enquiry rate, claim rate
4. **Revenue:** MRR, ARPU, churn rate
5. **SEO:** Keyword rankings, organic traffic %

---

## 10. Open Questions

1. **Payment Gateway:** Stripe vs local providers (iPay88, Billplz)?
2. **Bar Council:** Timeline and scope of data partnership?
3. **Content Moderation:** Hire moderator or rely on automation?
4. **Singapore Expansion:** When to start? Different domain?
5. **Mobile App:** Native app needed or PWA sufficient?

---

## Appendix A: Famous Cases Data Template

```json
{
  "case": {
    "slug": "1mdb-src-trial-najib-razak",
    "title": "1MDB SRC Trial",
    "subtitle": "RM42 Million Misappropriation",
    "category": "corruption",
    "significance": "The first major trial arising from the 1MDB scandal, resulting in former PM Najib Razak's conviction.",
    "tags": ["1MDB", "corruption", "abuse-of-power", "money-laundering"],

    "prosecution_parties": ["Public Prosecutor"],
    "defense_parties": ["Dato' Sri Mohd Najib bin Hj Abd Razak"],

    "verdict": {
      "outcome": "Guilty on all 7 charges",
      "sentence": "12 years imprisonment, RM210 million fine",
      "date": "2020-07-28"
    },

    "stats": {
      "duration_days": 394,
      "witnesses": 57,
      "court_appearances": 127,
      "charges": 7
    }
  },

  "timeline": [
    {
      "date": "2018-07-04",
      "title": "Najib Arrested",
      "description": "Former PM arrested by MACC at his residence"
    },
    {
      "date": "2019-04-03",
      "title": "Trial Begins",
      "description": "Trial commences at Kuala Lumpur High Court"
    },
    {
      "date": "2020-07-28",
      "title": "Verdict",
      "description": "Found guilty on all 7 charges"
    },
    {
      "date": "2022-08-23",
      "title": "Appeal Dismissed",
      "description": "Court of Appeal upholds conviction"
    },
    {
      "date": "2024-01-00",
      "title": "Federal Court",
      "description": "Final appeal pending"
    }
  ],

  "lawyers": {
    "defense": [
      {
        "name": "Tan Sri Muhammad Shafee Abdullah",
        "role": "lead_defense",
        "firm": "Shafee & Co"
      },
      {
        "name": "Harvinderjit Singh",
        "role": "defense",
        "firm": "Harvinderjit Singh & Co"
      }
    ],
    "prosecution": [
      {
        "name": "Gopal Sri Ram",
        "role": "lead_prosecution",
        "firm": "Attorney General's Chambers"
      },
      {
        "name": "V. Sithambaram",
        "role": "prosecution",
        "firm": "Attorney General's Chambers"
      }
    ]
  }
}
```

---

## Appendix B: Seed Data CSV Format

**lawyers.csv:**
```csv
name,slug,title,bar_membership_no,admission_date,firm_name,city,state,practice_areas,languages,bio,email,phone
"Muhammad Shafee Abdullah","muhammad-shafee-abdullah","Tan Sri","12345","1985-01-15","Shafee & Co","Kuala Lumpur","Wilayah Persekutuan","criminal-defense,corporate","English,Malay","Senior criminal lawyer...","contact@shafee.com","+60123456789"
```

**cases.csv:**
```csv
slug,title,subtitle,category,significance,tags,verdict_outcome,verdict_sentence,verdict_date
"1mdb-src-trial-najib-razak","1MDB SRC Trial","RM42 Million Misappropriation","corruption","First major 1MDB trial...","1MDB,corruption","Guilty on all 7 charges","12 years, RM210M fine","2020-07-28"
```

---

*This PRD is designed to be executed by any LLM/Claude Code agent. Each section provides enough detail for autonomous implementation while maintaining flexibility for real-time decisions.*
