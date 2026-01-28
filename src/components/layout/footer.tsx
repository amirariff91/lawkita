import Link from "next/link";
import { Scale } from "lucide-react";
import { Separator } from "@/components/ui/separator";

const footerLinks = {
  directory: [
    { name: "Find a Lawyer", href: "/lawyers" },
    { name: "Practice Areas", href: "/lawyers/practice-area" },
    { name: "Locations", href: "/lawyers/location" },
    { name: "Top Rated", href: "/lawyers?sort=rating" },
  ],
  cases: [
    { name: "Famous Cases", href: "/cases" },
    { name: "Corruption Cases", href: "/cases?category=corruption" },
    { name: "Political Cases", href: "/cases?category=political" },
    { name: "Corporate Cases", href: "/cases?category=corporate" },
  ],
  forLawyers: [
    { name: "Claim Your Profile", href: "/claim" },
    { name: "Premium Plans", href: "/pricing" },
    { name: "Dashboard", href: "/dashboard" },
    { name: "Analytics", href: "/dashboard/analytics" },
  ],
  company: [
    { name: "About Us", href: "/about" },
    { name: "Contact", href: "/contact" },
    { name: "Privacy Policy", href: "/privacy" },
    { name: "Terms of Service", href: "/terms" },
  ],
};

export function Footer() {
  return (
    <footer className="border-t bg-muted/30">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-5">
          {/* Logo and Description */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2">
              <Scale className="size-6 text-primary" aria-hidden="true" />
              <span className="text-xl font-bold">LawKita</span>
            </Link>
            <p className="mt-4 text-sm text-muted-foreground">
              Malaysia&apos;s comprehensive lawyer directory with famous cases
              explorer.
            </p>
          </div>

          {/* Directory Links */}
          <div>
            <h3 className="font-semibold mb-4">Directory</h3>
            <ul className="space-y-2">
              {footerLinks.directory.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Cases Links */}
          <div>
            <h3 className="font-semibold mb-4">Cases</h3>
            <ul className="space-y-2">
              {footerLinks.cases.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* For Lawyers Links */}
          <div>
            <h3 className="font-semibold mb-4">For Lawyers</h3>
            <ul className="space-y-2">
              {footerLinks.forLawyers.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h3 className="font-semibold mb-4">Company</h3>
            <ul className="space-y-2">
              {footerLinks.company.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <Separator className="my-8" />

        {/* Disclaimer */}
        <div className="mb-8">
          <p className="text-xs text-muted-foreground">
            <strong>Disclaimer:</strong> Information on this website is provided
            for general informational purposes only. A lawyer&apos;s appearance
            in case records does not imply endorsement of any party or legal
            position. Case involvement reflects publicly available court records
            and does not constitute legal advice. Please consult directly with a
            qualified legal professional for your specific needs.
          </p>
        </div>

        {/* Copyright */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} LawKita. All rights reserved.
          </p>
          <p className="text-sm text-muted-foreground">
            Made with care in Malaysia
          </p>
        </div>
      </div>
    </footer>
  );
}
