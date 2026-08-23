# CompaniesHouseCyprus SEO rebuild plan

Rebuild the new companieshousecyprus.com app on the current TanStack Start template, connected to Lovable Cloud. The goal is server-rendered HTML for every company page so Google indexes the content instead of leaving it "Crawled – currently not indexed".

## What we build first

Everything from the playbook except the paid api4all order flow (Step 7). That is a later monetization layer and needs external credentials/payments first.

## 1. Enable Lovable Cloud

Provision the built-in backend for this project. This creates the Postgres database and auth stack we connect to. No external Supabase account is needed.

## 2. Database schema and indexes

Create the `companies` and `officials` tables exactly as the playbook defines, including `pg_trgm`, primary keys, indexes and read-only Row Level Security for `anon`.

- `companies` table: `slug` primary key plus all name, status, address, type and date fields.
- `officials` table: linked to `companies` by `slug`.
- Indexes: `gin_trgm_ops` on `name`, district/status filters, address full text, and official slug lookups.
- RLS: `public read` SELECT policy for `anon` on both tables; no write policies.

## 3. Seed sample data

Load a small sample of representative companies (including SOFTBOT/HE252407) so the routes render immediately while you run the full `setup.sh`/`etl_registrar.py` bulk load offline. The bulk load of 571,218 rows is outside Lovable; you run that locally with the connection string once the schema is ready.

## 4. Company page route

Route: `/company/$slug`.

- Server-side loader queries `companies` and `officials` by `slug` using `createServerFn`.
- Returns real HTTP 404 (not a 200 error page) when the slug does not exist.
- Renders `<h1>`, status line, registration details, address, and officers list.
- Omits any line where the value is null; no empty placeholders.
- Link to up to 10 other companies sharing the same `address_full`.

## 5. Server-rendered metadata and JSON-LD

For every `/company/$slug` route:

- Title: `{name} — {official_no} | Companies House Cyprus`
- Description built from real values, skipping null clauses.
- Self-referencing canonical URL.
- Open Graph tags.
- JSON-LD `Organization` with `PostalAddress` and `BreadcrumbList`.

All metadata must appear in the initial HTML response.

## 6. Sitemaps and robots

- `/sitemap.xml` dynamic server route returning a sitemap index of 12 child sitemaps (50,000 URLs each).
- `/sitemaps/companies-$n.xml` dynamic server routes returning the real urlset, ordered by slug, with `lastmod` from `updated_at`.
- `/robots.txt` allowing all crawlers, blocking `/search`, `/cart`, `/my-account`, and pointing to the sitemap index.

## 7. Directory pages

- `/companies/a-z/$letter` — companies starting with the given letter, 100 per page, `rel=prev/next` and canonical.
- `/companies/city/$district` — active companies by `district_en`, 100 per page, for Nicosia, Limassol, Larnaca, Paphos, Famagusta and Kyrenia.
- Each listing links to the company page with name, official number and status.
- A shared header/footer links the A–Z index and district pages so crawlers can reach every deep page.

## 8. Search

- `/search?q=` server-rendered route using the `pg_trgm` `name` index.
- Shows name, official number, status and district.
- Adds `<meta name="robots" content="noindex,follow">` to every search result page.
- Search box in the site header, present on every page.

## 9. Shared chrome

- Header: logo, search box, main navigation links.
- Footer: A–Z index, district links, and any static/legal links.
- Minimal, clean design consistent with the existing light theme.

## 10. Verification

Before moving on, verify:

- `/company/C252407` raw HTML contains "SOFTBOT".
- `/company/ZZZ999` returns HTTP 404.
- `/sitemap.xml` lists 12 child sitemaps.
- The last child sitemap contains real URLs.
- `/robots.txt` does not block public pages.
- Search result pages carry `noindex,follow`.

## 11. Handoff for bulk data

After the app is built, you will run the local `setup.sh` / `etl_registrar.py` pipeline against the Lovable Cloud connection string to load the full 571,218 companies. The app will then use the real table instead of the sample.

## Out of scope this round

- API4ALL report ordering (Step 7) — requires credentials and a payment flow; handled separately once the SEO core is live.
- CDN routing / WordPress coexistence (Step 8) — deployment-layer work for your sysadmin.
- Deindexing investigation — separate urgent task, not part of this build.
