---
paths:
  - "src/lib/scrapers/**"
  - "scripts/**"
  - "supabase/functions/**"
  - "src/app/api/admin/scraping/**"
  - "src/app/api/cron/**"
---

# Scrapers and data pipeline

- Scraped lawyer data is sacred — it is the product [A6]. `lawyers.scraped_data`
  holds the original scrape for conflict resolution; never drop or overwrite it.
- Re-running the Bar Council scraper is CONFIRMED DESTRUCTIVE (code review
  2026-07-08, resolving what the owner couldn't recall [A12]): the update
  payload sets `is_claimed: false` and overwrites name/contact/firm fields and
  `scraped_data` on existing rows
  (src/lib/scrapers/malaysian-bar-scraper.ts:445,471). The site is live [A1].
  Never run it against production until the upsert preserves claimed/edited
  profiles — fixing that is a prerequisite, not an option.
- Whether the news-crawler cron is scheduled anywhere is unknown [A5f] — don't
  assume it runs (docs/unknowns.md #6).
- Outcomes of the e-judgment scraper and Bar Council API discovery experiments
  were never recorded and are forgotten [A9]. Check docs/unknowns.md #7 and
  re-derive findings before building on either.
