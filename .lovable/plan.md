# Show directors & secretary names on company pages

## Goal
Render officials' full names on company profile pages (currently masked with `maskName` + blur), so pages are richer for users and search engines — matching what competitors show.

## Current state (verified)
- `getCompanyBySlug` (src/lib/companies.functions.ts) already fetches `person_name, position_en, position_el` from `public.officials` — 1.18M named rows covering ~522k of 571k companies.
- `src/routes/company.$slug.tsx` renders the "Directors & secretary" section but masks every name via `maskName()` (src/lib/format.ts) with a blur style, then shows an "Unlock the full names" paywall box.
- Business Names keep a masked "Owner" section by design (earlier requirement) — unchanged.
- COFFEE LOVERS LTD (C266206) genuinely has **no** officials rows in our copy of the register — the empty state already handles this.

## Changes

### 1. Unmask officials on company pages (`src/routes/company.$slug.tsx`)
- Render the full `person_name` for directors/secretary (remove `maskName` + blur for the non-business-name branch).
- Show position in English, with the Greek position in parentheses when different.
- Keep the certificate CTA but reword it: names are free to view; the paid product is the **Registrar-certified** Certificate of Directors & Secretary ("certified copy for banks, KYC, legal use"). Reword the intro line accordingly.

### 2. Keep Business Names unchanged
- Owner stays masked with the structure-report paywall (separate earlier requirement).

### 3. Empty-state polish
- Keep the existing "not published in our copy of the register" message (covers C266206-style gaps); no change needed beyond copy check.

### 4. Optional SEO boost
- Add `employee`/`director`-style structured data is risky for accuracy; instead ensure the officials list is inside the SSR HTML (it already is) so Google indexes names — no JSON-LD change.

## Technical notes
- No database or RLS changes needed — the data is already fetched.
- `maskName` stays in `format.ts` (still used by the Business Name owner branch).
- Verify on a company with officials (e.g. C4404) and one without (C266206).
