import { DEFAULT_OG_IMAGES } from "@/lib/utils/seo";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Breadcrumbs } from "@/components/seo";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CREDENTIAL_HUBS } from "@/lib/constants/credentials";
import { getCredentialHubCountsForPlace } from "@/lib/db/queries/credential-hubs";
import {
  CREDENTIAL_INDEX_DESCRIPTION,
  CREDENTIAL_INDEX_TITLE,
  credentialHubPath,
  credentialHubRobots,
} from "@/lib/utils/credential-hub-seo";

export const dynamic = "force-dynamic";

// National per-service counts. A failure renders zero counts (and noindex)
// rather than failing the page.
async function loadNationalCounts(): Promise<Record<string, number>> {
  return getCredentialHubCountsForPlace().catch((error: unknown) => {
    console.error("services: national counts failed", error);
    return {} as Record<string, number>;
  });
}

export async function generateMetadata(): Promise<Metadata> {
  const counts = await loadNationalCounts();
  const total = Object.values(counts).reduce((sum, n) => sum + n, 0);
  return {
    title: CREDENTIAL_INDEX_TITLE,
    description: CREDENTIAL_INDEX_DESCRIPTION,
    robots: credentialHubRobots("index", total),
    alternates: { canonical: credentialHubPath() },
    openGraph: { images: DEFAULT_OG_IMAGES, title: CREDENTIAL_INDEX_TITLE, description: CREDENTIAL_INDEX_DESCRIPTION },
    twitter: {
      card: "summary_large_image",
      title: CREDENTIAL_INDEX_TITLE,
      description: CREDENTIAL_INDEX_DESCRIPTION,
    },
  };
}

export default async function ServicesIndexPage() {
  const counts = await loadNationalCounts();

  return (
    <div className="container mx-auto py-8 px-4">
      <Breadcrumbs
        items={[
          { label: "Lawyers", href: "/lawyers" },
          { label: "Services", href: credentialHubPath() },
        ]}
      />
      <div className="mb-8 max-w-3xl">
        <h1 className="text-3xl font-bold tracking-tight">Find a Lawyer by Service</h1>
        <p className="text-muted-foreground mt-2">
          Some tasks need a lawyer who holds a particular appointment or sits on a particular
          panel: swearing a statutory declaration, notarising a document for use abroad,
          applying for legal aid, a Syariah court matter, or mediating a dispute. Choose a
          service to see the lawyers listed for it by state and city.
        </p>
      </div>

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CREDENTIAL_HUBS.map((hub) => {
          const count = counts[hub.slug] ?? 0;
          return (
            <li key={hub.slug}>
              <Link href={credentialHubPath(hub.slug)} className="block h-full">
                <Card className="h-full transition-all hover:shadow-md hover:border-primary/20 group">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-start justify-between gap-2">
                      <span className="group-hover:text-primary transition-colors">
                        {hub.name}
                        <span className="block text-sm font-normal text-muted-foreground">
                          {hub.malayName}
                        </span>
                      </span>
                      <ArrowRight
                        className="size-4 shrink-0 text-muted-foreground group-hover:text-primary transition-colors"
                        aria-hidden="true"
                      />
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-3">{hub.summary}</p>
                    <Badge variant="secondary">
                      {count} {count === 1 ? hub.singular : hub.plural} listed
                    </Badge>
                  </CardContent>
                </Card>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
