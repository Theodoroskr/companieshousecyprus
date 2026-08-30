# Win company-name searches against companiesregistry.cy

## Why they rank first today

Head-to-head data (Semrush):

| Metric | companieshousecyprus.com | companiesregistry.cy |
|---|---|---|
| Authority Score | 23 | 30 |
| Referring domains | 1,570 | 2,191 |
| Organic keywords | 1,683 | 1,816 |
| Est. organic traffic | 477/mo | 1,404/mo |

Three concrete reasons they win queries like "NOVARDIA CREDIT INSURANCE BROKERS LTD":

1. **Snippet copy sells the click.** Their meta description promises "shareholders, company history and more". Ours (`src/lib/seo/company-meta.ts`) is factual but drier and doesn't mention directors/shareholders/history — so even when we rank, fewer people click, which compounds over time.
2. **Higher domain authority.** ~40% more referring domains. This is slow to close but influences everything.
3. **Thin page signal.** Their company pages carry more content sections (history, shareholders, related filings). Ours are strong on registry facts but lighter on unique on-page text, especially now that officials render — we should surface that content in the snippet.

## What we'll change (on-page, this sprint)

1. **Rewrite company title/description templates** in `src/lib/seo/company-meta.ts`:
   - Title: keep name-first (correct), e.g. `NOVARDIA CREDIT INSURANCE BROKERS LTD — Cyprus company profile`.
   - Description: lead with the entity, then promise the differentiators — "Directors, secretary, registered office, filing history and official certificates for [NAME] (HE…), a [type] registered in [district], Cyprus. Status: Active." Fit within 155 chars; never truncate the name.
   - Update existing tests in `src/lib/__tests__/company-meta.test.ts` (or create) to pin the new templates and length limits.
2. **Enrich the company profile page body** (`src/routes/company.$slug.tsx`):
   - Add a short "Company profile" summary paragraph (SSR, indexable) built from registry fields — type, status, incorporation date, age, district — giving Google unique text per page.
   - Add an FAQ block ("Who are the directors of X?", "When was X registered?", "Is X active?") with `FAQPage` JSON-LD — targets the exact query patterns users search and is eligible for rich results.
   - Add a "People also viewed" internal-links strip (same district/type) to strengthen crawl paths between the ~571k profiles.
3. **Indexation push**:
   - Verify the companies sitemap includes canonical name slugs and `content_updated_at` as `lastmod` (already tracked) so Google re-crawls pages that gained directors data.
   - Trigger IndexNow re-queue for pages enriched by this change.
4. **Verification**:
   - Tests for new meta templates and JSON-LD validity.
   - After publish: resubmit key pages in Search Console and track CTR/position for company-name queries.

## Out of scope (longer game)

- Backlink building to close the authority gap (30 vs 23). Recommend a separate outreach/PR effort — not a code change.

## Technical notes

- All metadata changes stay in `src/lib/seo/company-meta.ts` so OG/Twitter/canonical stay consistent automatically.
- FAQ answers must only state data we actually render on the page (Google penalises FAQ markup for invisible content).
- Officials sections stay GDPR-suppression aware; masked Business Name owners must never appear in snippets or JSON-LD.
