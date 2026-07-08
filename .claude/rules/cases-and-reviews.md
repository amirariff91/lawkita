---
paths:
  - "src/app/(public)/cases/**"
  - "src/components/cases/**"
  - "src/lib/services/confidence-scoring.ts"
  - "src/lib/ai/**"
  - "src/lib/jobs/**"
  - "src/app/api/reviews/**"
  - "src/app/api/admin/reviews/**"
  - "src/components/reviews/**"
---

# Cases, lawyer associations, reviews — legal exposure

Lawyer-case associations and reviews carry defamation risk in Malaysia.
Owner-confirmed hard rules [A10], with code-verified gaps (Codex review
2026-07-08):

- Confidence gate: never surface a lawyer-case association publicly when it is
  low-confidence or news-only sourced without human review. **This is target
  policy, NOT current behavior**: news-crawler inserts associations with
  `isVerified: false` (src/lib/jobs/news-crawler.ts:383) and the public
  case/profile queries do not filter on `is_verified`, `confidence_score`, or
  `source_type` (src/lib/db/queries/cases.ts:179, queries/lawyers.ts:271).
  Do not add new public surfaces that skip the gate, and do not assume
  existing ones comply. The numeric threshold is unresolved
  (docs/unknowns.md #5) — when in doubt, route through admin review.
- Reviews: owner policy said moderation-only [A10], but /api/reviews
  auto-publishes when AI document verification scores ≥90%
  (src/app/api/reviews/route.ts:95) and public reads filter only
  `is_published` (queries/lawyers.ts:250). The owner has NOT decided which is
  correct [A16] (docs/unknowns.md #3) — don't extend either path until they do.
- Never display or compute win/loss records — neutral metrics only.
- `caseAssociationOptOut` is **partially implemented**: case search previews
  filter it (queries/cases.ts:358) but case detail and lawyer profile
  associations do not. The owner did not confirm opt-out as absolute policy
  when asked [A10]. Don't build on it either way without an explicit decision
  (docs/unknowns.md #4).
- Design for volume: the cases table is intended to eventually hold all
  scraped court cases, not a small curated list [A11].
