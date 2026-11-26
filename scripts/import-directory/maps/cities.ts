import { text } from "../normalize";

const CITY_ALIASES: Readonly<Record<string, string>> = {
  Georgetown: "George Town",
  "Seremban 2": "Seremban",
  "Johor Bharu": "Johor Bahru",
  "Sri Manjung": "Seri Manjung",
  "Bandar Baru Bangi": "Bangi",
  Nusajaya: "Iskandar Puteri",
  "KL City": "Kuala Lumpur",
};

export function normalizeCity(value: string | null | undefined): string | null {
  const city = text(value);
  return city && Object.hasOwn(CITY_ALIASES, city) ? CITY_ALIASES[city] : city;
}
