import { parseWebUrl, websiteDomain } from "./normalize";

export const PRIMARY = "v1:name-state";
export const DOMAIN = "website-domain";
// A Tier B association must not become standing evidence just because we persisted its keys.
export const WEAK_STANDING = "v1:tier-b-standing";

export type Entity = "firm" | "lawyer";
export type ExternalKey = { namespace: string; value: string };
export type ExternalId = ExternalKey & { entityType: Entity; entityId: string };

export function nameStateKey(canonicalName: string, state: string): string {
  return `${canonicalName}|${state}`;
}

export function keyId({ namespace, value }: ExternalKey): string {
  return `${namespace}:${value}`;
}

export function primaryKey(row: { canonical_name: string; state: string }): string {
  return nameStateKey(row.canonical_name, row.state);
}

const genericHosts = [
  "facebook.com", "fb.com", "instagram.com", "linkedin.com", "linktr.ee", "beacons.ai",
  "blogspot", "wordpress.com", "wix.com", "wixsite.com", "weebly.com", "sites.google.com",
  "google.com", "google.com.my", "goo.gl", "g.page", "business.site", "youtube.com", "tiktok.com",
  "wa.me", "whatsapp.com", "x.com", "twitter.com", "lawyerlawfirm.my", "malaysianbar.org.my",
];

export function hostMatches(host: string, domain: string): boolean {
  return host === domain || host.endsWith(`.${domain}`);
}

export function lawyerKeys(row: { canonical_name: string; state: string; source_urls: string[] }): ExternalKey[] {
  const profiles = new Set<string>();
  for (const input of row.source_urls) {
    const url = parseWebUrl(input);
    if (url && !url.port && url.hostname.replace(/^www\./, "") === "lawyerlawfirm.my" &&
        /^\/lawyer\/[^/]+\/?$/.test(url.pathname)) {
      profiles.add(`https://lawyerlawfirm.my${url.pathname.replace(/\/$/, "")}`);
    }
  }
  return [
    { namespace: PRIMARY, value: primaryKey(row) },
    ...Array.from(profiles, (value) => ({ namespace: "lawyerlawfirm-url", value })),
  ];
}

export function firmKeys(row: { canonical_name: string; state: string; website?: string | null }): ExternalKey[] {
  const keys = [{ namespace: PRIMARY, value: primaryKey(row) }];
  const domain = websiteDomain(row.website);
  if (domain && !domain.split(".").includes("blogspot") && !genericHosts.some((host) => hostMatches(domain, host))) {
    keys.push({ namespace: DOMAIN, value: domain });
  }
  return keys;
}
