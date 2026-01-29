import type { LawyerWithRelations } from "@/types/lawyer";

interface LawyerJsonLdProps {
  lawyer: LawyerWithRelations;
  url: string;
}

export function LawyerJsonLd({ lawyer, url }: LawyerJsonLdProps) {
  const rating = lawyer.averageRating
    ? parseFloat(lawyer.averageRating)
    : null;

  // Build the full Attorney schema
  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Attorney",
    "@id": url,
    name: lawyer.name,
    url,
  };

  // Image
  if (lawyer.photo) {
    jsonLd.image = lawyer.photo;
  }

  // Description from bio
  if (lawyer.bio) {
    jsonLd.description = lawyer.bio;
  }

  // Contact information
  if (lawyer.email) {
    jsonLd.email = lawyer.email;
  }

  if (lawyer.phone) {
    // Format phone number with country code
    const formattedPhone = lawyer.phone.startsWith("+")
      ? lawyer.phone
      : `+60-${lawyer.phone.replace(/^0/, "")}`;
    jsonLd.telephone = formattedPhone;
  }

  // Works for (Firm)
  if (lawyer.firmName) {
    jsonLd.worksFor = {
      "@type": "LegalService",
      name: lawyer.firmName,
      ...(lawyer.address && {
        address: {
          "@type": "PostalAddress",
          streetAddress: lawyer.address,
          addressLocality: lawyer.city || undefined,
          addressRegion: lawyer.state || undefined,
          addressCountry: "MY",
        },
      }),
    };
  }

  // Address
  if (lawyer.state || lawyer.city || lawyer.address) {
    jsonLd.address = {
      "@type": "PostalAddress",
      ...(lawyer.address && { streetAddress: lawyer.address }),
      ...(lawyer.city && { addressLocality: lawyer.city }),
      ...(lawyer.state && { addressRegion: lawyer.state }),
      addressCountry: "MY",
    };
  }

  // Practice areas (knowsAbout)
  if (lawyer.practiceAreas.length > 0) {
    jsonLd.knowsAbout = lawyer.practiceAreas.map((pa) => pa.practiceArea.name);
  }

  // Area served (based on state)
  if (lawyer.state) {
    jsonLd.areaServed = {
      "@type": "State",
      name: lawyer.state,
      containedInPlace: {
        "@type": "Country",
        name: "Malaysia",
      },
    };
  }

  // Bar admission credential
  if (lawyer.barMembershipNumber || lawyer.barAdmissionDate) {
    jsonLd.hasCredential = {
      "@type": "EducationalOccupationalCredential",
      credentialCategory: "Bar Admission",
      ...(lawyer.barMembershipNumber && {
        identifier: lawyer.barMembershipNumber,
      }),
      ...(lawyer.barAdmissionDate && {
        dateCreated: lawyer.barAdmissionDate.toISOString().split("T")[0],
      }),
      recognizedBy: {
        "@type": "Organization",
        name: "Malaysian Bar Council",
        url: "https://www.malaysianbar.org.my",
      },
    };
  }

  // Education
  if (lawyer.education.length > 0) {
    jsonLd.alumniOf = lawyer.education.map((edu) => ({
      "@type": "EducationalOrganization",
      name: edu.institution,
    }));
  }

  // Aggregate rating
  if (rating !== null && (lawyer.reviewCount ?? 0) > 0) {
    jsonLd.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: rating.toFixed(1),
      reviewCount: lawyer.reviewCount,
      bestRating: 5,
      worstRating: 1,
    };
  }

  // Individual reviews (up to 5)
  if (lawyer.reviews.length > 0) {
    jsonLd.review = lawyer.reviews.slice(0, 5).map((review) => ({
      "@type": "Review",
      author: {
        "@type": "Person",
        name: review.reviewerName || "Anonymous",
      },
      reviewRating: {
        "@type": "Rating",
        ratingValue: review.overallRating,
        bestRating: 5,
        worstRating: 1,
      },
      ...(review.content && { reviewBody: review.content }),
      ...(review.title && { headline: review.title }),
      datePublished: review.createdAt.toISOString(),
    }));
  }

  // Qualifications
  if (lawyer.qualifications.length > 0) {
    jsonLd.hasOccupationalExperience = lawyer.qualifications.map((qual) => ({
      "@type": "OccupationalExperienceRequirements",
      name: qual.title,
      ...(qual.issuingBody && { description: `Issued by ${qual.issuingBody}` }),
    }));
  }

  // Years of experience
  if (lawyer.yearsAtBar !== null && lawyer.yearsAtBar > 0) {
    jsonLd.experienceInPlaceOfEducation = {
      "@type": "OccupationalExperienceRequirements",
      monthsOfExperience: lawyer.yearsAtBar * 12,
    };
  }

  // Same as links (could include LinkedIn, etc. if available)
  // jsonLd.sameAs = [];

  // Available language (assuming English and Malay)
  jsonLd.knowsLanguage = ["en", "ms"];

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
