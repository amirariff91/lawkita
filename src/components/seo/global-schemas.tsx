import { serializeJsonLd } from "@/lib/utils/json-ld";
import { getOrganizationSchema, getWebsiteSchema } from "@/lib/utils/seo";

/**
 * Renders site-wide Organization and WebSite JSON-LD schemas.
 * Should be included in the root layout.
 */
export function GlobalSchemas() {
  const organizationSchema = getOrganizationSchema();
  const websiteSchema = getWebsiteSchema();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(websiteSchema) }}
      />
    </>
  );
}
