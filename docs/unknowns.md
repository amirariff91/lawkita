# Unknowns — open questions ranked by risk

Questions the owner could not answer (interview 2026-07-08, updated same day
after a Codex code review). Resolve → record in docs/decisions.md → delete here.

## 1. What broke that forced cases queries off Drizzle? (HIGH)
The 2026-01-28 "fix" migration's root cause is forgotten. Risk: the planned
DB-layer consolidation could reintroduce it. Diagnose before consolidating
(suspects: Supabase pooler vs postgres.js, build-phase DB access).

## 2. Does schema.ts match the production database? (HIGH)
Schema changes went through drizzle-kit push, the Supabase dashboard, and
migrations at different times. Diff the live DB against src/lib/db/schema.ts
before the next schema change.

## 3. Review publishing policy: moderation-only or AI auto-publish? (MEDIUM-HIGH)
Owner first said moderation-only, but the code auto-publishes reviews when AI
document verification scores ≥90% (src/app/api/reviews/route.ts:95). Asked
directly on 2026-07-08, the owner said UNDECIDED. Until decided, don't extend
either path — no new auto-publish triggers, no weakening of moderation.

## 4. Is caseAssociationOptOut actual policy? (MEDIUM-HIGH)
The column exists and is PARTIALLY enforced — case search previews filter it
(src/lib/db/queries/cases.ts:358) but case detail and lawyer profiles do not.
Owner did not confirm opt-out as an absolute rule when asked directly. Legal
implications either way — needs a decision, then consistent enforcement.

## 5. What confidence threshold gates public display? (MEDIUM)
The gate is confirmed policy but no number or mechanism was specified — and
today it is not enforced anywhere: public queries don't filter on
is_verified/confidence_score/source_type (queries/cases.ts:179,
queries/lawyers.ts:271). Needs a threshold AND an enforcement point.

## 6. Is the news-crawler cron scheduled anywhere? (MEDIUM)
/api/cron/news-crawler exists (CRON_SECRET), but nothing confirms Coolify or
anything else calls it.

## 7. Outcomes of the e-judgment and Bar Council API experiments (MEDIUM)
scripts/test-ejudgment-scraper.ts and scripts/discover-bar-council-api.ts have
no recorded results and the owner can't remember. The court-records pipeline
is on the roadmap — re-derive these findings before building it.

## 8. How far did the Stripe scaffold get? (LOW-MEDIUM)
Payments go-live is planned; unknown which parts (checkout, webhook, portal)
were ever exercised against a real Stripe account.

## 9. Who uses each surface and what do they complain about? (LOW)
Not covered — the 15-question interview budget ran out. Site has real traffic
but no recorded user-feedback picture.
