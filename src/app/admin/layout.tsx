import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  MessageSquareWarning,
  UserCheck,
  FileText,
  Users,
  Briefcase,
  Scale,
  ArrowLeft,
  Settings,
} from "lucide-react";

interface AdminLayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/reviews", label: "Reviews", icon: MessageSquareWarning },
  { href: "/admin/claims", label: "Claims", icon: UserCheck },
  { href: "/admin/content/lawyers", label: "Lawyers", icon: Users },
  { href: "/admin/content/cases", label: "Cases", icon: Scale },
  { href: "/admin/content/practice-areas", label: "Practice Areas", icon: Briefcase },
  { href: "/admin/content/pages", label: "Pages", icon: FileText },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export default async function AdminLayout({ children }: AdminLayoutProps) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/sign-in?callbackUrl=/admin");
  }

  // Check if user is admin
  const currentUser = await db.query.user.findFirst({
    where: eq(user.id, session.user.id),
    columns: { role: true },
  });

  if (currentUser?.role !== "admin") {
    redirect("/?error=unauthorized");
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-slate-900 text-white">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" className="text-white hover:text-white hover:bg-slate-800" asChild>
              <Link href="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to site
              </Link>
            </Button>
            <span className="font-semibold text-red-400">Admin Panel</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400">
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
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}
