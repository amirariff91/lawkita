import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { lawyers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { ClaimForm } from "@/components/claim";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, BadgeCheck, Building2, MapPin } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ClaimPageProps {
  params: Promise<{ lawyerId: string }>;
}

async function getLawyer(lawyerId: string) {
  const lawyer = await db.query.lawyers.findFirst({
    where: eq(lawyers.id, lawyerId),
    columns: {
      id: true,
      name: true,
      slug: true,
      photo: true,
      firmName: true,
      city: true,
      state: true,
      barMembershipNumber: true,
      isClaimed: true,
      isVerified: true,
    },
  });

  return lawyer;
}

export async function generateMetadata({
  params,
}: ClaimPageProps): Promise<Metadata> {
  const { lawyerId } = await params;
  const lawyer = await getLawyer(lawyerId);

  if (!lawyer) {
    return {
      title: "Lawyer Not Found | LawKita",
    };
  }

  return {
    title: `Claim Profile - ${lawyer.name} | LawKita`,
    description: `Claim and verify your profile as ${lawyer.name} on LawKita, Malaysia's lawyer directory.`,
  };
}

export default async function ClaimPage({ params }: ClaimPageProps) {
  const { lawyerId } = await params;
  const lawyer = await getLawyer(lawyerId);

  if (!lawyer) {
    notFound();
  }

  // If profile is already claimed, show message
  if (lawyer.isClaimed) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-lg mx-auto">
          <Button variant="ghost" asChild className="mb-6">
            <Link href={`/lawyers/${lawyer.slug}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to profile
            </Link>
          </Button>

          <Card>
            <CardHeader>
              <CardTitle>Profile Already Claimed</CardTitle>
              <CardDescription>
                This profile has already been claimed and verified.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                If you believe this is an error or if you are the rightful owner of this profile,
                please contact our support team.
              </p>
              <Button asChild>
                <Link href={`/lawyers/${lawyer.slug}`}>
                  View Profile
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const initials = lawyer.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-lg mx-auto space-y-6">
        {/* Back Link */}
        <Button variant="ghost" asChild>
          <Link href={`/lawyers/${lawyer.slug}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to profile
          </Link>
        </Button>

        {/* Lawyer Preview Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                {lawyer.photo && <AvatarImage src={lawyer.photo} alt={lawyer.name} />}
                <AvatarFallback className="text-lg">{initials}</AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold text-lg">{lawyer.name}</h2>
                  {lawyer.isVerified && (
                    <BadgeCheck className="h-5 w-5 text-blue-500" />
                  )}
                </div>
                {lawyer.firmName && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                    <Building2 className="h-3.5 w-3.5" />
                    {lawyer.firmName}
                  </div>
                )}
                {(lawyer.city || lawyer.state) && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" />
                    {[lawyer.city, lawyer.state].filter(Boolean).join(", ")}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Claim Form */}
        <ClaimForm
          lawyerId={lawyer.id}
          lawyerName={lawyer.name}
          lawyerBarNumber={lawyer.barMembershipNumber}
        />

        {/* Help Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Need Help?</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              If you're having trouble claiming your profile or if the information shown is incorrect,
              please contact our support team.
            </p>
            <p>
              <strong>Not your profile?</strong> If someone else has claimed a profile that belongs to you,
              please report it and we'll investigate.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
