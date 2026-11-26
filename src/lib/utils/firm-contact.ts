// Pure helpers for the firm contact block and its JSON-LD: tel: and
// WhatsApp links, the full address line, the Google Maps directions link
// and a strict opening-hours mapping. No database access here.

/** `tel:` href from a stored phone number, or null when it has no digits. */
export function telHref(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const trimmed = phone.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length < 6 || digits.length > 15) return null;
  return `tel:${trimmed.startsWith("+") ? "+" : ""}${digits}`;
}

/**
 * wa.me link for a stored WhatsApp number. The import stores national
 * digits ("0123456789"); the link uses the international form without the
 * trunk 0 ("https://wa.me/60123456789"). Anything that is not plain digits
 * in that form gets no link.
 */
export function whatsappHref(value: string | null | undefined): string | null {
  const stored = value?.trim();
  if (!stored || !/^0\d{8,10}$/.test(stored)) return null;
  return `https://wa.me/6${stored}`;
}

function hasWord(haystack: string, needle: string): boolean {
  const normalise = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const words = normalise(needle);
  return words.length > 0 && ` ${normalise(haystack)} `.includes(` ${words} `);
}

/**
 * The address as one line, completed with postcode, city and state when
 * the stored address does not already contain them. A postcode is added
 * only when the address has no five-digit postcode of its own, so two
 * conflicting postcodes are never shown.
 */
export function formatFirmAddress(firm: {
  address: string | null | undefined;
  postcode?: string | null;
  city: string | null | undefined;
  state: string | null | undefined;
}): string | null {
  const address = firm.address?.trim().replace(/[,\s]+$/, "");
  if (!address) return null;
  const extra: string[] = [];
  const postcode = firm.postcode?.trim();
  const city = firm.city?.trim();
  const state = firm.state?.trim();
  const tail: string[] = [];
  if (postcode && /^\d{5}$/.test(postcode) && !/\b\d{5}\b/.test(address)) tail.push(postcode);
  if (city && !hasWord(address, city)) tail.push(city);
  if (tail.length > 0) extra.push(tail.join(" "));
  if (state && !hasWord(address, state) && state !== city) extra.push(state);
  return extra.length > 0 ? `${address}, ${extra.join(", ")}` : address;
}

export function hasValidCoordinates(
  latitude: number | null | undefined,
  longitude: number | null | undefined
): latitude is number {
  return (
    typeof latitude === "number" &&
    typeof longitude === "number" &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    Math.abs(latitude) <= 90 &&
    Math.abs(longitude) <= 180 &&
    !(latitude === 0 && longitude === 0)
  );
}

/** Google Maps directions link for stored coordinates, or null. */
export function directionsHref(
  latitude: number | null | undefined,
  longitude: number | null | undefined
): string | null {
  if (!hasValidCoordinates(latitude, longitude)) return null;
  return `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
}

const DAY_CODES = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"] as const;
const DAY_NAMES: Record<string, (typeof DAY_CODES)[number]> = {};
for (const [index, code] of DAY_CODES.entries()) {
  const full = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"][index];
  DAY_NAMES[code.toLowerCase()] = code;
  DAY_NAMES[full] = code;
  DAY_NAMES[full.slice(0, 3)] = code;
}

function dayCode(token: string): (typeof DAY_CODES)[number] | null {
  return DAY_NAMES[token.trim().toLowerCase()] ?? null;
}

function parseDays(spec: string): string | null {
  const groups = spec.split(",").map((group) => group.trim());
  const out: string[] = [];
  for (const group of groups) {
    const range = group.split(/\s*-\s*/);
    if (range.length === 1) {
      const code = dayCode(range[0]);
      if (!code) return null;
      out.push(code);
    } else if (range.length === 2) {
      const from = dayCode(range[0]);
      const to = dayCode(range[1]);
      if (!from || !to) return null;
      // A range that wraps the week ("Sun-Sat") is not mapped.
      if (DAY_CODES.indexOf(from) >= DAY_CODES.indexOf(to)) return null;
      out.push(`${from}-${to}`);
    } else {
      return null;
    }
  }
  return out.join(",");
}

function minutes(time: string): number | null {
  const match = /^([01]\d|2[0-4]):([0-5]\d)$/.exec(time);
  if (!match) return null;
  const value = Number(match[1]) * 60 + Number(match[2]);
  return value <= 24 * 60 ? value : null;
}

/**
 * schema.org `openingHours` values for stored opening-hours text, or null
 * when the text is not in a form that maps without guessing.
 *
 * Accepted: day specs (Mo/Mon/Monday, ranges with "-", lists with ",")
 * followed by a 24-hour "HH:MM-HH:MM" range, segments separated by ";" or
 * ", ", and segments that say "closed" (dropped). 12-hour times, prose
 * ("Monday to Friday") or anything else returns null.
 */
export function mapOpeningHours(value: string | null | undefined): string[] | null {
  const text = value?.trim();
  if (!text) return null;
  const segmentPattern =
    /^([A-Za-z]+(?:\s*[-,]\s*[A-Za-z]+)*)\s+(?:(closed)|(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2}))$/i;
  // Segments are separated by ";" or by ", " followed by a day and a time.
  const segments = text
    .split(/\s*;\s*|,\s+(?=[A-Za-z]+(?:\s*[-,]\s*[A-Za-z]+)*\s+(?:\d{2}:\d{2}|closed))/i)
    .filter(Boolean);
  const result: string[] = [];
  for (const segment of segments) {
    const match = segmentPattern.exec(segment.trim());
    if (!match) return null;
    const days = parseDays(match[1]);
    if (!days) return null;
    if (match[2]) continue;
    const open = minutes(match[3]);
    const close = minutes(match[4]);
    if (open === null || close === null || open >= close) return null;
    result.push(`${days} ${match[3]}-${match[4]}`);
  }
  return result.length > 0 ? result : null;
}
