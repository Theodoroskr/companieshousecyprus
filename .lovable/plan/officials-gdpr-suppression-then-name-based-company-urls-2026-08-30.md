# Officials + GDPR suppression, then name-based company URLs

Two phases. Phase 1 ships first and is measured before Phase 2 starts.

---

## Phase 1 — Show directors & secretary, plus a GDPR suppression module

### Current state (verified)
- `getCompanyBySlug` in `src/lib/companies.functions.ts` already fetches `person_name, position_en, position_el` — 1.18M named rows covering ~522k of 571k companies.
- `src/routes/company.$slug.tsx` masks every officer name via `maskName()` plus a blur, then shows an "Unlock the full names" paywall.
- Business Names keep the masked "Owner" section with the structure-report paywall — unchanged.
- Some companies (e.g. C266206 / COFFEE LOVERS LTD) genuinely have no officials rows; the existing empty state covers that.
- Admin lives under `src/routes/_authenticated/admin.*` with a shared `admin.tsx` layout, role-gated by `is_support_or_admin`.

### 1a. Unmask officials on company pages
- Render the full `person_name` for directors and the secretary (drop `maskName` + blur in the non-business-name branch).
- Show the English position, with the Greek term in parentheses when it differs.
- Reword the certificate CTA: names are free to view; the paid product is the Registrar-certified Certificate of Directors & Secretary (banks, KYC, legal use).
- Keep the "not published in our copy of the register" empty state; Business Name owners stay masked.

### 1b. GDPR suppression module
New table `public.officials_suppressions`: person name (plus a normalised key), optional company slug (null = suppress everywhere), requester email, reason, internal notes, status (active / lifted), created_by, timestamps. Admin-only RLS with the required GRANTs.

Two security-definer read helpers return officials with suppressed names withheld, so a suppressed name never reaches SSR HTML or the browser:
- company profile shows "Name withheld on request" in place of the name, keeping the board size accurate;
- related-companies "shared official" links skip suppressed names entirely.

Note: the first attempt at this migration failed with `function unaccent_safe(text) does not exist` — the helper was referenced before it was declared. Nothing was applied; the retry declares helpers in dependency order.

Admin UI at `/admin/gdpr`, admin-only (not support), linked from the admin nav:
- table of requests with search, status filter and date;
- add-suppression form (person name, optional company, requester email, reason, notes);
- lift a suppression, delete a mistaken entry, jump to the affected company page;
- suppressing re-queues affected company pages for IndexNow so cached copy refreshes.

### 1c. Measure
Leave Phase 1 live for 3-4 weeks and compare Search Console positions for company-name queries before starting Phase 2.

---

## Phase 2 — Name-based canonical company URLs

Move `/company/C266206` to `/company/coffee-lovers-ltd-he266206`, with permanent redirects from the ID form.

### Why this is lower-risk here than a typical URL migration
The registrar number stays in the slug, so resolution never depends on the name — `normalizeCompanySlug` in `src/lib/slug.ts` already strips a pretty prefix and returns the ID key, and the legacy redirect layer already resolves registry tokens. The plumbing exists; this formalises it.

### 2a. Slug generation and history
- Add a generated `canonical_slug` on `public.companies` (name slugified + registrar number) and a `company_slug_history` table so every previously-published slug keeps redirecting forever, including after a company renames.
- Backfill in batches with IndexNow triggers suppressed, the same way the earlier bulk backfills were done.

### 2b. Serving and redirects
- `/company/$slug` resolves via the ID key as it does today, then compares the requested slug to `canonical_slug`; any non-canonical form (ID, stale name, wrong case) returns a **301 to the canonical URL** rather than rendering.
- Canonical tag, `og:url` and JSON-LD `url` all emit the canonical form.

### 2c. Audit every URL-emitting surface
All of these must switch together, or Google sees competing canonicals — the failure mode that actually costs rankings:
`src/routes/sitemaps/companies.$n[.]xml.tsx`, `src/lib/seo/company-jsonld.ts`, `src/lib/seo/canonical-health.ts`, `src/lib/change-feed.server.ts`, `src/lib/indexnow.server.ts`, `src/routes/search.tsx`, `companies.a-z.$letter.tsx`, `companies.city.$district.tsx`, `directory.$signal.tsx`, `llms[.]txt.tsx`, the MCP tools (`search-companies.ts`, `get-company-profile.ts`), `api/public/company-lookup.ts`, and order-email links.

### 2d. Staged rollout
- Refresh sitemap chunks so `lastmod` reflects the change and Google re-crawls deliberately.
- Re-notify IndexNow **in batches over several weeks**, not all 571k at once — the queue is already prone to Bing 429 cooldowns.
- Extend the existing canonical-health check to alert on any URL still serving the ID form as canonical.

### Expected impact
A 4-10 week re-crawl period with a temporary dip in clicks, and paused discovery of not-yet-indexed pages while Google works through the redirects. URL keywords are a weak ranking signal on their own; the durable win is Phase 1's richer page content.

---

## Technical notes
- Suppression filtering happens server-side in `companies.functions.ts` and the related-companies query.
- Suppression matching uses a normalised (case- and accent-insensitive, whitespace-collapsed) name.
- `maskName` stays in `format.ts` for the Business Name owner branch.
- Phase 1 verification: a company with officials (C4404), one without (C266206), and one with an active suppression.
- Phase 2 verification: canonical URL renders 200, ID form returns 301, stale name-slug returns 301, sitemap and JSON-LD agree with the canonical tag.
