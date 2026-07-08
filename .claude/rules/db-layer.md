---
paths:
  - "src/lib/db/**"
  - "src/lib/supabase/**"
  - "drizzle/**"
  - "drizzle.config.ts"
---

# Database layer

- Two clients coexist by drift, not design [A2]: Drizzle/postgres.js over
  DATABASE_URL (better-auth, dashboard + admin pages, sitemap, news-crawler,
  e-judgment scraper) and supabase-js (src/lib/db/queries/*, firms API,
  firm-dashboard pages, Bar Council scraper). Even this mapping is fuzzy —
  always check the file's actual imports. Match the file's existing client;
  propose — don't perform — cross-layer migrations.
- Cases queries were moved Drizzle → supabase-js as a *fix* on 2026-01-28 and
  the root cause is forgotten [A2f]. Do not move them back to Drizzle; the
  failure could come back with them (docs/unknowns.md #1).
- Schema truth is fragmented [A3]: prod has been changed via drizzle-kit push,
  the Supabase dashboard, and the two checked-in migrations. Before any schema
  change or schema-dependent query, diff the live database against schema.ts.
- The lazy Proxy + build-phase guard in src/lib/db/index.ts blocks DB access
  during `next build`. Given the forgotten failure history [A2f], don't
  simplify it away, and don't add DB calls reachable from static generation.
