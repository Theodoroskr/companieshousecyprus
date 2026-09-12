# Optimize the Cyprus corporate registry page for "Cyprus corporate registry" and "Cyprus company register"

## What this means

The page at `/cyprus-corporate-registry` exists, but its search-engine listing isn't written around the exact phrases people type, and the homepage doesn't link to it. Google therefore has little reason to rank it for those searches. This plan fixes the page's listing text, its machine-readable data, and its internal linking.

## Changes

1. **Search listing (title + description)** on `/cyprus-corporate-registry`:
   - Title rewritten to lead with the exact phrases, e.g. "Cyprus Corporate Registry — Free Cyprus Company Register Search".
   - Description rewritten to mention both phrases, the free search, daily filings (new incorporations and status changes), and no account needed — aimed at winning the click over i-cyprus.com and the government portal.
   - The same text is reused for the social-share (og/twitter) tags, which already point at the page itself.

2. **Structured data** on the same page:
   - Add a `WebPage` schema block naming the page "Cyprus Corporate Registry" with its description and URL (alongside the existing BreadcrumbList and WebSite/SearchAction blocks, which stay unchanged).

3. **Homepage link**: add a visible link from the homepage (`src/routes/index.tsx`) to `/cyprus-corporate-registry`, using anchor text like "Cyprus corporate registry" — placed in the existing registry/topics link area so it looks natural, not stuffed.

## Technical details

- Edits only: `src/routes/cyprus-corporate-registry.tsx` (TITLE, DESCRIPTION constants + one JSON-LD script) and `src/routes/index.tsx` (one link).
- Canonical and og:url already self-reference the page — untouched.
- Verified with typecheck and the existing SEO tests.
- The changes appear on the live site after the next publish.
