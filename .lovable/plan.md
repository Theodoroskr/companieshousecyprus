# On-demand refresh from the official registrar (DRCOR)

## What I verified

Two GET variants of the URL you sent work with no login and no form posting:

- Greek: `SearchResults.aspx?name=%25&number=4404&searchtype=optStartMatch&index=1&tname=%25&sc=0`
- English: same URL plus `&cultureInfo=en-AU`

The English version returns clean labels, for number 4404:

- HOT PANTS BOUTIQUE — EE 4404 — Business Name — Current Name — Active
- INFOCREDIT GROUP LIMITED — HE 4404 — Limited Company — Current Name — Active
- MECOS INFOCREDIT LIMITED — HE 4404 — Limited Company — Previous Name — Active
- MECOS LIMITED — HE 4404 — Limited Company — Previous Name — Active

plus a "Last Updated 01/09/2026" stamp. So swapping `number=` gives us live name, type,
name status (current vs previous) and organisation status per registration number,
straight from a URL, in English for reliable parsing.

One limit found: the "Select" link into the full company detail page is an ASP.NET
postback, not a normal URL. So address, registration date, directors and filings are
**not** reachable by simple GET — that step needs session + ViewState emulation and is
deliberately kept out of phase 1.

## What to build

**Phase 1 — live status/name check (simple, reliable)**

1. `src/lib/drcor.server.ts` — fetch the English search URL (`cultureInfo=en-AU`) for a
   given registration number, parse the result table, return rows of `{ name, prefix,
   number, type, nameStatus, orgStatus }`.
2. `src/lib/drcor.functions.ts` — `refreshCompanyFromRegistrar` server fn, admin-only
   (`requireSupabaseAuth` + role check), rate limited.
3. Compare against our stored row and show a diff: name changed, status changed, new
   previous names, or business name vs company mismatch.
4. Applying the diff updates the company and bumps `content_updated_at`, which already
   requeues the page in IndexNow.

**Phase 2 (later, only if phase 1 proves stable)** — ViewState/postback emulation to open
the detail page for address, registration date and officials.

## Guardrails

- Server-side only; never called from the browser.
- 1 fetch per company per hour, global cap around 30/hour, 10s timeout.
- Result cached ~24h; repeat clicks read the cache.
- Failures degrade silently — the page keeps showing our stored data.
- Every attempt logged for audit and to detect layout changes.

## Technical notes

- New table `public.registrar_fetches` (company key, requested_by, status, parsed payload,
  error, fetched_at) with RLS + GRANTs for admins/service_role only.
- Light HTML parsing of the results table; strict row-shape validation so a layout change
  fails loudly instead of writing junk.
- Admin UI: a "Refresh from registrar" button plus a diff panel on the company page,
  visible to admins only.
- Existing bulk import/ETL flows untouched — this is additive and per-company.

## Open question

Admin-only to start, or eventually let visitors trigger a live check (free, or a small
paid "live registry verification" add-on)? Admin-only is the safe first step.
