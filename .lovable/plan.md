# Company profile titles, descriptions and H1 templates

## What you're seeing on Google

The snippet you pasted ("is a registered in Cyprus. The company was registered at with a registered address .") is **not** what the site serves today. I fetched `https://companieshousecyprus.com/company/C409882` from the running app and it already returns:

- Title: `JOBALITO RECTECH LTD (HE409882) — Cyprus company profile`
- Description: `JOBALITO RECTECH LTD, HE409882: Reminder letter sent Cyprus company. Registered office, directors, secretary and Registrar certificates.`
- H1: `JOBALITO RECTECH LTD`

So the blank-placeholder text is Google's **cached snippet from the old WordPress page**. It will disappear on re-crawl. What we can do now is make the templates stronger so the refreshed snippet earns the click.

## Template changes

**Title** (keep the exact company name first, trim to ~60 chars):
`JOBALITO RECTECH LTD — HE409882 | Cyprus company register`

**Meta description** — build from real fields instead of the raw registrar status string ("Reminder letter sent" reads badly in a snippet). Pattern:
`JOBALITO RECTECH LTD (HE409882) — private limited company registered in Nicosia, Cyprus on 12/03/2019. Registered office, officials, filing status and certificates available to order.`

Rules:
- Omit any clause whose field is empty — never emit an empty gap like the old page did.
- Status text mapped to plain wording (Active / Dissolved / Struck off / Filing overdue), not the raw registrar phrase.
- Hard-capped at 155 characters, cut on a word boundary.

**H1** — company name stays the H1 (exact registry name, best match for branded queries), with the registration number as a sibling line, not inside the H1.

Business names/partnerships keep their existing wording (owner instead of directors).

## The "two" question — both URL forms stay live

Both URL shapes resolve to the same profile today and will keep working:
- `/company/C409882` — the shape Google has indexed for years
- `/company/jobalito-rectech-ltd-c409882` — the pretty form

Because the short form is the one with years of indexing history, it stays the **canonical** URL: the pretty form will emit a self-referencing canonical pointing at the short form, so link equity consolidates on the URLs Google already knows and nothing gets treated as duplicate content. Sitemaps continue to list the short form only.

## Technical notes

- `src/routes/company.$slug.tsx`: extend the loader's returned fields (registration_date, type_en, district_en, status_group) and move the title/description builders into a small helper so both `head()` and the page reuse them.
- New helper (e.g. `src/lib/seo/company-meta.ts`): `companyTitle()`, `companyDescription()`, plain-language status mapping, length capping.
- Canonical + `og:url` normalised to `/company/{ID}` via `normalizeCompanySlug` in `src/lib/slug.ts`.
- No database, pricing, or ordering logic touched.

## After it ships

Publish, then request re-indexing for a couple of sample profiles in Search Console. The 571k profiles refresh on Google's own crawl schedule — the stale placeholder snippets fade as pages are re-fetched.
