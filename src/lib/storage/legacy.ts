export interface LegacyUploadResponse {
  url?: string;
  signedURL?: string;
  signedUrl?: string;
  token?: string;
}

export function getLegacySigningHeaders(token: string, upsert = false): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    apikey: token,
    "Content-Type": "application/json",
    "x-upsert": String(upsert),
  };
}

export function resolveLegacyUploadUrl(
  storageApiUrl: string,
  response: LegacyUploadResponse
): string {
  const apiUrl = response.url ?? response.signedURL ?? response.signedUrl;

  if (!apiUrl) {
    throw new Error("Legacy storage signing response did not include an upload URL");
  }

  if (/^https?:\/\//i.test(apiUrl)) return apiUrl;
  return `${storageApiUrl}${apiUrl.startsWith("/") ? "" : "/"}${apiUrl}`;
}
