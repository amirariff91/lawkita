---
paths:
  - "src/app/(public)/**"
  - "src/app/sitemap.ts"
  - "src/app/robots.ts"
  - "src/components/seo/**"
  - "src/app/api/og/**"
  - "src/lib/utils/seo.ts"
  - "src/components/firms/firm-json-ld.tsx"
  - "src/components/lawyers/profile/lawyer-json-ld.tsx"
---

# Public SEO surfaces — sacred [A6]

The site is live and organic traffic is the business [A1].

- Canonical domain is **lawkita.com** [A17], but code fallbacks default to
  `https://lawkita.my` (src/lib/utils/seo.ts:5, src/app/sitemap.ts:9,
  src/app/robots.ts:3). Production must set NEXT_PUBLIC_APP_URL; never copy
  the `.my` fallback into new code — use lawkita.com if a literal is needed.
- Do not remove or rename public routes, slugs, metadata, JSON-LD, or sitemap
  entries without explicit owner approval.
- The sitemap is generated at request time (`dynamic = "force-dynamic"` —
  it needs a DB connection), so `bun run build` does NOT exercise it. After
  touching public pages, verify metadata via `bun run build` [A13] and check
  /sitemap.xml against a running server.
