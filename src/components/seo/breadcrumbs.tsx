import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import { getBreadcrumbSchema } from "@/lib/utils/seo";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://lawkita.my";

export interface BreadcrumbItem {
  label: string;
  href: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

/**
 * Reusable breadcrumb component that renders both visual UI and JSON-LD schema.
 * Auto-prepends "Home" to all paths.
 */
export function Breadcrumbs({ items }: BreadcrumbsProps) {
  // Auto-prepend Home
  const allItems: BreadcrumbItem[] = [{ label: "Home", href: "/" }, ...items];

  // Generate schema items with full URLs
  const schemaItems = allItems.map((item) => ({
    name: item.label,
    url: item.href.startsWith("http") ? item.href : `${APP_URL}${item.href}`,
  }));

  const schema = getBreadcrumbSchema(schemaItems);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <nav aria-label="Breadcrumb" className="mb-4">
        <ol className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
          {allItems.map((item, index) => {
            const isLast = index === allItems.length - 1;
            const isHome = index === 0;

            return (
              <li key={item.href} className="flex items-center gap-1">
                {index > 0 && (
                  <ChevronRight
                    className="size-4 shrink-0"
                    aria-hidden="true"
                  />
                )}
                {isLast ? (
                  <span aria-current="page" className="text-foreground font-medium truncate max-w-[200px]">
                    {isHome ? <Home className="size-4" aria-label="Home" /> : item.label}
                  </span>
                ) : (
                  <Link
                    href={item.href}
                    className="hover:text-foreground transition-colors truncate max-w-[200px]"
                  >
                    {isHome ? <Home className="size-4" aria-label="Home" /> : item.label}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}
