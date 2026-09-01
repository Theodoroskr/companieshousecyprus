# Registry Activity Feed

A public, crawlable page showing the most recent registry activity, with every entry linking to its company profile. Because the database has no filing-level records, the feed is built from the dates we do hold: registration date, status date and last content update.

## What the page shows

Path: `/registry-activity`, plus paginated pages `/registry-activity/2`, `/3`, …

Two tabs (same page, no JS routing needed — separate query params):
- **Newly registered** — companies ordered by `registration_date` desc.
- **Status changes** — companies whose `status_date` is most recent (strike-offs, dissolutions, reinstatements), showing old-to-new status wording where available.

Each row: company name (canonical link), registration number, type, status badge, district, and the relevant date. Reuses the existing shared company list component and mobile-friendly row layout used by the directory and A–Z pages.

## Why it's worth building

- A page whose content changes every day, giving crawlers a fresh entry point into new company URLs.
- Feeds newly registered companies straight into the IndexNow queue.
- Internal links from the directory and footer spread crawl equity to profiles that currently only appear deep in sitemap chunks.

## Technical notes

- New security-definer RPC `registry_activity_page(p_mode text, p_limit int, p_offset int)` returning canonical slug, name, official_no, type, status, district and the sort date. Grants to `service_role` only, called from the server loader like the existing directory RPCs.
- Supporting indexes on `companies (registration_date desc)` and `companies (status_date desc)` filtered to non-null, so paging stays off the CPU.
- Server-side cache with a 10-minute TTL plus stale-while-revalidate, and HTTP cache headers, matching `src/lib/http-cache.ts` usage on the district pages.
- Pagination capped at 20 pages (1,000 entries) to avoid deep-offset scans; deeper pages return `noindex`.
- Route metadata: unique title/description, canonical per page, `ItemList` JSON-LD, `prev`/`next` links. Page 1 added to the pages sitemap.
- Footer and `/directory` link to the feed.
- No officer names anywhere on the page, in line with the public masking rules.
