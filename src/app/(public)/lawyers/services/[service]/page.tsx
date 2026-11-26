import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { SearchParams } from "nuqs/server";
import { buildHubMetadata, HubPage, resolveHub } from "../hub-view";

export const dynamic = "force-dynamic";

interface ServicePageProps {
  params: Promise<{ service: string }>;
  searchParams: Promise<SearchParams>;
}

export async function generateMetadata({
  params,
  searchParams,
}: ServicePageProps): Promise<Metadata> {
  const { service } = await params;
  return buildHubMetadata(resolveHub(service), searchParams);
}

export default async function ServiceHubPage({ params, searchParams }: ServicePageProps) {
  const { service } = await params;
  const resolved = resolveHub(service);
  if (!resolved) notFound();
  return <HubPage resolved={resolved} searchParams={searchParams} />;
}
