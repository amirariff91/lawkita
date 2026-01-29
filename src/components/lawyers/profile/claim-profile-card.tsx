import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserCheck, Shield, BarChart3, MessageSquare } from "lucide-react";

interface ClaimProfileCardProps {
  lawyerId: string;
  lawyerName: string;
}

export function ClaimProfileCard({ lawyerId, lawyerName }: ClaimProfileCardProps) {
  return (
    <Card className="border-dashed border-2 border-primary/30 bg-primary/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserCheck className="size-5 text-primary" aria-hidden="true" />
          Is this your profile?
        </CardTitle>
        <CardDescription>
          Claim this profile to manage your information and connect with potential clients.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid sm:grid-cols-3 gap-4 mb-6">
          <div className="flex items-start gap-3">
            <Shield className="size-5 text-muted-foreground shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="font-medium text-sm">Get Verified</p>
              <p className="text-xs text-muted-foreground">
                Add a verified badge to your profile
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <MessageSquare className="size-5 text-muted-foreground shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="font-medium text-sm">Receive Enquiries</p>
              <p className="text-xs text-muted-foreground">
                Get notified when clients reach out
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <BarChart3 className="size-5 text-muted-foreground shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="font-medium text-sm">Track Analytics</p>
              <p className="text-xs text-muted-foreground">
                See how many people view your profile
              </p>
            </div>
          </div>
        </div>

        <Button asChild className="w-full sm:w-auto">
          <Link href={`/claim/${lawyerId}`}>Claim This Profile</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
