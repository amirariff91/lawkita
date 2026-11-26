import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Calculator } from "lucide-react";
import { Breadcrumbs } from "@/components/seo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatIsoDate } from "@/lib/tools/format";
import { VERIFIED_ON } from "@/lib/tools/rates";
import { TOOLS } from "@/lib/tools/registry";

const title = "Free Legal Calculators for Malaysia";
const description =
  "Free calculators for stamp duty, conveyancing legal fees and tenancy agreement stamp duty in Malaysia, with every rate linked to its source.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/tools" },
  openGraph: { title, description, url: "/tools" },
  twitter: { card: "summary_large_image", title, description },
};

export default function ToolsIndexPage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-6 md:py-10">
      <Breadcrumbs items={[{ label: "Tools", href: "/tools" }]} />
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{title}</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Work out the costs of buying or renting property before you speak to a lawyer. No sign-up. Each result
          shows the bands, the rule behind it and its source. Rates last checked {formatIsoDate(VERIFIED_ON)}.
        </p>
      </header>
      <ul className="grid gap-4 sm:grid-cols-2">
        {TOOLS.map((tool) => (
          <li key={tool.slug}>
            <Card className="h-full">
              <CardHeader>
                <Calculator className="size-5 text-primary" aria-hidden="true" />
                <CardTitle className="text-lg">
                  <Link href={tool.path} className="hover:underline">
                    {tool.name}
                  </Link>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">{tool.summary}</p>
                <Link
                  href={tool.path}
                  className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                  aria-label={`Open the ${tool.name}`}
                >
                  Open calculator
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
      <p className="mt-8 text-xs text-muted-foreground">
        These calculators give estimates for general information. They are not legal advice.
      </p>
    </div>
  );
}
