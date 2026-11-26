import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { SearchParams } from "nuqs/server";
import { buildHubMetadata, HubPage, resolveHub } from "../../hub-view";

export const dynamic = "force-dynamic";

interface ServiceStatePageProps {
  params: Promise<{ service: string; state: string }>;
  searchParams: Promise<SearchParams>;
}

export async function generateMetadata({
  params,
  searchParams,
}: ServiceStatePageProps): Promise<Metadata> {
  const { service, state } = await params;
  return buildHubMetadata(resolveHub(service, state), searchParams);
}

export default async function ServiceStatePage({ params, searchParams }: ServiceStatePageProps) {
  const { service, state } = await params;
  const resolved = resolveHub(service, state);
  if (!resolved) notFound();
  return <HubPage resolved={resolved} searchParams={searchParams} />;
}
