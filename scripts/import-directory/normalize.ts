export const STATES = [
  "Johor", "Kedah", "Kelantan", "Kuala Lumpur", "Labuan", "Melaka",
  "Negeri Sembilan", "Pahang", "Penang", "Perak", "Perlis", "Putrajaya",
  "Sabah", "Sarawak", "Selangor", "Terengganu",
] as const;

const states = new Map<string, (typeof STATES)[number]>(STATES.map((state) => [state.toLowerCase(), state]));

export function normalizeState(value: string | null | undefined) {
  return states.get(value?.trim().toLowerCase() ?? "") ?? null;
}

export function text(value: string | null | undefined): string | null {
  return value?.trim() || null;
}

function words(value: string): string {
  return value.normalize("NFKC").toLowerCase()
    .replace(/['’‘ʼ]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, " ")
    .trim();
}

export function canonicalName(value: string | null | undefined): string {
  const normalized = (value ?? "").normalize("NFKC").toLowerCase()
    .replace(/\b(?:a\s*[/.]\s*l|s\s*[/.]\s*o)\b|\bb\.(?=\s)/g, " bin ")
    .replace(/\b(?:a\s*[/.]\s*p|d\s*[/.]\s*o|bt|bte)\b/g, " binti ");
  return words(normalized).replace(/^(?:(?:yang berhormat|yb|ybhg|tan sri|puan sri|dato(?:k)?(?: sri| seri)?|datuk(?: sri| seri)?|datu|tun|toh puan|professor|prof|dr|doktor|haji|hajah|hajjah|hj|hjh|tuan|puan|encik|cik|mr|mrs|ms|miss)(?: |$))+/, "");
}

export function canonicalFirmName(value: string | null | undefined): string {
  return words(value ?? "")
    .replace(/^(?:messrs|tetuan|m s)(?: |$)/, "")
    .replace(/(?:^| )(?:advocates? and solicitors?|advocates?|and co(?:mpany)?)(?= |$)/g, " ")
    .replace(/\s+/g, " ").trim();
}

// Stored in national format ("0322731919"). A number given with the country
// code ("+60 3-2273 1919", "60322731919") is brought to the same form so the
// same line always compares equal and renders once with +60.
export function phoneDigits(value: string | null | undefined): string | null {
  const digits = value?.replace(/\D/g, "") || null;
  if (!digits) return null;
  // Longer than any Malaysian number: two numbers run together. Not usable.
  if (digits.length > 12) return null;
  if (/^60[1-9]\d{7,9}$/.test(digits)) return `0${digits.slice(2)}`;
  return digits;
}

// Placeholders such as "n/a" or "-" are not addresses: they must not be
// stored, linked with mailto:, or count as evidence that two rows match.
export function normalizeEmail(value: string | null | undefined): string | null {
  const email = text(value)?.toLowerCase() ?? null;
  return email && /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/.test(email) ? email : null;
}

const genericMailboxes = new Set(["info", "admin", "general", "contact", "enquiry", "enquiries", "office", "mail", "hello", "legal", "law", "reception", "support"]);

/**
 * A mailbox counts as the person's own only when its local part carries part
 * of their name ("aisyah.rahman@", "arahman@" does not). A shared office or
 * branch mailbox ("info@", "kl.office@", "skrine@skrine.com") says which firm
 * someone is at, not who they are.
 */
export function isPersonalEmail(email: string | null, personName: string | null | undefined): boolean {
  if (email === null || !personName) return false;
  const local = email.split("@")[0];
  if (local.split(/[._+-]/).some((part) => genericMailboxes.has(part))) return false;
  const letters = local.replace(/[^a-z]/g, "");
  const tokens = canonicalName(personName).split(" ")
    .filter((token) => token.length >= 4 && !["binti", "bin", "abdul", "mohd", "muhammad", "mohamad", "mohamed", "nurul", "siti"].includes(token));
  return tokens.some((token) => letters.includes(token));
}

export function parseWebUrl(value: string | null | undefined, allowBare = false): URL | null {
  const input = text(value);
  if (!input || /[\s\\\p{Cc}]/u.test(input)) return null;
  try {
    const url = new URL(allowBare && !input.includes("://") ? `https://${input}` : input);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return null;
    return url;
  } catch {
    return null;
  }
}

export function websiteDomain(value: string | null | undefined): string | null {
  const hostname = parseWebUrl(value, true)?.hostname.replace(/^www\./, "").replace(/\.$/, "");
  return hostname && hostname.includes(".") ? hostname : null;
}

export function parseAdmissionDate(value: string | null | undefined): Date | null {
  const input = text(value);
  if (!input || !/^\d{4}-\d{2}-\d{2}$/.test(input) || input.startsWith("0000")) return null;
  const date = new Date(`${input}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === input ? date : null;
}

export function completedYears(date: Date | null, now: Date): number | null {
  if (!date || date > now) return null;
  const beforeAnniversary = now.getUTCMonth() < date.getUTCMonth() ||
    (now.getUTCMonth() === date.getUTCMonth() && now.getUTCDate() < date.getUTCDate());
  return now.getUTCFullYear() - date.getUTCFullYear() - Number(beforeAnniversary);
}
