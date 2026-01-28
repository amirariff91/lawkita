import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { BadgeCheck, Scale, Shield, Gavel, UserCircle } from "lucide-react";
import type { CaseLawyerWithDetails, LawyerRole } from "@/types/case";

interface CaseLawyersProps {
  lawyers: CaseLawyerWithDetails[];
}

const roleIcons: Record<LawyerRole, React.ReactNode> = {
  prosecution: <Shield className="size-4" />,
  defense: <Scale className="size-4" />,
  judge: <Gavel className="size-4" />,
  other: <UserCircle className="size-4" />,
};

const roleColors: Record<LawyerRole, string> = {
  prosecution: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  defense: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  judge: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  other: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300",
};

const roleLabels: Record<LawyerRole, string> = {
  prosecution: "Prosecution",
  defense: "Defense",
  judge: "Presiding Judge",
  other: "Other",
};

function LawyerCard({ lawyer }: { lawyer: CaseLawyerWithDetails }) {
  const initials = lawyer.lawyer.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <Link href={`/lawyers/${lawyer.lawyer.slug}`}>
      <div className="flex items-start gap-3 p-3 rounded-lg border hover:border-primary/20 hover:bg-muted/50 transition-all">
        <div className="relative shrink-0">
          <Avatar className="size-12">
            <AvatarImage src={lawyer.lawyer.photo ?? undefined} alt={lawyer.lawyer.name} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          {lawyer.lawyer.isVerified && (
            <div className="absolute -bottom-1 -right-1 rounded-full bg-background p-0.5">
              <BadgeCheck className="size-3 text-primary" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h4 className="font-medium text-sm">{lawyer.lawyer.name}</h4>
              {lawyer.lawyer.firmName && (
                <p className="text-xs text-muted-foreground truncate">
                  {lawyer.lawyer.firmName}
                </p>
              )}
            </div>
            <Badge variant="secondary" className={`shrink-0 gap-1 text-xs ${roleColors[lawyer.role]}`}>
              {roleIcons[lawyer.role]}
              {roleLabels[lawyer.role]}
            </Badge>
          </div>
          {lawyer.roleDescription && (
            <p className="text-xs text-muted-foreground mt-1">
              {lawyer.roleDescription}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}

export function CaseLawyers({ lawyers }: CaseLawyersProps) {
  if (lawyers.length === 0) {
    return null;
  }

  // Group lawyers by role
  const prosecution = lawyers.filter((l) => l.role === "prosecution");
  const defense = lawyers.filter((l) => l.role === "defense");
  const judges = lawyers.filter((l) => l.role === "judge");
  const others = lawyers.filter((l) => l.role === "other");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Legal Teams</CardTitle>
        <p className="text-sm text-muted-foreground">
          Lawyers who appeared in this case. Appearance does not imply endorsement.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Legal Disclaimer */}
        <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg border border-muted">
          <p className="font-medium mb-1">Legal Notice</p>
          <p>
            Information presented is compiled from public court records, official statements, and
            reputable news sources. This content is provided for informational and educational
            purposes regarding matters of public interest. Appearance of any legal professional does
            not imply endorsement of any party, position, or outcome. All persons are presumed
            innocent until proven guilty in a court of law. For official records, please refer to
            the Malaysian Judiciary portal.
          </p>
        </div>

        {/* Prosecution */}
        {prosecution.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Shield className="size-4 text-red-600" />
              Prosecution Team
            </h3>
            <div className="grid sm:grid-cols-2 gap-2">
              {prosecution.map((lawyer) => (
                <LawyerCard key={lawyer.lawyerId} lawyer={lawyer} />
              ))}
            </div>
          </div>
        )}

        {/* Defense */}
        {defense.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Scale className="size-4 text-blue-600" />
              Defense Team
            </h3>
            <div className="grid sm:grid-cols-2 gap-2">
              {defense.map((lawyer) => (
                <LawyerCard key={lawyer.lawyerId} lawyer={lawyer} />
              ))}
            </div>
          </div>
        )}

        {/* Judges */}
        {judges.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Gavel className="size-4 text-purple-600" />
              Presiding Judge(s)
            </h3>
            <div className="grid sm:grid-cols-2 gap-2">
              {judges.map((lawyer) => (
                <LawyerCard key={lawyer.lawyerId} lawyer={lawyer} />
              ))}
            </div>
          </div>
        )}

        {/* Others */}
        {others.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <UserCircle className="size-4 text-gray-600" />
              Other Participants
            </h3>
            <div className="grid sm:grid-cols-2 gap-2">
              {others.map((lawyer) => (
                <LawyerCard key={lawyer.lawyerId} lawyer={lawyer} />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
