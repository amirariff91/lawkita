import { DEFAULT_OG_IMAGES } from "@/lib/utils/seo";
import { serializeJsonLd } from "@/lib/utils/json-ld";
// Shared view and metadata for the credential hub pages:
// /lawyers/services/[service], /[service]/[state], /[service]/[state]/[city].
// Not a route (no page.tsx here).

import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { createSearchParamsCache, parseAsInteger, type SearchParams } from "nuqs/server";
import { CredentialLawyerGrid, LawyerGridSkeleton, PaginationLink } from "@/components/lawyers";
import { Breadcrumbs, type BreadcrumbItem } from "@/components/seo";
import { Badge } from "@/components/ui/badge";
import {
  CREDENTIAL_HUBS,
  getCredentialHubBySlug,
  type CredentialHub,
} from "@/lib/constants/credentials";
import { getAllStates, getCityBySlug, getStateBySlug } from "@/lib/constants/locations";
import {
  getCredentialCountsByCity,
  getCredentialCountsByState,
  getCredentialHubCountsForPlace,
  listCredentialHubLawyers,
  type CredentialHubLawyerPage,
} from "@/lib/db/queries/credential-hubs";
import {
  buildCredentialHubDescription,
  buildCredentialHubHeading,
  buildCredentialHubTitle,
  credentialHubPath,
  credentialHubRobots,
  getCredentialHubItemListSchema,
  levelOf,
  placeLabel,
  type HubPlace,
} from "@/lib/utils/credential-hub-seo";

const PAGE_SIZE = 20;

const searchParamsCache = createSearchParamsCache({
  page: parseAsInteger.withDefault(1),
});

export interface ResolvedHub {
  hub: CredentialHub;
  place: HubPlace;
}

/** Validates the route segments against the constants; null means 404. */
export function resolveHub(
  serviceSlug: string,
  stateSlug?: string,
  citySlug?: string
): ResolvedHub | null {
  const hub = getCredentialHubBySlug(serviceSlug);
  if (!hub) return null;
  if (!stateSlug) return { hub, place: {} };
  const state = getStateBySlug(stateSlug);
  if (!state) return null;
  const statePlace = { name: state.name, slug: state.slug };
  if (!citySlug) return { hub, place: { state: statePlace } };
  const city = getCityBySlug(stateSlug, citySlug);
  if (!city) return null;
  return { hub, place: { state: statePlace, city: { name: city.name, slug: city.slug } } };
}

async function pageFrom(searchParams: Promise<SearchParams>): Promise<number> {
  const { page } = await searchParamsCache.parse(searchParams);
  return Math.max(1, page);
}

function pathFor(hub: CredentialHub, place: HubPlace, page = 1): string {
  return credentialHubPath(hub.slug, place.state?.slug, place.city?.slug, page);
}

const emptyPage = (page: number): CredentialHubLawyerPage => ({
  lawyers: [],
  total: 0,
  page,
  totalPages: 0,
});

/**
 * Lists the page's lawyers. If the query fails (for example a database
 * without the credentials column), log it and render the empty state; the
 * metadata is `noindex` in that case too.
 */
async function loadLawyers(hub: CredentialHub, place: HubPlace, page: number) {
  return listCredentialHubLawyers({
    credentials: hub.credentials,
    stateName: place.state?.name,
    cityName: place.city?.name,
    page,
    limit: PAGE_SIZE,
  }).catch((error: unknown) => {
    console.error(`services: listing ${hub.slug} failed`, error);
    return emptyPage(page);
  });
}

export async function buildHubMetadata(
  resolved: ResolvedHub | null,
  searchParams: Promise<SearchParams>
): Promise<Metadata> {
  if (!resolved) return { title: "Service Not Found" };
  const { hub, place } = resolved;
  const page = await pageFrom(searchParams);
  // Count only (limit 1). Fail closed: a failed count means noindex.
  const total = await listCredentialHubLawyers({
    credentials: hub.credentials,
    stateName: place.state?.name,
    cityName: place.city?.name,
    page: 1,
    limit: 1,
  })
    .then((result) => result.total)
    .catch(() => 0);

  const title = buildCredentialHubTitle(hub, place, page);
  const description = buildCredentialHubDescription(hub, place, total);
  return {
    title,
    description,
    // A page number past the last page is an empty page: keep it out of the index.
    robots:
      page > 1 && (page - 1) * PAGE_SIZE >= total
        ? { index: false, follow: true }
        : credentialHubRobots(levelOf(place), total),
    alternates: { canonical: pathFor(hub, place, page) },
    openGraph: { images: DEFAULT_OG_IMAGES, title, description },
    twitter: { card: "summary_large_image", title, description },
  };
}

interface LinkCount {
  href: string;
  label: string;
  count: number;
}

function LinkList({ title, items }: { title: string; items: LinkCount[] }) {
  if (items.length === 0) return null;
  return (
    <section>
      <h2 className="text-lg font-semibold mb-3">{title}</h2>
      <ul className="flex flex-wrap gap-2">
        {items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm hover:border-primary/40 hover:text-primary transition-colors"
            >
              {item.label}
              <Badge variant="secondary">{item.count}</Badge>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Links to places one level down (service, state) or to sibling cities (city). */
async function loadPlaceLinks(hub: CredentialHub, place: HubPlace): Promise<{
  title: string;
  items: LinkCount[];
}> {
  try {
    if (!place.state) {
      const counts = new Map(
        (await getCredentialCountsByState(hub.credentials)).map((row) => [row.state, row.count])
      );
      return {
        title: `${hub.name} by state`,
        items: getAllStates().flatMap((state) => {
          const count = counts.get(state.name) ?? 0;
          return count > 0
            ? [{ href: credentialHubPath(hub.slug, state.slug), label: state.name, count }]
            : [];
        }),
      };
    }

    const state = getStateBySlug(place.state.slug);
    const counts = new Map(
      (await getCredentialCountsByCity(hub.credentials, place.state.name)).map((row) => [
        row.city,
        row.count,
      ])
    );
    const items = (state?.cities ?? []).flatMap((city) => {
      if (city.slug === place.city?.slug) return [];
      const count = counts.get(city.name) ?? 0;
      return count > 0
        ? [{ href: credentialHubPath(hub.slug, place.state!.slug, city.slug), label: city.name, count }]
        : [];
    });
    return {
      title: place.city ? `Other cities in ${place.state.name}` : `Cities in ${place.state.name}`,
      items,
    };
  } catch (error) {
    console.error(`services: place counts for ${hub.slug} failed`, error);
    return { title: "", items: [] };
  }
}

/** Other services at the same place that list at least one lawyer. */
async function loadOtherServiceLinks(hub: CredentialHub, place: HubPlace): Promise<LinkCount[]> {
  const counts = await getCredentialHubCountsForPlace(place.state?.name, place.city?.name).catch(
    (error: unknown) => {
      console.error("services: per-service counts failed", error);
      return {} as Record<string, number>;
    }
  );
  return CREDENTIAL_HUBS.flatMap((other) => {
    if (other.slug === hub.slug) return [];
    const count = counts[other.slug] ?? 0;
    return count > 0
      ? [{ href: pathFor(other, place), label: `${other.name} (${other.malayName})`, count }]
      : [];
  });
}

async function HubContent({
  hub,
  place,
  page,
}: {
  hub: CredentialHub;
  place: HubPlace;
  page: number;
}) {
  const [result, placeLinks, otherServices] = await Promise.all([
    loadLawyers(hub, place, page),
    loadPlaceLinks(hub, place),
    loadOtherServiceLinks(hub, place),
  ]);
  const where = placeLabel(place);
  const heading = buildCredentialHubHeading(hub, place);
  const schema = getCredentialHubItemListSchema({
    name: heading,
    description: buildCredentialHubDescription(hub, place, result.total),
    path: pathFor(hub, place, page),
    total: result.total,
    lawyers: result.lawyers,
    startPosition: (result.page - 1) * PAGE_SIZE + 1,
  });

  const broader: { href: string; label: string } | null = place.city
    ? { href: pathFor(hub, { state: place.state }), label: `${hub.name} in ${place.state!.name}` }
    : place.state
      ? { href: pathFor(hub, {}), label: `${hub.name} across Malaysia` }
      : null;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(schema) }}
      />
      <div className="space-y-8">
        <div>
          <p className="text-sm text-muted-foreground mb-4">
            {result.total} {result.total === 1 ? hub.singular : hub.plural} listed in {where}
          </p>
          <CredentialLawyerGrid
            lawyers={result.lawyers}
            emptyMessage={`No ${hub.plural} in ${where} are listed on LawKita yet.`}
          />
          {result.total === 0 && broader && (
            <p className="mt-2 text-center text-sm">
              <Link href={broader.href} className="text-primary hover:underline">
                See {broader.label}
              </Link>
            </p>
          )}
          {result.totalPages > 1 && (
            <div className="mt-8">
              <PaginationLink
                currentPage={result.page}
                totalPages={result.totalPages}
                getPageUrl={(n) => pathFor(hub, place, n)}
              />
            </div>
          )}
        </div>

        <LinkList title={placeLinks.title} items={placeLinks.items} />
        <LinkList title={`Other services in ${where}`} items={otherServices} />

        {place.state && (
          <p className="text-sm text-muted-foreground">
            Looking for a lawyer for another matter?{" "}
            <Link
              href={
                place.city
                  ? `/lawyers/location/${place.state.slug}/${place.city.slug}`
                  : `/lawyers/location/${place.state.slug}`
              }
              className="text-primary hover:underline"
            >
              All lawyers in {place.city?.name ?? place.state.name}
            </Link>
          </p>
        )}
      </div>
    </>
  );
}

export async function HubPage({
  resolved,
  searchParams,
}: {
  resolved: ResolvedHub;
  searchParams: Promise<SearchParams>;
}) {
  const { hub, place } = resolved;
  const page = await pageFrom(searchParams);

  const crumbs: BreadcrumbItem[] = [
    { label: "Lawyers", href: "/lawyers" },
    { label: "Services", href: credentialHubPath() },
    { label: hub.name, href: credentialHubPath(hub.slug) },
  ];
  if (place.state) {
    crumbs.push({ label: place.state.name, href: credentialHubPath(hub.slug, place.state.slug) });
  }
  if (place.state && place.city) {
    crumbs.push({
      label: place.city.name,
      href: credentialHubPath(hub.slug, place.state.slug, place.city.slug),
    });
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <Breadcrumbs items={crumbs} />
      <h1 className="text-3xl font-bold tracking-tight mb-4">
        {buildCredentialHubHeading(hub, place)}
      </h1>
      <div className="text-muted-foreground mb-8 max-w-3xl space-y-3">
        {hub.description.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
      <Suspense fallback={<LawyerGridSkeleton count={6} />}>
        <HubContent hub={hub} place={place} page={page} />
      </Suspense>
    </div>
  );
}
