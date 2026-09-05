# New products: Company Monitoring, Complete Certificate Pack, add-on services

## What we're building

### 1. Company Monitoring (subscription)
A paid watchlist. A customer adds Cyprus companies to a watchlist and gets an email whenever the registry record changes.

- Price: €99 per year, per company watched (VAT 19% on top).
- Alerts on: status change (e.g. active → strike-off), directors/secretary change, registered office change, name change.
- Customer sees a "Monitoring" section in their account: companies watched, last checked, recent alerts, and a button to stop monitoring.
- A "Monitor this company" button on each company page and in the pricing catalogue.
- Daily check against the registry data we already refresh; one alert email per company per day at most.

### 2. Complete Certificate Pack (one-off)
Every Registrar certificate we offer, in one indexed bundle.

- Price: €260 (vs €330 bought separately).
- Contents: Good Standing, Incorporation, Directors & Secretary, Shareholders, Registered Office, Capital, Memorandum & Articles.
- Delivered as a single paginated PDF plus the individual files, same fulfilment path as the existing KYB pack.

### 3. Add-on services (orderable, not just "on request")
Services the office currently handles manually, shown as a proper "Add-on services" section on the pricing page and offered at checkout for certificate orders:

- Apostille certification — €100 (already exists internally; make it visible and orderable alongside certificates).
- Certified translation (Greek ↔ English) — €90 per document.
- Courier delivery of hard copies — €35.

Each add-on can also still be raised by staff as a follow-up order with a payment link, exactly like the apostille flow today.

## Technical notes

- **Products**: add `company-monitoring`, `complete-certificate-pack`, `certified-translation`, `courier-delivery` to `src/lib/products.ts` with tax code `txcd_10103001`; flip `apostille-certification` from `internalOnly` to public. Add-ons get a new `addOn: true` flag so the pricing page groups them and the cart offers them next to eligible certificate items. Sync to Stripe via `/admin/products`; monitoring uses a yearly recurring price.
- **Monitoring schema** (single migration, with GRANTs then RLS):
  - `company_watches` — user_id, company_slug, status, started_at, expires_at, last_checked_at, stripe subscription reference. RLS scoped to `auth.uid()`; service_role full access.
  - `company_watch_alerts` — watch_id, change_type, previous_value, new_value, detected_at, emailed_at. Owner-read only.
  - `company_watch_snapshots` — the last-seen field values per watched company, used for diffing.
- **Monitoring job**: a new key in `job_state` plus a pg_cron entry hitting an `/api/public/*` route (secret-checked like the existing cron jobs) that diffs `companies` + `company_officials_public` against the snapshot, writes alerts, and sends one digest email per watch.
- **Email**: new `company-watch-alert` template registered in `src/lib/email-templates/registry.ts`, sent through the existing `send-email.ts` (office copy already applies).
- **Checkout**: monitoring is a Stripe subscription — the webhook activates/expires `company_watches`; all reads filter on `environment`. Pack and add-ons follow the existing one-off order path; the pack maps to `certificateCount: 7` for service-fee/VAT maths.
- **Account UI**: new Monitoring panel under `/account`, plus "Monitor this company" CTA on company pages.

## Order of work
1. Migration for the three monitoring tables.
2. Product catalogue entries + pricing page grouping for add-ons.
3. Checkout/webhook wiring (subscription for monitoring, one-off for pack and add-ons).
4. Daily diff job + alert email.
5. Account monitoring panel and company-page CTA.
