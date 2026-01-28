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
  MenuNav,
  ScalesJustice,
  SearchLegal,
  GavelCases,
  BriefcaseLegal,
  LogIn,
  UserPlus,
  DashboardGrid,
  UserProfile,
  Logout,
} from "@/components/icons";

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
  { name: "Find a Lawyer", href: "/lawyers", icon: SearchLegal },
  { name: "Famous Cases", href: "/cases", icon: GavelCases },
  { name: "Practice Areas", href: "/lawyers/practice-area", icon: BriefcaseLegal },
];

export function MobileNav({ session }: MobileNavProps) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden size-11">
          <MenuNav className="size-5" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[300px] sm:w-[350px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ScalesJustice className="size-5 text-primary" />
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
              <DashboardGrid className="size-4" />
              Dashboard
            </Link>
            <Link
              href="/dashboard/profile"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <UserProfile className="size-4" />
              Profile
            </Link>
            <Separator className="my-2" />
            <Link
              href="/api/auth/signout"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <Logout className="size-4" />
              Sign out
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <Button variant="outline" asChild className="justify-start">
              <Link href="/auth/signin" onClick={() => setOpen(false)}>
                <LogIn className="mr-2 size-4" />
                Sign in
              </Link>
            </Button>
            <Button asChild className="justify-start">
              <Link href="/auth/signup" onClick={() => setOpen(false)}>
                <UserPlus className="mr-2 size-4" />
                Get Started
              </Link>
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
