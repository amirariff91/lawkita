import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  decimal,
  uuid,
  jsonb,
  primaryKey,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ============================================================================
// AUTH TABLES (Better Auth)
// ============================================================================

// Import and re-export Better Auth schema tables
import {
  user,
  session,
  account,
  verification,
  userRelations,
  sessionRelations,
  accountRelations,
} from "./auth-schema";

export {
  user,
  session,
  account,
  verification,
  userRelations,
  sessionRelations,
  accountRelations,
};

// ============================================================================
// LAWYER TABLES
// ============================================================================

export const lawyers = pgTable(
  "lawyers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    slug: text("slug").unique().notNull(),

    // Basic Info
    name: text("name").notNull(),
    email: text("email"),
    phone: text("phone"),
    photo: text("photo"),
    bio: text("bio"),

    // Bar Info (scraped)
    barMembershipNumber: text("bar_membership_number").unique(),
    barAdmissionDate: timestamp("bar_admission_date", { mode: "date" }),
    barStatus: text("bar_status", {
      enum: ["active", "inactive", "suspended", "deceased"],
    }).default("active"),

    // Location
    state: text("state"),
    city: text("city"),
    address: text("address"),

    // Firm Info
    primaryFirmId: uuid("primary_firm_id"),
    firmName: text("firm_name"),

    // Status
    isVerified: boolean("is_verified").default(false).notNull(),
    isClaimed: boolean("is_claimed").default(false).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    verifiedAt: timestamp("verified_at", { mode: "date" }),
    claimedAt: timestamp("claimed_at", { mode: "date" }),

    // Subscription
    subscriptionTier: text("subscription_tier", {
      enum: ["free", "premium", "featured"],
    })
      .default("free")
      .notNull(),
    subscriptionExpiresAt: timestamp("subscription_expires_at", { mode: "date" }),

    // Metrics (computed/cached)
    yearsAtBar: integer("years_at_bar"),
    courtAppearances: integer("court_appearances").default(0),
    reviewCount: integer("review_count").default(0),
    averageRating: decimal("average_rating", { precision: 2, scale: 1 }),
    responseRate: decimal("response_rate", { precision: 5, scale: 2 }),
    avgResponseTimeHours: decimal("avg_response_time_hours", { precision: 5, scale: 2 }),

    // Data Source Tracking
    scrapedData: jsonb("scraped_data"), // Original scraped data for conflict resolution
    lastScrapedAt: timestamp("last_scraped_at", { mode: "date" }),

    // Timestamps
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => [
    index("lawyers_state_idx").on(table.state),
    index("lawyers_city_idx").on(table.city),
    index("lawyers_subscription_tier_idx").on(table.subscriptionTier),
    index("lawyers_is_verified_idx").on(table.isVerified),
  ]
);

export const practiceAreas = pgTable("practice_areas", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").unique().notNull(),
  description: text("description"),
  icon: text("icon"), // SVG or icon name
  parentId: uuid("parent_id"),
  level: integer("level").default(1).notNull(), // 1, 2, or 3
  isUserFacing: boolean("is_user_facing").default(true).notNull(),
  seoContent: text("seo_content"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const lawyerPracticeAreas = pgTable(
  "lawyer_practice_areas",
  {
    lawyerId: uuid("lawyer_id")
      .notNull()
      .references(() => lawyers.id, { onDelete: "cascade" }),
    practiceAreaId: uuid("practice_area_id")
      .notNull()
      .references(() => practiceAreas.id, { onDelete: "cascade" }),
    experienceLevel: text("experience_level", {
      enum: ["beginner", "intermediate", "expert"],
    }).default("intermediate"),
    yearsExperience: integer("years_experience"),
  },
  (table) => [
    primaryKey({ columns: [table.lawyerId, table.practiceAreaId] }),
  ]
);

export const lawyerEducation = pgTable("lawyer_education", {
  id: uuid("id").defaultRandom().primaryKey(),
  lawyerId: uuid("lawyer_id")
    .notNull()
    .references(() => lawyers.id, { onDelete: "cascade" }),
  institution: text("institution").notNull(),
  degree: text("degree").notNull(),
  field: text("field"),
  graduationYear: integer("graduation_year"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const lawyerQualifications = pgTable("lawyer_qualifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  lawyerId: uuid("lawyer_id")
    .notNull()
    .references(() => lawyers.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  issuingBody: text("issuing_body"),
  issuedAt: timestamp("issued_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const firms = pgTable("firms", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").unique().notNull(),
  address: text("address"),
  state: text("state"),
  city: text("city"),
  phone: text("phone"),
  email: text("email"),
  website: text("website"),
  subscriptionTier: text("subscription_tier", {
    enum: ["free", "firm_premium"],
  }).default("free"),
  subscriptionExpiresAt: timestamp("subscription_expires_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});

export const lawyerFirms = pgTable(
  "lawyer_firms",
  {
    lawyerId: uuid("lawyer_id")
      .notNull()
      .references(() => lawyers.id, { onDelete: "cascade" }),
    firmId: uuid("firm_id")
      .notNull()
      .references(() => firms.id, { onDelete: "cascade" }),
    isPrimary: boolean("is_primary").default(false).notNull(),
    title: text("title"),
    startDate: timestamp("start_date", { mode: "date" }),
    endDate: timestamp("end_date", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => [primaryKey({ columns: [table.lawyerId, table.firmId] })]
);

// ============================================================================
// FAMOUS CASES TABLES
// ============================================================================

export const cases = pgTable(
  "cases",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").unique().notNull(),

    // Basic Info
    title: text("title").notNull(),
    subtitle: text("subtitle"),
    description: text("description"),
    category: text("category", {
      enum: ["corruption", "political", "corporate", "criminal", "constitutional", "other"],
    }).notNull(),

    // Status
    status: text("status", { enum: ["ongoing", "concluded", "appeal"] })
      .default("ongoing")
      .notNull(),
    isPublished: boolean("is_published").default(false).notNull(),
    isFeatured: boolean("is_featured").default(false).notNull(),

    // Verdict Info
    verdictSummary: text("verdict_summary"),
    verdictDate: timestamp("verdict_date", { mode: "date" }),
    outcome: text("outcome", {
      enum: ["guilty", "not_guilty", "settled", "dismissed", "ongoing", "other"],
    }),

    // Stats
    durationDays: integer("duration_days"),
    witnessCount: integer("witness_count"),
    hearingCount: integer("hearing_count"),
    chargeCount: integer("charge_count"),

    // SEO
    ogImage: text("og_image"),
    metaDescription: text("meta_description"),

    // Tags for filtering
    tags: jsonb("tags").$type<string[]>().default([]),

    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => [
    index("cases_category_idx").on(table.category),
    index("cases_status_idx").on(table.status),
    index("cases_is_published_idx").on(table.isPublished),
  ]
);

export const caseTimeline = pgTable(
  "case_timeline",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    caseId: uuid("case_id")
      .notNull()
      .references(() => cases.id, { onDelete: "cascade" }),
    date: timestamp("date", { mode: "date" }).notNull(),
    title: text("title").notNull(),
    description: text("description"),
    court: text("court"),
    image: text("image"),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => [index("case_timeline_case_id_idx").on(table.caseId)]
);

export const caseLawyers = pgTable(
  "case_lawyers",
  {
    caseId: uuid("case_id")
      .notNull()
      .references(() => cases.id, { onDelete: "cascade" }),
    lawyerId: uuid("lawyer_id")
      .notNull()
      .references(() => lawyers.id, { onDelete: "cascade" }),
    role: text("role", {
      enum: ["prosecution", "defense", "judge", "other"],
    }).notNull(),
    roleDescription: text("role_description"), // e.g., "Lead defense counsel"
    isVerified: boolean("is_verified").default(false).notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => [primaryKey({ columns: [table.caseId, table.lawyerId] })]
);

export const caseMediaReferences = pgTable("case_media_references", {
  id: uuid("id").defaultRandom().primaryKey(),
  caseId: uuid("case_id")
    .notNull()
    .references(() => cases.id, { onDelete: "cascade" }),
  source: text("source").notNull(),
  title: text("title").notNull(),
  url: text("url").notNull(),
  publishedAt: timestamp("published_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const caseSuggestions = pgTable("case_suggestions", {
  id: uuid("id").defaultRandom().primaryKey(),
  caseId: uuid("case_id")
    .notNull()
    .references(() => cases.id, { onDelete: "cascade" }),
  lawyerId: uuid("lawyer_id")
    .notNull()
    .references(() => lawyers.id, { onDelete: "cascade" }),
  suggestionType: text("suggestion_type", {
    enum: ["add_lawyer", "edit_timeline", "edit_info", "other"],
  }).notNull(),
  content: jsonb("content").notNull(),
  status: text("status", { enum: ["pending", "approved", "rejected"] })
    .default("pending")
    .notNull(),
  adminNotes: text("admin_notes"),
  reviewedAt: timestamp("reviewed_at", { mode: "date" }),
  reviewedBy: text("reviewed_by").references(() => user.id),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

// ============================================================================
// REVIEWS & ENDORSEMENTS
// ============================================================================

export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    lawyerId: uuid("lawyer_id")
      .notNull()
      .references(() => lawyers.id, { onDelete: "cascade" }),
    reviewerEmail: text("reviewer_email").notNull(),
    reviewerName: text("reviewer_name"),

    // Ratings (1-5)
    overallRating: integer("overall_rating").notNull(),
    communicationRating: integer("communication_rating"),
    expertiseRating: integer("expertise_rating"),
    responsivenessRating: integer("responsiveness_rating"),
    valueRating: integer("value_rating"),

    // Content
    title: text("title"),
    content: text("content"),
    pros: text("pros"),
    cons: text("cons"),

    // Verification
    verificationDocument: text("verification_document"), // Supabase storage URL
    isVerified: boolean("is_verified").default(false).notNull(),
    verificationStatus: text("verification_status", {
      enum: ["pending", "approved", "rejected", "flagged_for_review"],
    })
      .default("pending")
      .notNull(),
    verificationNotes: text("verification_notes"),
    verifiedAt: timestamp("verified_at", { mode: "date" }),

    // Display
    isPublished: boolean("is_published").default(false).notNull(),

    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => [
    index("reviews_lawyer_id_idx").on(table.lawyerId),
    index("reviews_verification_status_idx").on(table.verificationStatus),
  ]
);

export const endorsements = pgTable(
  "endorsements",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    endorserId: uuid("endorser_id")
      .notNull()
      .references(() => lawyers.id, { onDelete: "cascade" }),
    endorseeId: uuid("endorsee_id")
      .notNull()
      .references(() => lawyers.id, { onDelete: "cascade" }),
    relationship: text("relationship").notNull(),
    yearsKnown: integer("years_known"),
    content: text("content"),
    endorsedPracticeAreas: jsonb("endorsed_practice_areas").$type<string[]>().default([]),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("endorsements_unique_idx").on(table.endorserId, table.endorseeId),
    index("endorsements_endorsee_id_idx").on(table.endorseeId),
  ]
);

// ============================================================================
// ENQUIRIES & MESSAGING
// ============================================================================

export const enquiries = pgTable(
  "enquiries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    lawyerId: uuid("lawyer_id")
      .notNull()
      .references(() => lawyers.id, { onDelete: "cascade" }),

    // Sender Info
    senderName: text("sender_name").notNull(),
    senderEmail: text("sender_email").notNull(),
    senderPhone: text("sender_phone"),
    isEmailVerified: boolean("is_email_verified").default(false).notNull(),

    // Enquiry Details
    caseType: text("case_type"),
    urgency: text("urgency", { enum: ["low", "medium", "high", "urgent"] }).default("medium"),
    description: text("description").notNull(),

    // Additional enquiry fields (per spec)
    budgetRange: text("budget_range", {
      enum: ["under_5k", "5k_to_20k", "above_20k", "not_specified"],
    }).default("not_specified"),
    timeline: text("timeline", {
      enum: ["court_date_soon", "ready_to_hire", "just_researching", "not_specified"],
    }).default("not_specified"),
    isFirstLawyer: boolean("is_first_lawyer"), // Is this their first lawyer for this matter?

    // Status
    status: text("status", {
      enum: ["pending", "viewed", "responded", "closed"],
    })
      .default("pending")
      .notNull(),

    // Metrics
    viewedAt: timestamp("viewed_at", { mode: "date" }),
    firstResponseAt: timestamp("first_response_at", { mode: "date" }),
    responseTimeHours: decimal("response_time_hours", { precision: 8, scale: 2 }),

    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => [
    index("enquiries_lawyer_id_idx").on(table.lawyerId),
    index("enquiries_status_idx").on(table.status),
  ]
);

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    enquiryId: uuid("enquiry_id")
      .notNull()
      .references(() => enquiries.id, { onDelete: "cascade" }),
    senderId: uuid("sender_id"), // null for visitors
    senderType: text("sender_type", { enum: ["visitor", "lawyer"] }).notNull(),
    content: text("content").notNull(),
    isRead: boolean("is_read").default(false).notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => [index("messages_enquiry_id_idx").on(table.enquiryId)]
);

// ============================================================================
// CLAIMS & VERIFICATION
// ============================================================================

export const claims = pgTable(
  "claims",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    lawyerId: uuid("lawyer_id")
      .notNull()
      .references(() => lawyers.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),

    // Claim Info
    barMembershipNumber: text("bar_membership_number").notNull(),
    firmEmail: text("firm_email"),

    // Verification
    verificationMethod: text("verification_method", {
      enum: ["bar_lookup", "email", "document"],
    }),
    verificationDocument: text("verification_document"),
    status: text("status", {
      enum: ["pending", "email_sent", "verified", "rejected", "expired"],
    })
      .default("pending")
      .notNull(),
    rejectionReason: text("rejection_reason"),

    // Email Verification
    emailVerificationToken: text("email_verification_token"),
    emailVerificationExpires: timestamp("email_verification_expires", { mode: "date" }),

    // Admin
    reviewedBy: text("reviewed_by").references(() => user.id),
    reviewedAt: timestamp("reviewed_at", { mode: "date" }),
    adminNotes: text("admin_notes"),

    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
    expiresAt: timestamp("expires_at", { mode: "date" }), // 30-day window
  },
  (table) => [
    index("claims_lawyer_id_idx").on(table.lawyerId),
    index("claims_status_idx").on(table.status),
  ]
);

// ============================================================================
// SUBSCRIPTIONS & PAYMENTS
// ============================================================================

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    lawyerId: uuid("lawyer_id").references(() => lawyers.id, { onDelete: "cascade" }),
    firmId: uuid("firm_id").references(() => firms.id, { onDelete: "cascade" }),

    // Stripe
    stripeCustomerId: text("stripe_customer_id"),
    stripeSubscriptionId: text("stripe_subscription_id"),
    stripePriceId: text("stripe_price_id"),

    // Plan
    tier: text("tier", {
      enum: ["free", "premium", "featured", "firm_premium"],
    }).notNull(),
    billingPeriod: text("billing_period", { enum: ["monthly", "annual"] }),

    // Status
    status: text("status", {
      enum: ["active", "past_due", "canceled", "expired", "grace_period"],
    })
      .default("active")
      .notNull(),

    // Dates
    currentPeriodStart: timestamp("current_period_start", { mode: "date" }),
    currentPeriodEnd: timestamp("current_period_end", { mode: "date" }),
    canceledAt: timestamp("canceled_at", { mode: "date" }),
    graceEndsAt: timestamp("grace_ends_at", { mode: "date" }),

    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => [
    index("subscriptions_lawyer_id_idx").on(table.lawyerId),
    index("subscriptions_stripe_customer_id_idx").on(table.stripeCustomerId),
  ]
);

// ============================================================================
// ANALYTICS
// ============================================================================

export const profileViews = pgTable(
  "profile_views",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    lawyerId: uuid("lawyer_id")
      .notNull()
      .references(() => lawyers.id, { onDelete: "cascade" }),
    visitorId: text("visitor_id"), // anonymous identifier
    source: text("source"), // referrer
    searchQuery: text("search_query"),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => [
    index("profile_views_lawyer_id_idx").on(table.lawyerId),
    index("profile_views_created_at_idx").on(table.createdAt),
  ]
);

export const searchImpressions = pgTable(
  "search_impressions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    lawyerId: uuid("lawyer_id")
      .notNull()
      .references(() => lawyers.id, { onDelete: "cascade" }),
    searchQuery: text("search_query"),
    position: integer("position"),
    clicked: boolean("clicked").default(false),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => [
    index("search_impressions_lawyer_id_idx").on(table.lawyerId),
    index("search_impressions_created_at_idx").on(table.createdAt),
  ]
);

// ============================================================================
// AUDIT LOG
// ============================================================================

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    action: text("action").notNull(), // e.g., "claim.approve", "review.reject"
    entityType: text("entity_type").notNull(), // e.g., "claim", "review", "lawyer"
    entityId: uuid("entity_id"),
    beforeData: jsonb("before_data"),
    afterData: jsonb("after_data"),
    metadata: jsonb("metadata"),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => [
    index("audit_logs_entity_idx").on(table.entityType, table.entityId),
    index("audit_logs_user_id_idx").on(table.userId),
    index("audit_logs_created_at_idx").on(table.createdAt),
  ]
);

// ============================================================================
// LOCATIONS (Reference)
// ============================================================================

export const states = pgTable("states", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").unique().notNull(),
  code: text("code").unique(), // e.g., "KL", "SLG"
});

export const cities = pgTable(
  "cities",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    stateId: uuid("state_id")
      .notNull()
      .references(() => states.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
  },
  (table) => [
    uniqueIndex("cities_state_slug_idx").on(table.stateId, table.slug),
  ]
);

// ============================================================================
// A/B TESTING
// ============================================================================

export const experiments = pgTable("experiments", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  variants: jsonb("variants").$type<{ id: string; name: string; weight: number }[]>().notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  startedAt: timestamp("started_at", { mode: "date" }),
  endedAt: timestamp("ended_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const experimentAssignments = pgTable(
  "experiment_assignments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    experimentId: uuid("experiment_id")
      .notNull()
      .references(() => experiments.id, { onDelete: "cascade" }),
    visitorId: text("visitor_id").notNull(),
    variantId: text("variant_id").notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("experiment_assignments_unique_idx").on(table.experimentId, table.visitorId),
  ]
);

export const experimentConversions = pgTable("experiment_conversions", {
  id: uuid("id").defaultRandom().primaryKey(),
  assignmentId: uuid("assignment_id")
    .notNull()
    .references(() => experimentAssignments.id, { onDelete: "cascade" }),
  conversionType: text("conversion_type").notNull(), // e.g., "profile_view", "enquiry"
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

// ============================================================================
// RELATIONS
// ============================================================================

export const lawyersRelations = relations(lawyers, ({ one, many }) => ({
  user: one(user, {
    fields: [lawyers.userId],
    references: [user.id],
  }),
  primaryFirm: one(firms, {
    fields: [lawyers.primaryFirmId],
    references: [firms.id],
  }),
  practiceAreas: many(lawyerPracticeAreas),
  education: many(lawyerEducation),
  qualifications: many(lawyerQualifications),
  firms: many(lawyerFirms),
  reviews: many(reviews),
  enquiries: many(enquiries),
  cases: many(caseLawyers),
  endorsementsGiven: many(endorsements, { relationName: "endorser" }),
  endorsementsReceived: many(endorsements, { relationName: "endorsee" }),
  profileViews: many(profileViews),
  searchImpressions: many(searchImpressions),
}));

export const practiceAreasRelations = relations(practiceAreas, ({ one, many }) => ({
  parent: one(practiceAreas, {
    fields: [practiceAreas.parentId],
    references: [practiceAreas.id],
  }),
  children: many(practiceAreas),
  lawyers: many(lawyerPracticeAreas),
}));

export const casesRelations = relations(cases, ({ many }) => ({
  timeline: many(caseTimeline),
  lawyers: many(caseLawyers),
  mediaReferences: many(caseMediaReferences),
  suggestions: many(caseSuggestions),
}));

export const enquiriesRelations = relations(enquiries, ({ one, many }) => ({
  lawyer: one(lawyers, {
    fields: [enquiries.lawyerId],
    references: [lawyers.id],
  }),
  messages: many(messages),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  lawyer: one(lawyers, {
    fields: [reviews.lawyerId],
    references: [lawyers.id],
  }),
}));

export const endorsementsRelations = relations(endorsements, ({ one }) => ({
  endorser: one(lawyers, {
    fields: [endorsements.endorserId],
    references: [lawyers.id],
    relationName: "endorser",
  }),
  endorsee: one(lawyers, {
    fields: [endorsements.endorseeId],
    references: [lawyers.id],
    relationName: "endorsee",
  }),
}));

export const statesRelations = relations(states, ({ many }) => ({
  cities: many(cities),
}));

export const citiesRelations = relations(cities, ({ one }) => ({
  state: one(states, {
    fields: [cities.stateId],
    references: [states.id],
  }),
}));
