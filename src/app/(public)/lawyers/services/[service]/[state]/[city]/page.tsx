import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { SearchParams } from "nuqs/server";
import { buildHubMetadata, HubPage, resolveHub } from "../../../hub-view";

export const dynamic = "force-dynamic";

interface ServiceCityPageProps {
  params: Promise<{ service: string; state: string; city: string }>;
  searchParams: Promise<SearchParams>;
}

export async function generateMetadata({
  params,
  searchParams,
}: ServiceCityPageProps): Promise<Metadata> {
  const { service, state, city } = await params;
  return buildHubMetadata(resolveHub(service, state, city), searchParams);
}

export default async function ServiceCityPage({ params, searchParams }: ServiceCityPageProps) {
  const { service, state, city } = await params;
  const resolved = resolveHub(service, state, city);
  if (!resolved) notFound();
  return <HubPage resolved={resolved} searchParams={searchParams} />;
}
