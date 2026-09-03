# Company name statistics page

A new public, SEO-friendly page `/statistics/company-names` that analyses the names of all ~571k registered Cyprus entities and presents shareable charts, in the same visual style as the existing `/statistics` dashboard.

## What visitors will see

1. **Hero** — "Cyprus company name statistics" with entity count, last-updated stamp, and a link back to `/statistics`.
2. **Most common words in company names** — top 30 words after stripping legal suffixes (LTD, LIMITED, ΛΤΔ, ΕΠΕ, etc.) and stopwords, as a bar chart + table with counts and % of entities.
3. **Industry keyword signals** — how many names contain Trading, Shipping, Holdings, Investments, Construction, Services, Consulting, Properties, Tech, Food, etc. (both English and Greek equivalents), as a ranked bar chart.
4. **Name language split** — Greek-script vs Latin-script vs mixed names (donut or stacked bar).
5. **First-letter distribution** — bar chart of starting letter A–Z (homoglyph-normalised using the existing `normalizeHomoglyphs`).
6. **Name length distribution** — bucketed histogram (e.g. ≤10, 11–20, 21–30, 31–40, 40+ characters).
7. **Share & download** — copy-link, X/LinkedIn/Facebook/WhatsApp share buttons and SVG chart downloads, reusing the `/statistics` patterns.

## How it's built

- **Server-side aggregation, not client-side.** Computing word frequencies over 571k names can't happen in the browser. A new server function `getCompanyNameStats` (in `src/lib/companies.functions.ts` style) runs aggregation SQL against `public.companies` (name column) and returns a compact JSON payload.
- **SQL:** a security-definer Postgres function (or direct query via the server Supabase client) using `regexp_split_to_table`/`lower` for word counts, `substring` for first letters, `length()` for buckets, and `~ '[\u0370-\u03FF]'` detection for script split. Legal suffixes and stopwords excluded in SQL.
- **Caching:** result is wrapped in the existing `src/lib/server-cache.ts` (e.g. 24h TTL) so the expensive aggregation runs at most once per day; page loads instantly afterwards. Optional: admin "refresh" button reuses the existing stats refresh patterns.
- **Route:** `src/routes/statistics.company-names.tsx` — `head()` with unique title/description/canonical/OG tags, BreadcrumbList + Dataset JSON-LD, charts via Recharts exactly like `/statistics`.
- **Discoverability:** linked from `/statistics` ("Explore company name patterns"), from the site footer next to Statistics, and added to `src/lib/seo/site-pages.ts` so it enters the page sitemap. Queued to IndexNow on publish.

## Technical details

- New files: `src/routes/statistics.company-names.tsx`, `src/lib/company-name-stats.ts` (types + bucket/keyword definitions, browser-safe), `src/lib/company-name-stats.functions.ts` (server function).
- Edits: `src/routes/statistics.tsx` (cross-link), `src/components/site-footer.tsx` (footer link), `src/lib/seo/site-pages.ts` (sitemap entry).
- Migration: `GRANT EXECUTE` on the new SQL stats function to `authenticated`/`service_role` as needed; aggregation is read-only over `companies`, which already grants `SELECT` to `anon`.
- Verify: typecheck + existing vitest suites, then load the page via Playwright and confirm charts render with real numbers.
