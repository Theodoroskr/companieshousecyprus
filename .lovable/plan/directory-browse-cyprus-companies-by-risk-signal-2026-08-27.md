# Directory: browse Cyprus companies by risk signal

Add a public, SSR, SEO-indexable Directory section modelled on the example you shared, but built only from signals we actually hold: the Registrar status data (571k companies) and the sanctions lists we import (EU, UN, UK, OFAC).

## Pages

```text
/directory                      → index of all signals with live counts
/directory/$signal              → paginated company list for one signal
/directory/$signal?page=2       → 100 per page, rel=prev/next, canonical
```

The Directory links into existing A–Z and district pages, and every row links to `/company/$slug`.

## Signal sections (from verified registry data)

| Section | Registry statuses used | Approx. count |
| --- | --- | --- |
| Companies in Court-Ordered Liquidation | Liquidation by court order (+ special administrator variant) | 2,226 |
| Companies in Members' Voluntary Liquidation | Members' voluntary liquidation | 2,597 |
| Companies in Creditors' Voluntary Liquidation | Creditors' voluntary liquidation | 184 |
| Companies in Administration | Under administration; under administration and liquidation | 248 |
| Provisional Liquidator Appointed | Provisional liquidator appointed | 11 |
| Companies Facing Strike-Off | Three-month strike-off notice published | 711 |
| Companies at Risk of Strike-Off | Reminder letter sent | 71,417 |
| Struck-Off Companies | Struck off | 269,400 |
| Dissolved Companies | All dissolved variants | 33,176 |
| Active Companies | Registered | 191,235 |

Each section gets a short plain-language explanation of what the signal means and where it comes from (Department of Registrar of Companies), matching the tone of the example.

## Sanctions section

One further card, "Entities on official sanctions lists", showing the live count of active legal-entity records across EU FSF, UN Consolidated, UKSL and OFAC SDN (currently 13,791 entities). Because we do not hold a verified link between those records and Cyprus registry numbers, this card does not list companies — it explains the four sources and links to the Sanctions Risk Snapshot product and the company search, rather than implying any Cyprus company is listed.

## Not included

PEPs, offshore leaks, criminal proceedings, regulatory enforcement, disqualified directors, receivership and CVAs are UK/ICIJ datasets we do not hold for Cyprus. They are omitted rather than shown as empty sections. They can be added later if we license or ingest those sources.

## Technical notes

- New route files: `src/routes/directory.index.tsx` and `src/routes/directory.$signal.tsx`, both server-rendered via a loader.
- Signal definitions live in one shared module (`src/lib/directory-signals.ts`): slug, title, description, matching `status_en` values, and SEO copy. Used by the index, detail pages and sitemap.
- Counting 571k rows per request would time out (same failure mode we hit on search). Add a `directory_signal_counts` table refreshed by a security-definer function on the existing cron, and read counts from that table.
- Listing queries use a new security-definer RPC filtered on indexed `status_en` with keyset/offset pagination capped like `companies_by_letter_page`, plus a supporting index on `(status_en, name)`.
- Apply the existing 24h `s-maxage` cache headers from `src/lib/http-cache.server.ts`.
- Per-page `head()` with unique title/description/canonical, `noindex` beyond a page-depth threshold to avoid thin pagination, and `BreadcrumbList` + `ItemList` JSON-LD.
- Add `/directory` and each signal page to the page sitemap, and a Directory link in the site footer so crawlers reach every section.
