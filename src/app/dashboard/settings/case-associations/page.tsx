import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { lawyers, caseLawyers, cases } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CaseAssociationsSettings } from "./case-associations-settings";

export default async function CaseAssociationsPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) return null;

  // Get the user's lawyer profile
  const lawyer = await db.query.lawyers.findFirst({
    where: eq(lawyers.userId, session.user.id),
  });

  if (!lawyer) return null;

  // Get current case associations for this lawyer
  const associations = await db
    .select({
      caseId: caseLawyers.caseId,
      role: caseLawyers.role,
      roleDescription: caseLawyers.roleDescription,
      isVerified: caseLawyers.isVerified,
      confidenceScore: caseLawyers.confidenceScore,
      sourceType: caseLawyers.sourceType,
      createdAt: caseLawyers.createdAt,
      case: {
        slug: cases.slug,
        title: cases.title,
        category: cases.category,
        status: cases.status,
      },
    })
    .from(caseLawyers)
    .innerJoin(cases, eq(caseLawyers.caseId, cases.id))
    .where(eq(caseLawyers.lawyerId, lawyer.id))
    .orderBy(desc(caseLawyers.createdAt));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Case Associations</h1>
        <p className="text-muted-foreground">
          Manage how your profile appears on case pages
        </p>
      </div>

      <CaseAssociationsSettings
        lawyerId={lawyer.id}
        optedOut={lawyer.caseAssociationOptOut}
        associations={associations}
      />
    </div>
  );
}
