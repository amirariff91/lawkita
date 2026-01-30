import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { lawyers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  User,
  MessageSquare,
  BarChart3,
  Settings,
  CreditCard,
  ArrowLeft,
} from "lucide-react";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/profile", label: "Profile", icon: User },
  { href: "/dashboard/enquiries", label: "Enquiries", icon: MessageSquare },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/dashboard/subscription", label: "Subscription", icon: CreditCard },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/auth/signin?callbackUrl=/dashboard");
  }

  // Get the user's lawyer profile
  const lawyer = await db.query.lawyers.findFirst({
    where: eq(lawyers.userId, session.user.id),
    columns: {
      id: true,
      name: true,
      slug: true,
      isVerified: true,
      isClaimed: true,
      subscriptionTier: true,
    },
  });

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to site
              </Link>
            </Button>
            <span className="font-semibold">Lawyer Dashboard</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {session.user.email}
            </span>
          </div>
        </div>
      </header>

      <div className="container mx-auto flex gap-8 px-4 py-6">
        {/* Sidebar Navigation */}
        <aside className="hidden md:block w-56 shrink-0">
          <nav className="sticky top-20 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}

            {/* View Profile Link */}
            {lawyer && (
              <div className="pt-4 mt-4 border-t">
                <Link
                  href={`/lawyers/${lawyer.slug}`}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  <User className="h-4 w-4" />
                  View Public Profile
                </Link>
              </div>
            )}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0">
          {!lawyer ? (
            <div className="rounded-lg border bg-background p-8 text-center">
              <h2 className="text-xl font-semibold mb-2">No Lawyer Profile Found</h2>
              <p className="text-muted-foreground mb-4">
                You need to claim a lawyer profile to access the dashboard.
              </p>
              <Button asChild>
                <Link href="/lawyers">Find Your Profile</Link>
              </Button>
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}
