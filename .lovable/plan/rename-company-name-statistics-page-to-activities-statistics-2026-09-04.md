# Rename "Company name statistics" page to "Activities statistics"

Rename the `/statistics/company-names` page so its visible name is "Activities statistics" (keeping the same URL `/statistics/company-names`).

## Changes (all in `src/routes/statistics_.company-names.tsx`)

- H1: "Cyprus company name statistics" → "Cyprus activities statistics"
- Title tag: "Cyprus activities statistics — trends & patterns | Companies House Cyprus"
- Meta description and OG title/description updated to match the new name
- Breadcrumb JSON-LD item name: "Activities statistics"
- Dataset JSON-LD name updated

## Labels pointing at the page

- `src/components/site-footer.tsx`: footer link text "Company name statistics" → "Activities statistics"
- `src/routes/statistics.tsx`: cross-link text ("Explore company name statistics") → "Explore activities statistics" (only the label, if present)

## Unchanged

- URL stays `/statistics/company-names` (no redirect needed)
- All charts, data, and section copy (including the "Name language split — Entity names by writing script, across the whole registry." section) stay as-is

## Verify

- Typecheck passes
- Load the page in the preview and confirm the new H1 and footer label render
