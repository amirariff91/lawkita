import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { createServerSupabaseClient } from "@/lib/supabase/client";
import { ClaimFirmForm } from "@/components/firms/claim-firm-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Building2, MapPin, Users } from "lucide-react";

interface ClaimFirmPageProps {
  params: Promise<{ firmId: string }>;
}

async function getFirm(firmId: string) {
  const supabase = createServerSupabaseClient();

  const { data: firm } = await supabase
    .from("firms")
    .select("id, name, slug, address, city, state, is_claimed, lawyer_count")
    .eq("id", firmId)
    .single();

  return firm;
}

export async function generateMetadata({
  params,
}: ClaimFirmPageProps): Promise<Metadata> {
  const { firmId } = await params;
  const firm = await getFirm(firmId);

  if (!firm) {
    return {
      title: "Firm Not Found | LawKita",
    };
  }

  return {
    title: `Claim ${firm.name} | LawKita`,
    description: `Claim and manage your firm profile for ${firm.name} on LawKita, Malaysia's lawyer directory.`,
  };
}

export default async function ClaimFirmPage({ params }: ClaimFirmPageProps) {
  const { firmId } = await params;
  const firm = await getFirm(firmId);

  if (!firm) {
    notFound();
  }

  // If firm is already claimed, show message
  if (firm.is_claimed) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-lg mx-auto">
          <Button variant="ghost" asChild className="mb-6">
            <Link href={`/firms/${firm.slug}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to firm profile
            </Link>
          </Button>

          <Card>
            <CardHeader>
              <CardTitle>Firm Already Claimed</CardTitle>
              <CardDescription>
                This firm profile has already been claimed and verified.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                If you believe this is an error or if you are the rightful owner of this firm,
                please contact our support team.
              </p>
              <Button asChild>
                <Link href={`/firms/${firm.slug}`}>
                  View Firm Profile
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const location = [firm.city, firm.state].filter(Boolean).join(", ");

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-lg mx-auto space-y-6">
        {/* Back Link */}
        <Button variant="ghost" asChild>
          <Link href={`/firms/${firm.slug}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to firm profile
          </Link>
        </Button>

        {/* Firm Preview Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <Building2 className="size-8 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold text-lg">{firm.name}</h2>
                {location && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {location}
                  </div>
                )}
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Users className="h-3.5 w-3.5" />
                  {firm.lawyer_count ?? 0} {(firm.lawyer_count ?? 0) === 1 ? "lawyer" : "lawyers"}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Claim Form */}
        <ClaimFirmForm firmId={firm.id} firmName={firm.name} />

        {/* Help Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Need Help?</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              If you're having trouble claiming your firm profile or if the information shown is incorrect,
              please contact our support team.
            </p>
            <p>
              <strong>Who can claim a firm?</strong> Managing Partners, firm administrators, or authorized
              representatives with proof of authority can claim a firm profile.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
