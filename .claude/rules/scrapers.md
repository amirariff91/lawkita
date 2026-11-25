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
- Re-running the Bar Council scraper rewrites live lawyer rows and the site is
  live [A1]: ask the owner before running it against production [A12]. The
  2026-07-08 review found that an update reset `is_claimed` and overwrote
  name/contact/firm fields; that was fixed on 2026-09-13 (commit d3e93d1). An
  update now keeps ownership, changes only Bar status fields on claimed rows,
  and on unclaimed rows fills empty contact fields and may replace the firm
  (`canFillLawyerField` in src/lib/scrapers/malaysian-bar-scraper.ts). New
  rows are inserted unclaimed.
- Whether the news-crawler cron is scheduled anywhere is unknown [A5f] — don't
  assume it runs (docs/unknowns.md #6).
- Outcomes of the e-judgment scraper and Bar Council API discovery experiments
  were never recorded and are forgotten [A9]. Check docs/unknowns.md #7 and
  re-derive findings before building on either.
