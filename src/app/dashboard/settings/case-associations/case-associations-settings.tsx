"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Shield,
  Scale,
  Gavel,
  UserCircle,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import type { LawyerRole, SourceType } from "@/types/case";
import { updateCaseAssociationOptOut } from "./actions";

interface CaseAssociation {
  caseId: string;
  role: string;
  roleDescription: string | null;
  isVerified: boolean;
  confidenceScore: string | null;
  sourceType: string | null;
  createdAt: Date;
  case: {
    slug: string;
    title: string;
    category: string;
    status: string;
  };
}

interface CaseAssociationsSettingsProps {
  lawyerId: string;
  optedOut: boolean;
  associations: CaseAssociation[];
}

const roleIcons: Record<LawyerRole, React.ReactNode> = {
  prosecution: <Shield className="size-4" />,
  defense: <Scale className="size-4" />,
  judge: <Gavel className="size-4" />,
  other: <UserCircle className="size-4" />,
};

const roleLabels: Record<LawyerRole, string> = {
  prosecution: "Prosecution",
  defense: "Defense",
  judge: "Judge",
  other: "Other",
};

const roleColors: Record<LawyerRole, string> = {
  prosecution: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  defense: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  judge: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  other: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300",
};

const sourceLabels: Record<SourceType, string> = {
  court_record: "Court Record",
  bar_council: "Bar Council",
  law_firm: "Law Firm",
  news: "News Article",
  manual: "Manual Entry",
};

export function CaseAssociationsSettings({
  lawyerId,
  optedOut,
  associations,
}: CaseAssociationsSettingsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isOptedOut, setIsOptedOut] = useState(optedOut);

  const handleOptOutChange = async (checked: boolean) => {
    startTransition(async () => {
      const result = await updateCaseAssociationOptOut(lawyerId, checked);
      if (result.success) {
        setIsOptedOut(checked);
        router.refresh();
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Opt-out Toggle */}
      <Card>
        <CardHeader>
          <CardTitle>Visibility Settings</CardTitle>
          <CardDescription>
            Control whether your profile appears on case pages
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="opt-out" className="text-base">
                Hide from case pages
              </Label>
              <p className="text-sm text-muted-foreground">
                When enabled, your profile will not appear on any case pages. This does
                not delete the association data, just hides it from public view.
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Switch
                  id="opt-out"
                  checked={isOptedOut}
                  disabled={isPending}
                />
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {isOptedOut ? "Show on case pages?" : "Hide from case pages?"}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {isOptedOut
                      ? "Your profile will appear on case pages where you are associated. This can help potential clients find you through high-profile cases."
                      : "Your profile will be hidden from all case pages. This will not delete the association data, and you can reverse this at any time."}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => handleOptOutChange(!isOptedOut)}
                    disabled={isPending}
                  >
                    {isPending ? "Updating..." : "Confirm"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          {isOptedOut && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200 rounded-lg text-sm">
              <AlertTriangle className="size-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">You are currently hidden from case pages</p>
                <p className="text-amber-700 dark:text-amber-300">
                  Potential clients searching for lawyers with case experience won&apos;t
                  find you through case pages. Toggle this setting to re-appear.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Current Associations */}
      <Card>
        <CardHeader>
          <CardTitle>Your Case Associations</CardTitle>
          <CardDescription>
            Cases where you have been identified as participating.
            {associations.length > 0
              ? ` You are associated with ${associations.length} case${associations.length > 1 ? "s" : ""}.`
              : " No case associations found."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {associations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No case associations found.</p>
              <p className="text-sm mt-1">
                When you appear in court records or news coverage, associations will
                appear here automatically.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {associations.map((assoc) => (
                <div
                  key={assoc.caseId}
                  className="flex items-start justify-between gap-4 p-4 border rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Link
                        href={`/cases/${assoc.case.slug}`}
                        className="font-medium hover:text-primary hover:underline truncate"
                      >
                        {assoc.case.title}
                      </Link>
                      <ExternalLink className="size-3 text-muted-foreground shrink-0" />
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <Badge
                        variant="secondary"
                        className={`gap-1 ${roleColors[assoc.role as LawyerRole]}`}
                      >
                        {roleIcons[assoc.role as LawyerRole]}
                        {roleLabels[assoc.role as LawyerRole]}
                      </Badge>

                      {assoc.isVerified && (
                        <Badge variant="outline" className="gap-1 text-green-700">
                          <CheckCircle2 className="size-3" />
                          Verified
                        </Badge>
                      )}

                      {assoc.sourceType && (
                        <Badge variant="outline" className="text-muted-foreground">
                          {sourceLabels[assoc.sourceType as SourceType] ||
                            assoc.sourceType}
                        </Badge>
                      )}
                    </div>

                    {assoc.roleDescription && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {assoc.roleDescription}
                      </p>
                    )}
                  </div>

                  {assoc.confidenceScore && (
                    <div className="text-right shrink-0">
                      <span className="text-xs text-muted-foreground">Confidence</span>
                      <p className="text-sm font-medium">
                        {Math.round(Number(assoc.confidenceScore) * 100)}%
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Information Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">About Case Associations</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm dark:prose-invert max-w-none">
          <p>
            Case associations are compiled from public court records, official
            statements, and reputable news sources. This information is provided for
            informational and educational purposes regarding matters of public interest.
          </p>
          <p>
            Appearing on a case page can help potential clients find you when searching
            for lawyers with relevant experience. However, you have full control over
            your visibility on these pages.
          </p>
          <p>
            If you believe any association is incorrect, please{" "}
            <Link href="/contact" className="text-primary hover:underline">
              contact us
            </Link>{" "}
            with supporting documentation for review.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
