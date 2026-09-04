# Keyword gap vs i-cyprus.com + new registry topic pages

## What the gap analysis showed

Semrush (US database) confirms i-cyprus.com as the closest organic competitor (relevance 0.52, 199 shared keywords, ~614 est. monthly visits vs our ~465). But the raw keyword-gap list is almost entirely brand noise — single company names such as "artirid", "camilano", "fondano", plus queries like "<domain> customer service phone number". Those are captured by company detail pages, not by new content, and we already generate a page per registered entity.

The real, addressable gap is registry procedure and document topics — the informational layer i-cyprus and the official registry rank for. Cyprus-market volumes for these terms are small (e.g. "certificate of shareholders cyprus" ~20/mo, difficulty very low), so the play is a cluster of low-difficulty pages that also feed our paid report products, not one high-volume page.

## Pages to add

Four new entries in the existing registry landing system (same pattern as the four added previously, rendered by `/registry/$topic`):

1. `/registry/cyprus-annual-return-he32` — what the HE32 annual return is, deadlines, penalties, how to check filing status on a company page.
2. `/registry/cyprus-company-annual-levy` — the annual levy, who owes it, consequences of non-payment (strike-off link).
3. `/registry/certificate-of-shareholders-cyprus` — what the certificate proves, what it contains, how to obtain it (links to the Structure/Profile report product and apostille add-on).
4. `/registry/cyprus-company-name-approval` — name approval rules, restricted words, how to check whether a name is already taken (links to search + activities statistics).

Each page follows the existing landing shape: intro, 4-6 explanatory sections, FAQ block, internal links to company search and related registry topics, breadcrumb + FAQPage JSON-LD, unique title/description/OG.

## Distribution ("submit for backlinks")

Backlinks cannot be created from the codebase — no tool here can place a link on a third-party site. What this plan will do instead:

- Add the four URLs to the sitemap and to the footer/related-topic internal link blocks (internal link equity).
- Push all four through the existing IndexNow queue and confirm submission.
- Verify each URL returns HTTP 200 and renders its H1.

For genuine off-site links I will hand back a short outreach list (Cyprus business directories, corporate-services blogs, expat/relocation forums, Wikipedia/Wikidata external-link candidates, HARO-style queries) that you or a team member sends. If you want that automated later, connecting Semrush would let me build a backlink-prospecting and monitoring view into the admin area.

## Technical notes

- Content: append four `RegistryLanding` objects to `src/lib/seo/registry-landings.ts`; no new route files needed (`src/routes/registry.$topic.tsx` already resolves by slug).
- Sitemap: add the slugs wherever the existing registry landings are enumerated (`src/lib/seo/site-pages.ts` / page sitemap route).
- Internal links: footer registry list and the "related topics" section of the existing landings.
- IndexNow: submit via the existing queue, respecting the current rate-limit handling.
- No database or product changes.
