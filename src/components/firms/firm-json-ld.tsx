import type { FirmWithStats } from "@/lib/db/queries/firms";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://lawkita.my";

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
    name: firm.name,
    url,
  };

  // Address
  if (firm.address || firm.city || firm.state) {
    jsonLd.address = {
      "@type": "PostalAddress",
      ...(firm.address && { streetAddress: firm.address }),
      ...(firm.city && { addressLocality: firm.city }),
      ...(firm.state && { addressRegion: firm.state }),
      addressCountry: "MY",
    };
  }

  // Contact information
  if (firm.phone) {
    const formattedPhone = firm.phone.startsWith("+")
      ? firm.phone
      : `+60-${firm.phone.replace(/^0/, "")}`;
    jsonLd.telephone = formattedPhone;
  }

  if (firm.email) {
    jsonLd.email = firm.email;
  }

  if (firm.website) {
    jsonLd.sameAs = [firm.website];
  }

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
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
