# Hide officer names in the "Sharing an official or owner" list

## What's wrong (verified)

Officer names are masked in the Directors & Secretary section of a company page, but the related-companies list still prints the full name after "via" — e.g. "HE128057 via ΧΡΙΣΤΙΝΑ ΣΙΗΝΑ". This is the only remaining public surface that leaks a name: the server function builds a `via` value from the raw `person_name` and the company page renders it verbatim. Public API and MCP responses were already stripped of names.

## Change

- Stop sending officer names to the browser at all for this section: the server keeps using the shared name to find related companies, but returns a neutral label instead of the name.
- On the company page, the row shows "via a shared officer" (or "via a shared owner" for business names) instead of the person's name. The rest of the row — company name, registration number, the name-matching disclaimer — stays as it is.
- Names remain fully available in purchased reports and certificates; nothing about paid products changes.

## Technical notes

- `src/lib/companies.functions.ts` (`getRelatedCompanies`, around lines 164-190): keep the internal `names` lookup, drop `via` from the returned rows (or return a fixed label), so the name never reaches SSR HTML or the client payload.
- `src/routes/company.$slug.tsx` (line ~86): replace `via {row.via}` with the static label.
- Verify with the companies listed: HE128057, HE399013, HE409882, HE475833, HE278866 — no personal name in the rendered page source.
