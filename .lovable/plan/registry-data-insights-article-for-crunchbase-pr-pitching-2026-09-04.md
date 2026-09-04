# Registry data-insights article for Crunchbase/PR pitching

## Goal
Publish a data-driven article on our own site built from our registry statistics, so it can be referenced when submitting to Crunchbase and pitched to business media for backlinks.

## What we'll build

### 1. New article page — `/guides/cyprus-company-landscape-2026`
A data-story guide following the existing `/guides/register-company-cyprus` layout, tentatively titled "The Cyprus company landscape in 2026: what 571,000 registered entities tell us" (exact angle confirmed against the live stats):

- **Sections**: total registered entities and status mix; new registrations trend (monthly/yearly); most common company types and activities (from the name-pattern statistics); geographic spread by district; what this means for anyone doing business with Cyprus companies (verification, due diligence).
- **Data grounding**: all figures pulled from the real registry data we already publish on `/statistics` and `/statistics/company-names` — no invented numbers. Charts embedded or linked to the statistics pages.
- **Editorial standards**: methodology-free wording (per existing preference — we don't reveal how activities are computed), neutral "Cyprus registry data" attribution, author/about block for Infocredit Group Limited (HE4404) to satisfy Crunchbase-style editorial scrutiny.
- **Internal links**: search, directory, `/statistics`, `/statistics/company-names`, pricing, related guides and registry topic pages.
- Added as a card on the `/guides` hub.

### 2. SEO & structured data
- Unique title/description/OG, self-referencing canonical and og:url on `https://companieshousecyprus.com`.
- `Article` + `BreadcrumbList` JSON-LD; `Dataset` JSON-LD linking to the statistics pages where appropriate.
- Added to `STATIC_PAGES` in `src/lib/seo/site-pages.ts` (appears in `/sitemaps/pages.xml`) and submitted via the existing IndexNow queue.

### 3. Crunchbase submission support (manual step for you)
Crunchbase doesn't accept third-party article publishing via code — two things only you can do on crunchbase.com:
1. Create/claim the **Companies House Cyprus company profile** (free) and link it to the new article as a press/news reference.
2. Optionally pitch the article to Crunchbase News or link it from the profile's "Recent News" section.

I'll prepare the profile-ready summary text (short description, long description, founded/category keywords) inside the plan delivery so you can paste it in.

## Verification
- Typecheck + sitemap regression tests.
- HTTP 200 check on the new URL and H1 render, then IndexNow submission.

## Technical notes
- New route `src/routes/guides.cyprus-company-landscape-2026.tsx` reusing existing guide components/tokens; register in `src/routes/guides.index.tsx` and `src/lib/seo/site-pages.ts`.
- Stats figures read from the same source as `/statistics` (`src/lib/registry-statistics.ts`) and the company-name stats cache — article text will cite only numbers we actually render elsewhere on the site.
- No database or product changes.
