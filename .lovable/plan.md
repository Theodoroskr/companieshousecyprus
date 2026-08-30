# Show directors & secretary on company pages + GDPR suppression module

## Goal
Render officials' full names on company profile pages (currently masked and blurred), and add an admin module so names requested for removal under GDPR are suppressed site-wide.

## Current state (verified)
- `getCompanyBySlug` (src/lib/companies.functions.ts) already fetches `person_name, position_en, position_el` from `public.officials` — 1.18M named rows covering ~522k of 571k companies.
- `src/routes/company.$slug.tsx` masks every officer name via `maskName()` plus a blur style, then shows an "Unlock the full names" paywall.
- Business Names keep the masked "Owner" section with the structure-report paywall (earlier requirement) — unchanged.
- Some companies (e.g. C266206 / COFFEE LOVERS LTD) genuinely have no officials rows; the existing empty state covers that.
- Admin lives under `src/routes/_authenticated/admin.*` with a shared `admin.tsx` layout and role gating via `is_support_or_admin`.

## Part 1 — Unmask officials on company pages
- Render the full `person_name` for directors/secretary (remove `maskName` + blur in the non-business-name branch).
- Show the English position, with the Greek term in parentheses when it differs.
- Reword the certificate CTA: names are free to view; the paid product is the Registrar-certified Certificate of Directors & Secretary (for banks, KYC, legal use).
- Keep the "not published in our copy of the register" empty state.
- Business Name owners remain masked.

## Part 2 — GDPR suppression module (admin)
### Database
New table `public.officials_suppressions`:
- `person_name` (normalised key), optional `company_slug` (null = suppress that name everywhere), `reason`, `requester_email`, `status` (active / lifted), `created_by`, timestamps.
- RLS: only admins can read/write; a security-definer helper exposes the suppression check to server reads. GRANTs for `authenticated` and `service_role` as required.
- Officials reads filter out suppressed names, replacing them with a neutral placeholder ("Name withheld on request") rather than dropping the row, so board size stays accurate.

### Admin UI — `/admin/gdpr`
- Table of suppression requests with search, status filter, and date.
- "Add suppression" form: person name, optional company (slug or search), requester email, reason, internal notes.
- Actions: lift a suppression, delete a mistaken entry, and a link to the affected company page.
- Access restricted to admins (not support), matching existing role gating patterns.
- Link added to the admin navigation in `admin.tsx`.

### Site-wide effect
- Company profile officials list shows "Name withheld on request" for suppressed entries.
- Related-companies "shared official" links skip suppressed names.
- Suppressing a name re-queues the affected company pages for IndexNow so search engines refresh cached copy.

## Technical notes
- Filtering happens server-side inside `companies.functions.ts` (and the related-companies query), so suppressed names never reach the browser or SSR HTML.
- Suppression matching is on a normalised (case/accent-insensitive, whitespace-collapsed) name.
- `maskName` stays in `format.ts` for the Business Name owner branch.
- Verify: a company with officials (C4404), one without (C266206), and one with an active suppression.
