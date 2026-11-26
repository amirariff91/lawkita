import { safeHttpUrl, serializeJsonLd } from "@/lib/utils/json-ld";
import type { FirmWithStats } from "@/lib/db/queries/firms";
import { formatFirmName } from "@/lib/utils/name-format";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://lawkita.com";

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
