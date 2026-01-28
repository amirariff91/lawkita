import { headers } from "next/headers";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { lawyers, enquiries } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  MessageSquare,
  Clock,
  Mail,
  Phone,
  Calendar,
  ArrowRight,
  Inbox,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default async function EnquiriesPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) return null;

  // Get the user's lawyer profile
  const lawyer = await db.query.lawyers.findFirst({
    where: eq(lawyers.userId, session.user.id),
    columns: { id: true, subscriptionTier: true },
  });

  if (!lawyer) return null;

  // Get enquiries
  const lawyerEnquiries = await db.query.enquiries.findMany({
    where: eq(enquiries.lawyerId, lawyer.id),
    orderBy: [desc(enquiries.createdAt)],
    limit: 50,
  });

  const isPremium = lawyer.subscriptionTier !== "free";

  const statusColors: Record<string, string> = {
    pending: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
    viewed: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    responded: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    closed: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  };

  const urgencyColors: Record<string, string> = {
    low: "text-green-600",
    medium: "text-amber-600",
    high: "text-orange-600",
    urgent: "text-red-600",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Enquiries</h1>
        <p className="text-muted-foreground">
          Manage and respond to client enquiries
        </p>
      </div>

      {lawyerEnquiries.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Inbox className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-2">No Enquiries Yet</h3>
            <p className="text-muted-foreground max-w-md">
              When potential clients send you enquiries through your profile,
              they will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {lawyerEnquiries.map((enquiry) => (
            <Card key={enquiry.id}>
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      {isPremium ? (
                        enquiry.senderName
                      ) : (
                        <span className="blur-sm select-none">Hidden Name</span>
                      )}
                      <Badge
                        variant="secondary"
                        className={statusColors[enquiry.status]}
                      >
                        {enquiry.status}
                      </Badge>
                    </CardTitle>
                    <CardDescription className="flex items-center gap-4 mt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDistanceToNow(new Date(enquiry.createdAt), {
                          addSuffix: true,
                        })}
                      </span>
                      {enquiry.urgency && (
                        <span className={`flex items-center gap-1 ${urgencyColors[enquiry.urgency]}`}>
                          <Clock className="h-3 w-3" />
                          {enquiry.urgency.charAt(0).toUpperCase() + enquiry.urgency.slice(1)} urgency
                        </span>
                      )}
                    </CardDescription>
                  </div>
                  <Badge variant="outline">{enquiry.caseType || "General"}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {enquiry.description}
                </p>

                {isPremium ? (
                  <div className="flex flex-wrap gap-4 text-sm">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      {enquiry.senderEmail}
                    </div>
                    {enquiry.senderPhone && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Phone className="h-4 w-4" />
                        {enquiry.senderPhone}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium">Upgrade to Premium</span> to see
                      contact details and respond to enquiries.
                    </p>
                    <Button asChild size="sm" className="mt-2">
                      <Link href="/dashboard/subscription">
                        Upgrade Now
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                )}

                {isPremium && enquiry.status === "pending" && (
                  <div className="flex gap-2">
                    <Button size="sm">
                      <MessageSquare className="mr-2 h-4 w-4" />
                      Respond
                    </Button>
                    <Button size="sm" variant="outline">
                      Mark as Viewed
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
