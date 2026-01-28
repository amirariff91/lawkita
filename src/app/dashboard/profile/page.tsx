import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { lawyers, practiceAreas, lawyerPracticeAreas } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfileEditForm } from "@/components/dashboard/profile-edit-form";

export default async function ProfileEditPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) return null;

  // Get the user's lawyer profile with practice areas
  const lawyer = await db.query.lawyers.findFirst({
    where: eq(lawyers.userId, session.user.id),
    with: {
      practiceAreas: {
        with: {
          practiceArea: true,
        },
      },
    },
  });

  if (!lawyer) return null;

  // Get all practice areas for the form
  const allPracticeAreas = await db.query.practiceAreas.findMany({
    where: eq(practiceAreas.isUserFacing, true),
    orderBy: (practiceAreas, { asc }) => [asc(practiceAreas.name)],
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Edit Profile</h1>
        <p className="text-muted-foreground">
          Update your profile information to attract more clients
        </p>
      </div>

      <ProfileEditForm
        lawyer={lawyer}
        allPracticeAreas={allPracticeAreas}
      />
    </div>
  );
}
