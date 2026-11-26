import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { SearchParams } from "nuqs/server";
import { resolveAreaPlace } from "@/lib/utils/practice-area-location-seo";
import { AreaPlacePage, buildAreaPlaceMetadata } from "../../../area-place-view";

export const dynamic = "force-dynamic";

interface AreaCityPageProps {
  params: Promise<{ area: string; state: string; city: string }>;
  searchParams: Promise<SearchParams>;
}

export async function generateMetadata({
  params,
  searchParams,
}: AreaCityPageProps): Promise<Metadata> {
  const { area, state, city } = await params;
  return buildAreaPlaceMetadata(resolveAreaPlace(area, state, city), searchParams);
}

export default async function AreaCityPage({ params, searchParams }: AreaCityPageProps) {
  const { area, state, city } = await params;
  const resolved = resolveAreaPlace(area, state, city);
  if (!resolved) notFound();
  return <AreaPlacePage resolved={resolved} searchParams={searchParams} />;
}
