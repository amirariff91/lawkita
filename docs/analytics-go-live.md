# Analytics go-live (GA4 + GTM)

The code is wired and **env-gated**: `src/app/layout.tsx` renders `<GoogleTagManager>`
only when `NEXT_PUBLIC_GTM_ID` is set (GTM-handles-GA4 pattern, consent-mode script
runs first). Until that env var is set, **no analytics scripts are injected** — the
site behaves as before. GSC is verified via a DNS TXT record (no meta tag needed).

Nothing here can be done by Claude Code — it requires access to Google Tag Manager /
Google Analytics UIs and to Coolify. Steps for the owner:

## 1. Create the GTM container + GA4 property
- **GTM** (tagmanager.google.com): Admin → Create Account (`Lawkita`, Malaysia) →
  Container `lawkita.com`, platform **Web** → Create. Copy the **Container ID `GTM-XXXXXXX`**.
- **GA4** (analytics.google.com): Admin → Create Property (`Lawkita`, TZ Kuala Lumpur,
  MYR) → Data streams → Add Web stream, URL `https://lawkita.com`. Copy the
  **Measurement ID `G-XXXXXXXXXX`** and the numeric **Property ID**. Set data
  retention to 14 months.

## 2. Wire GA4 inside GTM
- GTM → Tags → New → **Google Tag**, tag ID = the `G-XXXXXXXXXX`.
- Trigger: **Initialization — All Pages**. Do not add consent settings on the tag
  (the app pushes `gtag('consent','default',{analytics_storage:'granted',ad_storage:'denied'})`).
- Submit → Publish.

## 3. Set the env var + deploy
- Coolify (app `lawkita-web`) → Environment Variables → `NEXT_PUBLIC_GTM_ID=GTM-XXXXXXX`.
- `NEXT_PUBLIC_*` is **build-time inlined**, so **redeploy** (not just restart).
  Deploys come from the `migrate/supabase-to-postgres` branch.

## 4. Verify after deploy
```bash
curl -s https://lawkita.com | grep -o 'GTM-[A-Z0-9]\{6,\}' | head -1        # container present
curl -sI 'https://www.googletagmanager.com/gtm.js?id=GTM-XXXXXXX' | head -1  # HTTP 200
```
Then GA4 → Realtime (open a couple of pages) and GTM Tag Assistant preview.

## Durable live-API reads (later, if needed)
Do NOT use gcloud user ADC (`analytics.readonly` is blocked on gcloud's default OAuth
client). Use a **service account added as a Viewer inside the GA4 property + Search
Console**, key JSON in `GA4_SERVICE_ACCOUNT_KEY` + numeric `GA4_PROPERTY_ID` — the
pattern used by the sibling `tcgkl-web` project (`src/server/analytics/ga4.ts`). Enable
`analyticsdata`, `analyticsadmin`, `searchconsole` APIs. GSC service-account grant must
be **Owner** (not Restricted) or the API 403s.

## Gotchas
- Measurement ID (`G-…`, client tag) ≠ numeric Property ID (Data API). Mixing them → empty reports.
- Don't also paste the raw gtag.js snippet — GTM's GA4 tag is the only client tag.
