import Link from "next/link";
import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/seo";
import { getAllStates } from "@/lib/constants/locations";
import { getLawyerCountsByState } from "@/lib/db/queries/lawyers";
import { DEFAULT_OG_IMAGES } from "@/lib/utils/seo";

// Counts come from the database at request time.
export const dynamic = "force-dynamic";

const title = "Lawyers in Malaysia by State";
const description =
  "Find lawyers in every Malaysian state and federal territory, from Kuala Lumpur and Selangor to Sabah and Sarawak. Browse by state, then by city.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/lawyers/location" },
  openGraph: { title, description, images: DEFAULT_OG_IMAGES },
};

export default async function LocationsIndexPage() {
  // The page still lists every state if the count query fails.
  const counts = await getLawyerCountsByState().catch(() => []);
  const countByState = new Map(counts.map((row) => [row.state, row.count]));
  const states = getAllStates()
    .map((state) => ({ ...state, count: countByState.get(state.name) ?? 0 }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  return (
    <div className="container mx-auto py-8 px-4">
      <Breadcrumbs
        items={[
          { label: "Lawyers", href: "/lawyers" },
          { label: "Locations", href: "/lawyers/location" },
        ]}
      />
      <div className="max-w-5xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          <p className="mt-3 text-muted-foreground">{description}</p>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {states.map((state) => (
            <li key={state.slug}>
              <Link
                href={`/lawyers/location/${state.slug}`}
                className="flex items-center justify-between rounded-lg border p-4 hover:border-primary/40 hover:bg-muted/50 transition-colors"
              >
                <span className="font-medium">Lawyers in {state.name}</span>
                {state.count > 0 && (
                  <span className="text-sm text-muted-foreground tabular-nums">
                    {state.count.toLocaleString("en-MY")}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
