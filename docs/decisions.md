# Decision log

One entry per decision: date, decision, the real reason. Append at the top.
Seeded 2026-07-08 from an owner interview; earlier dates recovered from git.

The [A#] markers in CLAUDE.md and .claude/rules/ cite these interview answers:
A1 live in prod, resuming · A2 DB end-state undecided · A2f Drizzle→Supabase
root cause forgotten · A3 schema changes via mixed flows · A4 bun everywhere ·
A5/A5f Coolify, push-to-main deploys; cron unconfirmed · A6 sacred = SEO,
scraped data, auth+claim, enquiries+Stripe · A6f ugly-allowed = insights +
3D/motion only · A9 failed-experiment outcomes forgotten · A10 legal rules:
confidence gate, review moderation, no win/loss · A11 vocab; cases = all court
cases eventually · A12 scraper re-run safety unknown (later confirmed
destructive by code review) · A13 pre-push gate build+type-check+lint ·
A14 6-month flux: search, payments, court records, DB consolidation ·
A15 _chat = local research; PRD historical · A16 review auto-publish policy
undecided · A17 canonical domain = lawkita.com.

## 2026-09-12 — Public lawyer data is visibility-gated
SHIPPED: public case associations exclude lawyers who opt out
(`case_association_opt_out`); lawyer review metrics are recomputed from
currently published reviews after every publish/unpublish transition; empty
practice-area matches return no analytics distribution. DEFERRED: gating public
associations on `case_lawyers.is_verified` — held pending a live-DB check of
verified-row coverage, because shipping it while curated associations are
unverified would blank every case page (see docs/unknowns.md). Reason: public
profiles and JSON-LD must not expose hidden-review ratings, and must not expose
unverified associations once the `is_verified` gate is safe to enable.

## 2026-07-08 — Canonical domain is lawkita.com
Owner-confirmed [A17]. The code's `https://lawkita.my` fallbacks
(src/lib/utils/seo.ts, sitemap.ts, robots.ts) are wrong; production relies on
NEXT_PUBLIC_APP_URL. Don't propagate the .my literal.

## 2026-07-08 — Bar Council scraper re-run: confirmed destructive (resolved unknown)
Codex code review resolved former unknowns #1: the update payload resets
`is_claimed: false` and overwrites contact/firm fields and scraped_data on
existing rows (malaysian-bar-scraper.ts:445,471). Rule: never re-run against
production until the upsert protects claimed/edited profiles.

## 2026-07-08 — Pre-push gate: build + type-check + lint
Pushing main deploys production via Coolify with no CI. All three of
`bun run build`, `bun run type-check`, `bun run lint` must pass locally first.

## 2026-07-08 — DB layer end-state: deliberately undecided (for now)
Drizzle and supabase-js coexist by drift. No winner chosen; consolidation is a
~6-month roadmap item. Until then: match the file's existing client, no
cross-layer migrations without approval.

## 2026-07-08 — Bun is the package manager
Bun is what's actually used; the Dockerfile and seed scripts already assume it.
yarn.lock and the `packageManager: yarn` field are dead leftovers.

## 2026-07-08 — Legal display rules
1) Public lawyer-case associations are confidence-gated; low-confidence or
news-only data needs human review. 2) Reviews go public only after moderation
approval. 3) No win/loss records, ever — neutral verifiable metrics only.
Reason: defamation exposure in Malaysia; trust is the product.

## 2026-07-08 — cases table scope: all court cases eventually
Not just the curated famous-cases list. Reason: the court-records pipeline is
the long-term data moat.

## 2026-07-08 — Sacred vs disposable surfaces
Sacred: public SEO pages, scraped lawyer data, auth + claim flow, enquiries +
Stripe. Ugly-allowed: insights page and 3D/motion flair only. Reason: the
former are traffic and revenue; the latter are experiments.

## 2026-07-08 — Roadmap (~6 months): search, payments go-live, court records, DB consolidation
These zones are in flux — don't over-invest in code slated for replacement.
Stripe today is scaffold, not live billing.

## 2026-07-08 — PRD.md is historical
2026-01-27 snapshot of original intent. The stack diverged (NextAuth →
better-auth; Meilisearch/Redis/BullMQ/MinIO/Dokploy never built; Supabase +
Coolify instead). Useful history, not current truth.

## 2026-07-08 — docs/_chat*.txt are local research
WhatsApp exports used as research material. Keep on disk, gitignored, out of
the repo history going forward.

## ~2026-01 — Deployed on Coolify; push to main = production deploy
Self-hosted PaaS building the Dockerfile. (Owner-confirmed 2026-07-08.)

## 2026-01-28 — cases queries moved Drizzle → supabase-js (reason lost)
The commit says "fix" but the root cause is forgotten. Recorded so nobody
reverses it blindly. See docs/unknowns.md #1.
