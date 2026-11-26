import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { SearchParams } from "nuqs/server";
import { resolveAreaPlace } from "@/lib/utils/practice-area-location-seo";
import { AreaPlacePage, buildAreaPlaceMetadata } from "../../area-place-view";

export const dynamic = "force-dynamic";

interface AreaStatePageProps {
  params: Promise<{ area: string; state: string }>;
  searchParams: Promise<SearchParams>;
}

export async function generateMetadata({
  params,
  searchParams,
}: AreaStatePageProps): Promise<Metadata> {
  const { area, state } = await params;
  return buildAreaPlaceMetadata(resolveAreaPlace(area, state), searchParams);
}

export default async function AreaStatePage({ params, searchParams }: AreaStatePageProps) {
  const { area, state } = await params;
  const resolved = resolveAreaPlace(area, state);
  if (!resolved) notFound();
  return <AreaPlacePage resolved={resolved} searchParams={searchParams} />;
}
