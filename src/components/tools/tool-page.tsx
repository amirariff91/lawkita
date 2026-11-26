import { serializeJsonLd } from "@/lib/utils/json-ld";
import Link from "next/link";
import type { ReactNode } from "react";
import { Breadcrumbs } from "@/components/seo";
import { TOOLS, type ToolDefinition } from "@/lib/tools/registry";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://lawkita.com";


export function getWebApplicationSchema(tool: ToolDefinition): object {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: tool.name,
    url: `${APP_URL}${tool.path}`,
    description: tool.description,
    applicationCategory: "FinanceApplication",
    operatingSystem: "Any",
    browserRequirements: "Requires JavaScript",
    inLanguage: "en-MY",
    isAccessibleForFree: true,
    offers: { "@type": "Offer", price: "0", priceCurrency: "MYR" },
    publisher: { "@type": "Organization", name: "LawKita", url: APP_URL },
  };
}

export interface Faq {
  question: string;
  answer: ReactNode;
}

interface ToolPageProps {
  tool: ToolDefinition;
  intro: ReactNode;
  calculator: ReactNode;
  howItWorks: ReactNode;
  faqs: Faq[];
}

/** Shared layout for a calculator page. Breadcrumbs renders the BreadcrumbList JSON-LD. */
export function ToolPage({ tool, intro, calculator, howItWorks, faqs }: ToolPageProps) {
  const others = TOOLS.filter((t) => t.slug !== tool.slug);
  return (
    <div className="container mx-auto max-w-4xl px-4 py-6 md:py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(getWebApplicationSchema(tool)) }} />
      <Breadcrumbs
        items={[
          { label: "Tools", href: "/tools" },
          { label: tool.name, href: tool.path },
        ]}
      />

      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{tool.name}</h1>
        <div className="mt-3 max-w-2xl text-muted-foreground">{intro}</div>
      </header>

      {calculator}

      <section aria-labelledby="how-heading" className="mt-12 space-y-3">
        <h2 id="how-heading" className="text-2xl font-semibold tracking-tight">
          How the figure is calculated
        </h2>
        {howItWorks}
      </section>

      <section aria-labelledby="faq-heading" className="mt-12">
        <h2 id="faq-heading" className="text-2xl font-semibold tracking-tight">
          Questions people ask
        </h2>
        <dl className="mt-4 space-y-6">
          {faqs.map((faq) => (
            <div key={faq.question}>
              <dt className="font-medium">{faq.question}</dt>
              <dd className="mt-1 text-muted-foreground">{faq.answer}</dd>
            </div>
          ))}
        </dl>
      </section>

      <nav aria-labelledby="more-tools-heading" className="mt-12 border-t pt-6">
        <h2 id="more-tools-heading" className="text-base font-semibold">
          More free calculators
        </h2>
        <ul className="mt-2 space-y-1">
          {others.map((t) => (
            <li key={t.slug}>
              <Link href={t.path} className="text-sm text-primary underline-offset-2 hover:underline">
                {t.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
