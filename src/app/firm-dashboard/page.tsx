import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getUserFirm } from "@/lib/db/queries/firms";
import { createServerSupabaseClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, Users, Clock, ArrowRight, Edit, Crown } from "lucide-react";

export default async function FirmDashboardPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/auth/signin?callbackUrl=/firm-dashboard");
  }

  const firm = await getUserFirm(session.user.id);

  if (!firm) {
    redirect("/firms");
  }

  const supabase = createServerSupabaseClient();

  // Get recent lawyer activity
  const { data: recentLawyers } = await supabase
    .from("lawyers")
    .select("id, name, slug, years_at_bar")
    .eq("primary_firm_id", firm.id)
    .eq("is_active", true)
    .order("updated_at", { ascending: false })
    .limit(5);

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{firm.name}</h1>
          <p className="text-muted-foreground mt-1">
            Manage your firm profile and team
          </p>
        </div>
        <div className="flex items-center gap-2">
          {firm.subscriptionTier === "firm_premium" ? (
            <Badge className="bg-amber-500">
              <Crown className="h-3 w-3 mr-1" />
              Premium
            </Badge>
          ) : (
            <Button size="sm" asChild>
              <Link href="/firm-dashboard/subscription">
                Upgrade to Premium
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Users className="size-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{firm.lawyerCount}</p>
                <p className="text-sm text-muted-foreground">
                  {firm.lawyerCount === 1 ? "Lawyer" : "Lawyers"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <Clock className="size-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {firm.avgYearsExperience !== null
                    ? firm.avgYearsExperience.toFixed(1)
                    : "—"}
                </p>
                <p className="text-sm text-muted-foreground">Avg. Years Exp.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <Building2 className="size-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold capitalize">
                  {firm.subscriptionTier === "firm_premium" ? "Premium" : "Free"}
                </p>
                <p className="text-sm text-muted-foreground">Plan</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 gap-4">
            <Button variant="outline" asChild className="justify-start h-auto py-4">
              <Link href="/firm-dashboard/profile">
                <Edit className="h-5 w-5 mr-3" />
                <div className="text-left">
                  <div className="font-medium">Edit Profile</div>
                  <div className="text-xs text-muted-foreground">
                    Update firm information
                  </div>
                </div>
              </Link>
            </Button>

            <Button variant="outline" asChild className="justify-start h-auto py-4">
              <Link href="/firm-dashboard/lawyers">
                <Users className="h-5 w-5 mr-3" />
                <div className="text-left">
                  <div className="font-medium">View Lawyers</div>
                  <div className="text-xs text-muted-foreground">
                    See all {firm.lawyerCount} lawyers
                  </div>
                </div>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Lawyers */}
      {recentLawyers && recentLawyers.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Lawyers at Your Firm</CardTitle>
              <CardDescription>
                Recently updated profiles
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/firm-dashboard/lawyers">
                View all
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentLawyers.map((lawyer) => (
                <div
                  key={lawyer.id}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div>
                    <Link
                      href={`/lawyers/${lawyer.slug}`}
                      className="font-medium hover:underline"
                    >
                      {lawyer.name}
                    </Link>
                    {lawyer.years_at_bar && (
                      <p className="text-xs text-muted-foreground">
                        {lawyer.years_at_bar} years at bar
                      </p>
                    )}
                  </div>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/lawyers/${lawyer.slug}`}>
                      View
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Profile Completion */}
      {(!firm.description || !firm.phone || !firm.email) && (
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
          <CardHeader>
            <CardTitle className="text-lg">Complete Your Profile</CardTitle>
            <CardDescription>
              Add more information to help potential clients find you
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {!firm.description && (
                <li className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  Add a firm description
                </li>
              )}
              {!firm.phone && (
                <li className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  Add phone number
                </li>
              )}
              {!firm.email && (
                <li className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  Add email address
                </li>
              )}
              {!firm.logo && (
                <li className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  Upload firm logo
                </li>
              )}
            </ul>
            <Button className="mt-4" asChild>
              <Link href="/firm-dashboard/profile">
                Complete Profile
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
