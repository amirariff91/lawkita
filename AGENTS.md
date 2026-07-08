# LawKita

Malaysian lawyer directory. Canonical domain: lawkita.com [A17] — but code
fallbacks default to lawkita.my (see .claude/rules/seo-surfaces.md).
Live in production with real traffic. [A1]
Next.js 16 App Router + Supabase Postgres + better-auth.
PRD.md is a 2026-01 snapshot of original intent, not the current spec. [A15]

## Hard rules

- Use Bun for everything — install, run, scripts. Never run yarn or regenerate
  yarn.lock; it and the `packageManager` field are dead leftovers. [A4]
- Pushing `main` deploys production (Coolify builds the Dockerfile on push).
  Before any push to main, all three must pass:
  `bun run build && bun run type-check && bun run lint`. [A5f, A13]
- Two data layers coexist (Drizzle over DATABASE_URL, supabase-js). End-state
  is undecided: use whichever client the file you're editing already uses;
  never migrate code between layers without asking. [A2]
- `src/lib/db/schema.ts` is not guaranteed to match production — schema changes
  have gone through drizzle-kit push, the Supabase dashboard, and migrations at
  different times. Inspect the live DB before schema-dependent work. [A3]
- Never display or compute win/loss records for lawyers — only neutral
  verifiable metrics (court appearances, years at bar, response rate). [A10]
- Never re-run the Bar Council scraper against production: it is currently
  destructive — the update payload resets `is_claimed: false` and overwrites
  contact/firm fields on existing rows (see .Codex/rules/scrapers.md). [A12 +
  code review 2026-07-08]

## Sacred vs disposable

High-risk — verify end-to-end before pushing: public SEO pages + sitemap +
metadata; scraped lawyer data; auth + claim/verification flow; enquiries +
Stripe checkout. [A6]

Allowed to stay ugly — do not polish or refactor: the insights page and the
3D/motion flair (three.js, Remotion, framer-motion). Everything else, keep to
normal quality. [A6f]

## In flux — don't over-invest (~6 months) [A14]

- Search: current Postgres/supabase filtering will be replaced by real
  full-text search.
- Payments: Stripe integration is scaffold; go-live is upcoming.
- Court records: the cases table will grow to hold ALL scraped court cases,
  not just the curated famous list. [A11]
- DB layer consolidation (see Hard rules).

## Vocabulary [A11]

- **claimed** — a user account owns the lawyer profile.
- **verified** — identity confirmed against Bar records; stronger than claimed.
- **cases** — curated famous cases today; designed to become all court cases.
- **insights** — aggregate stats derived from scraped Bar Council data.

## Docs

- `docs/decisions.md` — decision log with real reasons; append, don't rewrite.
- `docs/unknowns.md` — open questions ranked by risk; when resolved, record in
  decisions.md and remove here.
- `docs/_chat*.txt` — WhatsApp research exports; local-only, gitignored. [A15]

*[A#] markers reference the 2026-07-08 owner interview (ledger in docs/decisions.md header).*
