import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getUserFirm } from "@/lib/db/queries/firms";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Building2,
  Users,
  BarChart3,
  CreditCard,
  ArrowLeft,
} from "lucide-react";

interface FirmDashboardLayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { href: "/firm-dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/firm-dashboard/profile", label: "Firm Profile", icon: Building2 },
  { href: "/firm-dashboard/lawyers", label: "Lawyers", icon: Users },
  { href: "/firm-dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/firm-dashboard/subscription", label: "Subscription", icon: CreditCard },
];

export default async function FirmDashboardLayout({ children }: FirmDashboardLayoutProps) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/auth/signin?callbackUrl=/firm-dashboard");
  }

  // Get the user's firm
  const firm = await getUserFirm(session.user.id);

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
            <span className="font-semibold">Firm Dashboard</span>
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

            {/* View Firm Profile Link */}
            {firm && (
              <div className="pt-4 mt-4 border-t">
                <Link
                  href={`/firms/${firm.slug}`}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  <Building2 className="h-4 w-4" />
                  View Public Profile
                </Link>
              </div>
            )}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0">
          {!firm ? (
            <div className="rounded-lg border bg-background p-8 text-center">
              <h2 className="text-xl font-semibold mb-2">No Firm Profile Found</h2>
              <p className="text-muted-foreground mb-4">
                You need to claim a firm profile to access the firm dashboard.
              </p>
              <Button asChild>
                <Link href="/firms">Find Your Firm</Link>
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
