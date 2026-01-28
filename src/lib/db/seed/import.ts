/**
 * 1MDB Cases & Lawyers Seed Data Import Script
 *
 * Populates the LawKita database with comprehensive 1MDB-related case data
 * and lawyer profiles to demonstrate the case-lawyer linking feature.
 *
 * Usage: bun run db:seed:1mdb
 */

import { db } from "../index";
import {
  lawyers,
  cases,
  caseTimeline,
  caseLawyers,
  caseMediaReferences,
  practiceAreas,
  lawyerPracticeAreas,
} from "../schema";
import { eq } from "drizzle-orm";

// Import JSON fixtures
import srcInternationalData from "./cases/src-international.json";
import tanoreData from "./cases/1mdb-tanore.json";
import auditTamperingData from "./cases/audit-tampering.json";
import rosmahSolarData from "./cases/rosmah-solar.json";

import defenseCounsel from "./lawyers/defense-counsel.json";
import prosecutionTeam from "./lawyers/prosecution.json";
import judgesData from "./lawyers/judges.json";

import relationshipsData from "./relationships/case-lawyers.json";

// Type definitions for JSON data
interface CaseData {
  case: {
    slug: string;
    title: string;
    subtitle: string;
    description: string;
    category: "corruption" | "political" | "corporate" | "criminal" | "constitutional" | "other";
    status: "ongoing" | "concluded" | "appeal";
    isPublished: boolean;
    isFeatured: boolean;
    verdictSummary?: string;
    verdictDate?: string;
    outcome?: "guilty" | "not_guilty" | "settled" | "dismissed" | "ongoing" | "other";
    durationDays?: number;
    witnessCount?: number;
    hearingCount?: number;
    chargeCount?: number;
    metaDescription?: string;
    tags: string[];
  };
  timeline: {
    date: string;
    title: string;
    description: string;
    court?: string;
    sortOrder: number;
  }[];
  mediaReferences: {
    source: string;
    title: string;
    url: string;
    publishedAt: string;
    type: string;
  }[];
}

interface LawyerData {
  slug: string;
  name: string;
  bio: string;
  firmName?: string;
  state: string;
  city: string;
  barStatus: "active" | "inactive" | "suspended" | "deceased";
  isVerified: boolean;
  isClaimed: boolean;
  subscriptionTier: "free" | "premium" | "featured";
  yearsAtBar: number;
  courtAppearances?: number;
  practiceAreas: string[];
  isJudge?: boolean;
  courtPosition?: string;
}

interface CaseLawyerRelationship {
  caseSlug: string;
  lawyerSlug: string;
  role: "prosecution" | "defense" | "judge" | "other";
  roleDescription: string;
}

// Track IDs for relationships
const caseIdMap = new Map<string, string>();
const lawyerIdMap = new Map<string, string>();

async function seedCase(caseData: CaseData): Promise<void> {
  console.log(`  Seeding case: ${caseData.case.title}`);

  // Insert or get existing case
  const existingCase = await db
    .select({ id: cases.id })
    .from(cases)
    .where(eq(cases.slug, caseData.case.slug))
    .limit(1);

  let caseId: string;

  if (existingCase.length > 0) {
    caseId = existingCase[0].id;
    console.log(`    Case already exists, using existing ID`);
  } else {
    const [insertedCase] = await db
      .insert(cases)
      .values({
        slug: caseData.case.slug,
        title: caseData.case.title,
        subtitle: caseData.case.subtitle,
        description: caseData.case.description,
        category: caseData.case.category,
        status: caseData.case.status,
        isPublished: caseData.case.isPublished,
        isFeatured: caseData.case.isFeatured,
        verdictSummary: caseData.case.verdictSummary,
        verdictDate: caseData.case.verdictDate ? new Date(caseData.case.verdictDate) : undefined,
        outcome: caseData.case.outcome,
        durationDays: caseData.case.durationDays,
        witnessCount: caseData.case.witnessCount,
        hearingCount: caseData.case.hearingCount,
        chargeCount: caseData.case.chargeCount,
        metaDescription: caseData.case.metaDescription,
        tags: caseData.case.tags,
      })
      .returning({ id: cases.id });

    caseId = insertedCase.id;
    console.log(`    Created case with ID: ${caseId}`);
  }

  caseIdMap.set(caseData.case.slug, caseId);

  // Seed timeline events
  console.log(`    Adding ${caseData.timeline.length} timeline events`);
  for (const event of caseData.timeline) {
    await db
      .insert(caseTimeline)
      .values({
        caseId,
        date: new Date(event.date),
        title: event.title,
        description: event.description,
        court: event.court,
        sortOrder: event.sortOrder,
      })
      .onConflictDoNothing();
  }

  // Seed media references
  console.log(`    Adding ${caseData.mediaReferences.length} media references`);
  for (const media of caseData.mediaReferences) {
    await db
      .insert(caseMediaReferences)
      .values({
        caseId,
        source: media.source,
        title: media.title,
        url: media.url,
        publishedAt: media.publishedAt ? new Date(media.publishedAt) : undefined,
      })
      .onConflictDoNothing();
  }
}

async function seedLawyer(lawyerData: LawyerData): Promise<void> {
  console.log(`  Seeding lawyer: ${lawyerData.name}`);

  // Check if lawyer already exists
  const existingLawyer = await db
    .select({ id: lawyers.id })
    .from(lawyers)
    .where(eq(lawyers.slug, lawyerData.slug))
    .limit(1);

  let lawyerId: string;

  if (existingLawyer.length > 0) {
    lawyerId = existingLawyer[0].id;
    console.log(`    Lawyer already exists, using existing ID`);
  } else {
    // Generate a placeholder bar membership number for unclaimed profiles
    const barNumber = `1MDB-${lawyerData.slug.toUpperCase().slice(0, 6)}`;

    const [insertedLawyer] = await db
      .insert(lawyers)
      .values({
        slug: lawyerData.slug,
        name: lawyerData.name,
        bio: lawyerData.bio,
        firmName: lawyerData.firmName,
        state: lawyerData.state,
        city: lawyerData.city,
        barStatus: lawyerData.barStatus,
        isVerified: lawyerData.isVerified,
        isClaimed: lawyerData.isClaimed,
        subscriptionTier: lawyerData.subscriptionTier,
        yearsAtBar: lawyerData.yearsAtBar,
        courtAppearances: lawyerData.courtAppearances || 0,
        barMembershipNumber: barNumber,
      })
      .returning({ id: lawyers.id });

    lawyerId = insertedLawyer.id;
    console.log(`    Created lawyer with ID: ${lawyerId}`);

    // Assign practice areas
    if (lawyerData.practiceAreas && lawyerData.practiceAreas.length > 0) {
      for (const areaSlug of lawyerData.practiceAreas) {
        const [area] = await db
          .select({ id: practiceAreas.id })
          .from(practiceAreas)
          .where(eq(practiceAreas.slug, areaSlug))
          .limit(1);

        if (area) {
          await db
            .insert(lawyerPracticeAreas)
            .values({
              lawyerId,
              practiceAreaId: area.id,
              experienceLevel: "expert",
              yearsExperience: lawyerData.yearsAtBar,
            })
            .onConflictDoNothing();
        }
      }
    }
  }

  lawyerIdMap.set(lawyerData.slug, lawyerId);
}

async function seedCaseLawyerRelationships(
  relationships: CaseLawyerRelationship[]
): Promise<void> {
  console.log(`\nSeeding ${relationships.length} case-lawyer relationships...`);

  for (const rel of relationships) {
    const caseId = caseIdMap.get(rel.caseSlug);
    const lawyerId = lawyerIdMap.get(rel.lawyerSlug);

    if (!caseId) {
      console.log(`  Warning: Case not found: ${rel.caseSlug}`);
      continue;
    }

    if (!lawyerId) {
      console.log(`  Warning: Lawyer not found: ${rel.lawyerSlug}`);
      continue;
    }

    await db
      .insert(caseLawyers)
      .values({
        caseId,
        lawyerId,
        role: rel.role,
        roleDescription: rel.roleDescription,
        isVerified: false, // All relationships start unverified
      })
      .onConflictDoNothing();

    console.log(`  Linked: ${rel.lawyerSlug} -> ${rel.caseSlug} (${rel.role})`);
  }
}

async function main() {
  console.log("=".repeat(60));
  console.log("1MDB Cases & Lawyers Seed Data Import");
  console.log("=".repeat(60));

  try {
    // Seed cases
    console.log("\n[1/4] Seeding cases...");
    const casesData: CaseData[] = [
      srcInternationalData as CaseData,
      tanoreData as CaseData,
      auditTamperingData as CaseData,
      rosmahSolarData as CaseData,
    ];

    for (const caseData of casesData) {
      await seedCase(caseData);
    }
    console.log(`  Total cases: ${casesData.length}`);

    // Seed lawyers
    console.log("\n[2/4] Seeding defense counsel...");
    for (const lawyer of defenseCounsel as LawyerData[]) {
      await seedLawyer(lawyer);
    }

    console.log("\n[3/4] Seeding prosecution team...");
    for (const lawyer of prosecutionTeam as LawyerData[]) {
      await seedLawyer(lawyer);
    }

    console.log("\n[4/4] Seeding judges...");
    for (const judge of judgesData as LawyerData[]) {
      await seedLawyer(judge);
    }

    const totalLawyers =
      defenseCounsel.length + prosecutionTeam.length + judgesData.length;
    console.log(`  Total lawyers: ${totalLawyers}`);

    // Seed relationships
    await seedCaseLawyerRelationships(
      relationshipsData.relationships as CaseLawyerRelationship[]
    );

    console.log("\n" + "=".repeat(60));
    console.log("Seed completed successfully!");
    console.log("=".repeat(60));

    // Summary
    console.log("\nSummary:");
    console.log(`  - Cases: ${casesData.length}`);
    console.log(`  - Lawyers: ${totalLawyers}`);
    console.log(`  - Relationships: ${relationshipsData.relationships.length}`);

    console.log("\nVerification URLs:");
    console.log("  - /cases/najib-src-international-rm42m");
    console.log("  - /cases/najib-1mdb-tanore-rm2-28b");
    console.log("  - /cases/1mdb-audit-tampering");
    console.log("  - /cases/rosmah-solar-project-corruption");
    console.log("  - /lawyers/muhammad-shafee-abdullah");
    console.log("  - /lawyers/gopal-sri-ram");
    console.log("  - /lawyers/tengku-maimun-tuan-mat");
  } catch (error) {
    console.error("\nError during seed:", error);
    process.exit(1);
  }
}

// Run the seed
main().catch(console.error);
