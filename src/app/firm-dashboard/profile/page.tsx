import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getUserFirm } from "@/lib/db/queries/firms";
import { FirmProfileForm } from "@/components/firms/firm-profile-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function FirmProfilePage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/auth/signin?callbackUrl=/firm-dashboard/profile");
  }

  const firm = await getUserFirm(session.user.id);

  if (!firm) {
    redirect("/firms");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Firm Profile</h1>
        <p className="text-muted-foreground mt-1">
          Update your firm's information
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>
            This information will be displayed on your public firm profile
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FirmProfileForm firm={firm} />
        </CardContent>
      </Card>
    </div>
  );
}
