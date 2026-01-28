"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import {
  Menu,
  Scale,
  Search,
  Gavel,
  Briefcase,
  LogIn,
  UserPlus,
  LayoutDashboard,
  User,
  LogOut,
} from "lucide-react";

interface MobileNavProps {
  session: {
    user: {
      id: string;
      name: string;
      email: string;
      image?: string | null | undefined;
    };
  } | null;
}

const navigation = [
  { name: "Find a Lawyer", href: "/lawyers", icon: Search },
  { name: "Famous Cases", href: "/cases", icon: Gavel },
  { name: "Practice Areas", href: "/lawyers/practice-area", icon: Briefcase },
];

export function MobileNav({ session }: MobileNavProps) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden size-11">
          <Menu className="size-5" aria-hidden="true" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[300px] sm:w-[350px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Scale className="size-5 text-primary" aria-hidden="true" />
            <span>LawKita</span>
          </SheetTitle>
        </SheetHeader>

        <nav className="flex flex-col gap-2 mt-6">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <item.icon className="size-4" aria-hidden="true" />
              {item.name}
            </Link>
          ))}
        </nav>

        <Separator className="my-6" />

        {session ? (
          <div className="flex flex-col gap-2">
            <div className="px-3 py-2">
              <p className="text-sm font-medium">{session.user.name}</p>
              <p className="text-xs text-muted-foreground">
                {session.user.email}
              </p>
            </div>
            <Separator className="my-2" />
            <Link
              href="/dashboard"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <LayoutDashboard className="size-4" aria-hidden="true" />
              Dashboard
            </Link>
            <Link
              href="/dashboard/profile"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <User className="size-4" aria-hidden="true" />
              Profile
            </Link>
            <Separator className="my-2" />
            <Link
              href="/api/auth/signout"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <LogOut className="size-4" aria-hidden="true" />
              Sign out
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <Button variant="outline" asChild className="justify-start">
              <Link href="/auth/signin" onClick={() => setOpen(false)}>
                <LogIn className="mr-2 size-4" aria-hidden="true" />
                Sign in
              </Link>
            </Button>
            <Button asChild className="justify-start">
              <Link href="/auth/signup" onClick={() => setOpen(false)}>
                <UserPlus className="mr-2 size-4" aria-hidden="true" />
                Get Started
              </Link>
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
