/**
 * Serialise structured data for a <script type="application/ld+json"> tag.
 * JSON.stringify alone leaves "<" intact, so a value containing "</script>"
 * would end the tag and run whatever follows as HTML. Lawyer and firm data
 * comes from scraped and imported sources, so every JSON-LD tag uses this.
 */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

/** The URL if it is an absolute http(s) URL, otherwise null. */
export function safeHttpUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}
