import { safeHttpUrl, serializeJsonLd } from "@/lib/utils/json-ld";
import type { FirmWithStats } from "@/lib/db/queries/firms";
import { formatFirmName, formatPersonName } from "@/lib/utils/name-format";
import { directionsHref, mapOpeningHours } from "@/lib/utils/firm-contact";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://lawkita.com";
const MAX_EMPLOYEES = 10;

interface FirmJsonLdProps {
  firm: FirmWithStats;
}

/**
 * JSON-LD component for firm profiles using LegalService schema.
 */
export function FirmJsonLd({ firm }: FirmJsonLdProps) {
  const url = `${APP_URL}/firms/${firm.slug}`;

  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "LegalService",
    "@id": url,
    name: formatFirmName(firm.name),
    url,
  };

  // Address
  if (firm.address || firm.city || firm.state) {
    jsonLd.address = {
      "@type": "PostalAddress",
      ...(firm.address && { streetAddress: firm.address }),
      ...(firm.city && { addressLocality: firm.city }),
      ...(firm.state && { addressRegion: firm.state }),
      ...(firm.postcode && { postalCode: firm.postcode }),
      addressCountry: "MY",
    };
  }

  // Contact information
  if (firm.phone) {
    const formattedPhone = firm.phone.startsWith("+")
      ? firm.phone
      : `+60-${firm.phone.replace(/^(?:60|0)/, "")}`;
    jsonLd.telephone = formattedPhone;
  }

  if (firm.email) {
    jsonLd.email = firm.email;
  }

  const sameAs = [firm.website, firm.linkedin, ...(firm.socialLinks ?? [])]
    .map((link) => safeHttpUrl(link))
    .filter((link): link is string => link !== null);
  if (sameAs.length > 0) jsonLd.sameAs = sameAs;

  const logo = safeHttpUrl(firm.logo);
  if (logo) jsonLd.logo = logo;

  if (typeof firm.latitude === "number" && typeof firm.longitude === "number") {
    jsonLd.geo = {
      "@type": "GeoCoordinates",
      latitude: firm.latitude,
      longitude: firm.longitude,
    };
  }

  if (firm.foundedYear) jsonLd.foundingDate = String(firm.foundedYear);
  if (firm.languages && firm.languages.length > 0) jsonLd.knowsLanguage = firm.languages;
  if (firm.rankings && firm.rankings.length > 0) jsonLd.award = firm.rankings;

  // Practice areas / services
  if (firm.practiceAreas.length > 0) {
    jsonLd.knowsAbout = firm.practiceAreas;
    jsonLd.serviceType = firm.practiceAreas;
  }

  // Number of employees (lawyers)
  if (firm.lawyerCount > 0) {
    jsonLd.numberOfEmployees = {
      "@type": "QuantitativeValue",
      value: firm.lawyerCount,
    };
  }

  // Opening hours only when the stored text maps without guessing.
  const openingHours = mapOpeningHours(firm.openingHours);
  if (openingHours) {
    jsonLd.openingHours = openingHours.length === 1 ? openingHours[0] : openingHours;
  }

  // The same directions link the page shows.
  const hasMap = directionsHref(firm.latitude, firm.longitude);
  if (hasMap) jsonLd.hasMap = hasMap;

  // A short list of the lawyers shown on the page, each with its profile URL.
  if (firm.lawyers.length > 0) {
    jsonLd.employee = firm.lawyers.slice(0, MAX_EMPLOYEES).map((lawyer) => ({
      "@type": "Person",
      name: formatPersonName(lawyer.name),
      url: `${APP_URL}/lawyers/${lawyer.slug}`,
    }));
  }

  // Area served (based on state/city)
  if (firm.state) {
    jsonLd.areaServed = {
      "@type": "State",
      name: firm.state,
      containedInPlace: {
        "@type": "Country",
        name: "Malaysia",
      },
    };
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
    />
  );
}
