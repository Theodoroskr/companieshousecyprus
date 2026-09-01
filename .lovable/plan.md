# On-demand refresh from the official registrar (DRCOR)

## Short answer

Yes — technically we can fetch that DRCOR page on request. It is a public, unauthenticated
search page, so a server-side fetch for a single company (triggered by a user or an admin)
is feasible. What is not advisable is bulk crawling: DRCOR is an ASP.NET WebForms app
(ViewState, postbacks, session cookies, throttling) and mass scraping would be slow,
fragile and likely to get the IP blocked. It would also go beyond what the site's terms
allow.

So the realistic shape is: **on-demand, one company at a time, cached**.

## What it would do

1. On a company profile, an admin (phase 1) sees a "Refresh from registrar" action.
2. The server fetches the DRCOR search result for that registration number, follows through
   to the company detail page, and parses: name, type, status, status date, registration
   date, registered address.
3. Differences vs our stored row are shown as a diff. Applying the diff updates the company
   row and bumps `content_updated_at` (which already triggers IndexNow requeue).
4. Every attempt is logged (who, when, outcome, raw snippet) so we can audit and detect
   layout changes.

Officials/directors are on a separate DRCOR tab and can be added later once the basic flow
is proven stable.

## Guardrails

- Server-only. Never called from the browser directly.
- Hard rate limit: 1 request per company per hour, and a global cap (e.g. 30/hour) so we
  never look like a crawler.
- Result cached ~24h; repeated clicks return the cached snapshot.
- Timeouts (10s) and graceful failure — the page still renders our stored data if DRCOR is
  down or changes layout.
- Admin-only to begin with. Exposing it to end users (e.g. as a paid "live registry check")
  is a separate decision.

## Technical notes

- New `src/lib/drcor.server.ts`: session bootstrap (GET search page for cookies +
  `__VIEWSTATE`), POST the search, parse results with a light HTML parser, map to our
  company shape.
- New `src/lib/drcor.functions.ts`: `refreshCompanyFromRegistrar` server fn, guarded by
  `requireSupabaseAuth` + admin role check, with rate limiting.
- New table `public.registrar_fetches` (company key, requested_by, status, parsed payload,
  error, created_at) with RLS + GRANTs limited to admins/service_role.
- Admin UI: a refresh button and diff panel on the company page for admins only.
- No changes to the existing ETL/import flows; this is additive.

## Open question

Should the refresh stay admin-only, or should visitors be able to trigger a live check
(free, or as a small paid add-on)? Admin-only is the safe start.
