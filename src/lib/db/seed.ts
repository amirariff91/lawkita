import { db } from "./index";
import {
  lawyers,
  practiceAreas,
  lawyerPracticeAreas,
  lawyerEducation,
  reviews,
  states,
  cities,
  cases,
  caseTimeline,
  caseLawyers,
  caseMediaReferences,
} from "./schema";
import { eq } from "drizzle-orm";
import { PRACTICE_AREAS, flattenPracticeAreas } from "@/lib/constants/practice-areas";
import { MALAYSIAN_STATES } from "@/lib/constants/locations";

// Seed function for development
export async function seed() {
  console.log("Seeding database...");

  // Seed states and cities
  console.log("Seeding states and cities...");
  for (const state of MALAYSIAN_STATES) {
    const [insertedState] = await db
      .insert(states)
      .values({
        name: state.name,
        slug: state.slug,
        code: state.code,
      })
      .onConflictDoNothing()
      .returning();

    if (insertedState) {
      for (const city of state.cities) {
        await db
          .insert(cities)
          .values({
            stateId: insertedState.id,
            name: city.name,
            slug: city.slug,
          })
          .onConflictDoNothing();
      }
    }
  }

  // Seed practice areas
  console.log("Seeding practice areas...");
  const flatAreas = flattenPracticeAreas();
  const practiceAreaMap = new Map<string, string>();

  // First pass: insert all areas
  for (const area of flatAreas) {
    const [inserted] = await db
      .insert(practiceAreas)
      .values({
        name: area.name,
        slug: area.slug,
        description: area.description,
        icon: area.icon,
        level: area.level,
        isUserFacing: area.isUserFacing,
      })
      .onConflictDoNothing()
      .returning();

    if (inserted) {
      practiceAreaMap.set(area.slug, inserted.id);
    }
  }

  // Second pass: update parent relationships
  for (const area of flatAreas) {
    if (area.parentSlug) {
      const parentId = practiceAreaMap.get(area.parentSlug);
      const areaId = practiceAreaMap.get(area.slug);
      if (parentId && areaId) {
        await db
          .update(practiceAreas)
          .set({ parentId })
          .where(eq(practiceAreas.id, areaId));
      }
    }
  }

  // Sample lawyers for development
  console.log("Seeding sample lawyers...");
  const sampleLawyers = [
    {
      name: "Ahmad bin Abdullah",
      slug: "ahmad-bin-abdullah-kuala-lumpur",
      bio: "Experienced criminal defense attorney with over 15 years of practice. Specializes in high-profile cases and corporate criminal defense.",
      state: "Kuala Lumpur",
      city: "Kuala Lumpur City Centre",
      firmName: "Ahmad & Partners Legal Firm",
      isVerified: true,
      isClaimed: true,
      subscriptionTier: "featured" as const,
      yearsAtBar: 15,
      reviewCount: 24,
      averageRating: "4.8",
      responseRate: "92.5",
      barMembershipNumber: "BC12345",
      email: "ahmad@ahmadpartners.com.my",
      phone: "+60123456789",
    },
    {
      name: "Sarah Tan Wei Ling",
      slug: "sarah-tan-wei-ling-petaling-jaya",
      bio: "Family law specialist dedicated to helping families navigate divorce, custody, and estate matters with compassion and expertise.",
      state: "Selangor",
      city: "Petaling Jaya",
      firmName: "Tan & Associates",
      isVerified: true,
      isClaimed: true,
      subscriptionTier: "premium" as const,
      yearsAtBar: 10,
      reviewCount: 18,
      averageRating: "4.6",
      responseRate: "88.0",
      barMembershipNumber: "BC23456",
      email: "sarah@tanassociates.com.my",
    },
    {
      name: "Raj Kumar a/l Subramaniam",
      slug: "raj-kumar-subramaniam-george-town",
      bio: "Corporate and commercial law expert. Advises on M&A, joint ventures, and corporate restructuring for both local and international clients.",
      state: "Penang",
      city: "George Town",
      firmName: "Kumar Legal Advisory",
      isVerified: true,
      isClaimed: false,
      subscriptionTier: "free" as const,
      yearsAtBar: 20,
      reviewCount: 31,
      averageRating: "4.9",
      barMembershipNumber: "BC34567",
    },
    {
      name: "Nor Azizah binti Hassan",
      slug: "nor-azizah-hassan-johor-bahru",
      bio: "Syariah law practitioner with extensive experience in Islamic family law, inheritance (faraid), and waqf matters.",
      state: "Johor",
      city: "Johor Bahru",
      firmName: "Azizah & Co",
      isVerified: true,
      isClaimed: true,
      subscriptionTier: "premium" as const,
      yearsAtBar: 12,
      reviewCount: 15,
      averageRating: "4.7",
      responseRate: "95.0",
      barMembershipNumber: "BC45678",
    },
    {
      name: "David Wong Chee Keong",
      slug: "david-wong-chee-keong-kuching",
      bio: "Intellectual property specialist focusing on patents, trademarks, and copyright protection for technology companies.",
      state: "Sarawak",
      city: "Kuching",
      firmName: "Wong IP Law",
      isVerified: false,
      isClaimed: false,
      subscriptionTier: "free" as const,
      yearsAtBar: 8,
      reviewCount: 7,
      averageRating: "4.3",
      barMembershipNumber: "BC56789",
    },
    {
      name: "Fatimah binti Osman",
      slug: "fatimah-osman-shah-alam",
      bio: "Experienced property and conveyancing lawyer. Has handled thousands of property transactions throughout her career.",
      state: "Selangor",
      city: "Shah Alam",
      firmName: "Fatimah Osman Chambers",
      isVerified: true,
      isClaimed: true,
      subscriptionTier: "featured" as const,
      yearsAtBar: 18,
      reviewCount: 42,
      averageRating: "4.5",
      responseRate: "78.5",
      barMembershipNumber: "BC67890",
      email: "fatimah@folaw.com.my",
      phone: "+60198765432",
    },
  ];

  const insertedLawyers: { id: string; name: string }[] = [];

  for (const lawyerData of sampleLawyers) {
    const [inserted] = await db
      .insert(lawyers)
      .values(lawyerData)
      .onConflictDoNothing()
      .returning({ id: lawyers.id, name: lawyers.name });

    if (inserted) {
      insertedLawyers.push(inserted);
    }
  }

  // Assign practice areas to lawyers
  console.log("Assigning practice areas...");
  const practiceAreaAssignments = [
    { lawyerIndex: 0, areas: ["criminal-law", "white-collar-crime"] },
    { lawyerIndex: 1, areas: ["family-law", "divorce-separation", "child-custody"] },
    { lawyerIndex: 2, areas: ["corporate-commercial", "mergers-acquisitions"] },
    { lawyerIndex: 3, areas: ["family-law", "syariah-family-law", "wills-estate"] },
    { lawyerIndex: 4, areas: ["intellectual-property", "trademarks", "patents"] },
    { lawyerIndex: 5, areas: ["property-real-estate", "conveyancing"] },
  ];

  for (const assignment of practiceAreaAssignments) {
    const lawyer = insertedLawyers[assignment.lawyerIndex];
    if (!lawyer) continue;

    for (const areaSlug of assignment.areas) {
      const areaId = practiceAreaMap.get(areaSlug);
      if (areaId) {
        await db
          .insert(lawyerPracticeAreas)
          .values({
            lawyerId: lawyer.id,
            practiceAreaId: areaId,
            experienceLevel: "expert",
            yearsExperience: Math.floor(Math.random() * 10) + 5,
          })
          .onConflictDoNothing();
      }
    }
  }

  // Add education for lawyers
  console.log("Adding education...");
  const universities = [
    { institution: "University of Malaya", degree: "Bachelor of Laws (LLB)" },
    { institution: "International Islamic University Malaysia", degree: "Bachelor of Laws (LLB)" },
    { institution: "University of London", degree: "Bachelor of Laws (LLB)" },
    { institution: "National University of Singapore", degree: "Bachelor of Laws (LLB)" },
  ];

  for (const lawyer of insertedLawyers) {
    const uni = universities[Math.floor(Math.random() * universities.length)];
    await db
      .insert(lawyerEducation)
      .values({
        lawyerId: lawyer.id,
        institution: uni.institution,
        degree: uni.degree,
        field: "Law",
        graduationYear: 2024 - Math.floor(Math.random() * 15) - 5,
      })
      .onConflictDoNothing();
  }

  // Add sample reviews
  console.log("Adding sample reviews...");
  const reviewTemplates = [
    { title: "Excellent service", content: "Very professional and responsive. Handled my case efficiently.", rating: 5 },
    { title: "Highly recommended", content: "Great experience working with this lawyer. Very knowledgeable.", rating: 5 },
    { title: "Good experience", content: "Helped me understand my options clearly. Would recommend.", rating: 4 },
    { title: "Professional service", content: "Timely responses and good communication throughout.", rating: 4 },
    { title: "Satisfied client", content: "The case was resolved favorably. Thank you!", rating: 5 },
  ];

  for (const lawyer of insertedLawyers) {
    const numReviews = Math.floor(Math.random() * 3) + 1;
    for (let i = 0; i < numReviews; i++) {
      const template = reviewTemplates[Math.floor(Math.random() * reviewTemplates.length)];
      await db
        .insert(reviews)
        .values({
          lawyerId: lawyer.id,
          reviewerEmail: `reviewer${i}@example.com`,
          reviewerName: `Client ${i + 1}`,
          overallRating: template.rating,
          communicationRating: Math.floor(Math.random() * 2) + 4,
          expertiseRating: Math.floor(Math.random() * 2) + 4,
          responsivenessRating: Math.floor(Math.random() * 2) + 4,
          valueRating: Math.floor(Math.random() * 2) + 4,
          title: template.title,
          content: template.content,
          isVerified: true,
          verificationStatus: "approved",
          isPublished: true,
        })
        .onConflictDoNothing();
    }
  }

  // Seed famous cases
  console.log("Seeding famous cases...");
  const sampleCases = [
    {
      slug: "1mdb-scandal",
      title: "1MDB Scandal",
      subtitle: "Malaysia's Largest Financial Scandal",
      description: `The 1Malaysia Development Berhad (1MDB) scandal is one of the largest financial scandals in history. The case involves allegations of money laundering, bribery, and misappropriation of billions of dollars from Malaysia's state investment fund. Former Prime Minister Najib Razak was found guilty of corruption charges related to the scandal and sentenced to 12 years in prison.`,
      category: "corruption" as const,
      status: "appeal" as const,
      isPublished: true,
      isFeatured: true,
      verdictSummary: "Najib Razak found guilty on all 7 charges including abuse of power, criminal breach of trust, and money laundering. Sentenced to 12 years imprisonment and fined RM210 million.",
      verdictDate: new Date("2022-08-23"),
      outcome: "guilty" as const,
      durationDays: 1095,
      witnessCount: 57,
      hearingCount: 134,
      chargeCount: 7,
      tags: ["1MDB", "Corruption", "Money Laundering", "Najib Razak", "SRC International"],
    },
    {
      slug: "altantuya-murder-case",
      title: "Altantuya Shaariibuu Murder",
      subtitle: "High-Profile Murder Case Involving Political Figures",
      description: `The murder of Mongolian national Altantuya Shaariibuu in 2006 became one of Malaysia's most controversial criminal cases. Two police officers from the Special Actions Unit were convicted of her murder. The case gained international attention due to alleged connections to Malaysia's political establishment and defense procurement deals.`,
      category: "criminal" as const,
      status: "concluded" as const,
      isPublished: true,
      isFeatured: true,
      verdictSummary: "Sirul Azhar Umar and Azilah Hadri convicted of murder and sentenced to death. Azilah's sentence was later commuted to 40 years imprisonment.",
      verdictDate: new Date("2015-01-13"),
      outcome: "guilty" as const,
      durationDays: 2920,
      witnessCount: 42,
      hearingCount: 98,
      chargeCount: 1,
      tags: ["Murder", "Political", "Altantuya", "Death Penalty"],
    },
    {
      slug: "anwar-ibrahim-sodomy-case",
      title: "Anwar Ibrahim Sodomy Case",
      subtitle: "Politically-Charged Legal Battle",
      description: `Former Deputy Prime Minister Anwar Ibrahim faced sodomy charges in what became one of Malaysia's most divisive legal battles. The case was widely seen as politically motivated. After years of legal proceedings, Anwar was acquitted by the Federal Court, allowing him to later become Prime Minister.`,
      category: "political" as const,
      status: "concluded" as const,
      isPublished: true,
      isFeatured: true,
      verdictSummary: "Anwar Ibrahim acquitted of all charges by the Federal Court. The court ruled the evidence was insufficient to sustain the conviction.",
      verdictDate: new Date("2018-09-14"),
      outcome: "not_guilty" as const,
      durationDays: 3650,
      witnessCount: 31,
      hearingCount: 85,
      chargeCount: 1,
      tags: ["Anwar Ibrahim", "Political", "Sodomy", "Federal Court"],
    },
    {
      slug: "rosmah-solar-project-corruption",
      title: "Rosmah Mansor Solar Project Case",
      subtitle: "Former First Lady Corruption Trial",
      description: `Rosmah Mansor, wife of former Prime Minister Najib Razak, was charged with soliciting and receiving bribes totaling RM6.5 million related to a solar energy project for rural schools in Sarawak. The case highlighted issues of corruption in government procurement.`,
      category: "corruption" as const,
      status: "appeal" as const,
      isPublished: true,
      isFeatured: false,
      verdictSummary: "Found guilty of soliciting and receiving bribes. Sentenced to 10 years imprisonment and fined RM970 million.",
      verdictDate: new Date("2022-09-01"),
      outcome: "guilty" as const,
      durationDays: 730,
      witnessCount: 23,
      hearingCount: 54,
      chargeCount: 3,
      tags: ["Corruption", "Rosmah Mansor", "Solar Project", "Bribery"],
    },
    {
      slug: "zahid-hamidi-corruption-trial",
      title: "Ahmad Zahid Hamidi Corruption Trial",
      subtitle: "UMNO President Faces Multiple Charges",
      description: `Deputy Prime Minister and UMNO President Ahmad Zahid Hamidi faces 47 charges including criminal breach of trust, corruption, and money laundering involving millions of ringgit from charitable foundation Yayasan Akalbudi. The trial is ongoing.`,
      category: "corruption" as const,
      status: "ongoing" as const,
      isPublished: true,
      isFeatured: false,
      outcome: "ongoing" as const,
      chargeCount: 47,
      tags: ["Corruption", "Zahid Hamidi", "UMNO", "Yayasan Akalbudi"],
    },
  ];

  const insertedCases: { id: string; slug: string }[] = [];

  for (const caseData of sampleCases) {
    const [inserted] = await db
      .insert(cases)
      .values(caseData)
      .onConflictDoNothing()
      .returning({ id: cases.id, slug: cases.slug });

    if (inserted) {
      insertedCases.push(inserted);
    }
  }

  // Add timeline events for 1MDB case
  const mdbCase = insertedCases.find((c) => c.slug === "1mdb-scandal");
  if (mdbCase) {
    const timelineEvents = [
      {
        caseId: mdbCase.id,
        date: new Date("2009-09-25"),
        title: "1MDB Established",
        description: "1Malaysia Development Berhad is established as a strategic development company.",
        sortOrder: 1,
      },
      {
        caseId: mdbCase.id,
        date: new Date("2015-07-02"),
        title: "Wall Street Journal Report",
        description: "WSJ reports nearly $700 million transferred to Najib's personal accounts.",
        sortOrder: 2,
      },
      {
        caseId: mdbCase.id,
        date: new Date("2018-07-03"),
        title: "Najib Arrested",
        description: "Former PM Najib Razak arrested by MACC on corruption charges.",
        sortOrder: 3,
      },
      {
        caseId: mdbCase.id,
        date: new Date("2019-04-03"),
        title: "Trial Begins",
        description: "The first of multiple trials begins at the Kuala Lumpur High Court.",
        sortOrder: 4,
      },
      {
        caseId: mdbCase.id,
        date: new Date("2020-07-28"),
        title: "Found Guilty",
        description: "High Court finds Najib guilty on all 7 charges in the SRC International case.",
        sortOrder: 5,
      },
      {
        caseId: mdbCase.id,
        date: new Date("2022-08-23"),
        title: "Federal Court Upholds Conviction",
        description: "Federal Court unanimously upholds conviction and 12-year sentence. Najib begins prison term.",
        sortOrder: 6,
      },
    ];

    for (const event of timelineEvents) {
      await db.insert(caseTimeline).values(event).onConflictDoNothing();
    }

    // Link first lawyer (criminal law expert) to 1MDB case
    if (insertedLawyers[0]) {
      await db
        .insert(caseLawyers)
        .values({
          caseId: mdbCase.id,
          lawyerId: insertedLawyers[0].id,
          role: "defense" as const,
          roleDescription: "Lead defense counsel",
          isVerified: false,
        })
        .onConflictDoNothing();
    }

    // Add media references
    await db
      .insert(caseMediaReferences)
      .values([
        {
          caseId: mdbCase.id,
          source: "The Wall Street Journal",
          title: "Investigation Into Malaysian Fund Finds $1 Billion Diverted",
          url: "https://www.wsj.com/articles/1mdb-probe-jho-low-1477956855",
          publishedAt: new Date("2016-11-01"),
        },
        {
          caseId: mdbCase.id,
          source: "Reuters",
          title: "Malaysia's Najib found guilty in 1MDB-linked case",
          url: "https://www.reuters.com/article/us-malaysia-politics-najib-idUSKCN24T0AD",
          publishedAt: new Date("2020-07-28"),
        },
      ])
      .onConflictDoNothing();
  }

  // Add timeline for Anwar case
  const anwarCase = insertedCases.find((c) => c.slug === "anwar-ibrahim-sodomy-case");
  if (anwarCase) {
    const timelineEvents = [
      {
        caseId: anwarCase.id,
        date: new Date("2008-06-28"),
        title: "Police Report Filed",
        description: "Saiful Bukhari Azlan files a police report against Anwar Ibrahim.",
        sortOrder: 1,
      },
      {
        caseId: anwarCase.id,
        date: new Date("2012-01-09"),
        title: "High Court Acquittal",
        description: "Judge Mohamad Zabidin Mohd Diah acquits Anwar of sodomy charges.",
        sortOrder: 2,
      },
      {
        caseId: anwarCase.id,
        date: new Date("2014-03-07"),
        title: "Court of Appeal Overturns",
        description: "Court of Appeal overturns acquittal, finds Anwar guilty and sentences him to 5 years.",
        sortOrder: 3,
      },
      {
        caseId: anwarCase.id,
        date: new Date("2015-02-10"),
        title: "Federal Court Upholds",
        description: "Federal Court upholds the conviction. Anwar begins serving 5-year sentence.",
        sortOrder: 4,
      },
      {
        caseId: anwarCase.id,
        date: new Date("2018-05-16"),
        title: "Royal Pardon",
        description: "Anwar receives full royal pardon following Pakatan Harapan's election victory.",
        sortOrder: 5,
      },
    ];

    for (const event of timelineEvents) {
      await db.insert(caseTimeline).values(event).onConflictDoNothing();
    }
  }

  console.log("Seeding complete!");
}

// Run seed if called directly
seed().catch(console.error);
