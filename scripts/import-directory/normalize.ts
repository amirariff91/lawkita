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

export function phoneDigits(value: string | null | undefined): string | null {
  return value?.replace(/\D/g, "") || null;
}

export function normalizeEmail(value: string | null | undefined): string | null {
  return text(value)?.toLowerCase() ?? null;
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
