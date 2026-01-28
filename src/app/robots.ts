import { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://lawkita.my";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/dashboard/",
          "/admin/",
          "/claim/",
          "/sign-in",
          "/sign-up",
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
