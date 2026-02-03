import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getUserFirm } from "@/lib/db/queries/firms";
import { createServerSupabaseClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BadgeCheck, MapPin, Clock, ExternalLink } from "lucide-react";

export default async function FirmLawyersPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/auth/signin?callbackUrl=/firm-dashboard/lawyers");
  }

  const firm = await getUserFirm(session.user.id);

  if (!firm) {
    redirect("/firms");
  }

  const supabase = createServerSupabaseClient();

  // Get all lawyers at this firm
  const { data: lawyers } = await supabase
    .from("lawyers")
    .select(`
      id,
      slug,
      name,
      photo,
      state,
      city,
      is_verified,
      is_claimed,
      years_at_bar,
      subscription_tier
    `)
    .eq("primary_firm_id", firm.id)
    .eq("is_active", true)
    .order("years_at_bar", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Lawyers at {firm.name}</h1>
        <p className="text-muted-foreground mt-1">
          {lawyers?.length ?? 0} lawyers associated with your firm
        </p>
      </div>

      {lawyers && lawyers.length > 0 ? (
        <div className="grid gap-4">
          {lawyers.map((lawyer) => {
            const initials = lawyer.name
              .split(" ")
              .map((n: string) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2);
            const location = [lawyer.city, lawyer.state].filter(Boolean).join(", ");

            return (
              <Card key={lawyer.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-12 w-12">
                        {lawyer.photo && <AvatarImage src={lawyer.photo} alt={lawyer.name} />}
                        <AvatarFallback>{initials}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/lawyers/${lawyer.slug}`}
                            className="font-semibold hover:underline"
                          >
                            {lawyer.name}
                          </Link>
                          {lawyer.is_verified && (
                            <BadgeCheck className="h-4 w-4 text-blue-500" />
                          )}
                          {lawyer.subscription_tier === "premium" && (
                            <Badge variant="secondary" className="text-xs">Premium</Badge>
                          )}
                          {lawyer.subscription_tier === "featured" && (
                            <Badge className="bg-amber-500 text-xs">Featured</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                          {location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {location}
                            </span>
                          )}
                          {lawyer.years_at_bar && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {lawyer.years_at_bar} years
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!lawyer.is_claimed && (
                        <Badge variant="outline">Unclaimed</Badge>
                      )}
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/lawyers/${lawyer.slug}`}>
                          <ExternalLink className="h-4 w-4 mr-1" />
                          View Profile
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No lawyers are currently associated with your firm.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Lawyers will appear here once they claim their profiles and associate with your firm.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">About Lawyer Associations</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            Lawyers are automatically associated with your firm based on their bar registration information.
          </p>
          <p>
            <strong>Unclaimed profiles</strong> can be claimed by the lawyers themselves to manage their information.
          </p>
          <p>
            If you notice incorrect lawyer associations, please contact our support team.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
