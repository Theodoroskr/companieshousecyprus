# Automated monthly registry refresh

The open-data portal exposes stable direct CSV URLs with `Last-Modified` headers:

- `https://data.gov.cy/sites/default/files/organisations_97.csv` (~93 MB)
- `https://data.gov.cy/sites/default/files/registered_office_99.csv` (~21 MB)
- `https://data.gov.cy/sites/default/files/organisation_officials_86.csv` (~127 MB)

All three were last published 31 Jul 2026 — matching our data (registrations through 30/07/2026). We poll the headers and import only when they change.

## What you'll get

- A weekly automatic check of the portal. When a new monthly export appears, the site downloads and imports it by itself — new registrations, status changes, address updates, and official changes included.
- Progress and history visible on the existing Admin → Import page, same as a manual upload.
- An email to the office address when an import completes or fails.

## How it works

1. **Change detection table** (`registry_sync_state`): one row per file storing the last-seen `Last-Modified`, etag, size, and link to the import run it triggered. Admin-only access.
2. **New endpoint** `/api/public/registry-sync` (secret-protected, same pattern as the monitoring check):
   - HEAD-request each CSV; skip files whose `Last-Modified` matches the stored value.
   - For changed files, download to private storage and run the existing chunked import pipeline (`startServerImport`, `processOfficialsChunk`, `mapOrganisationRow` upserts) so behaviour matches manual uploads exactly.
   - Process in resumable slices (same pattern as the OFAC importer) so large files don't hit execution limits; companies/addresses upsert, officials replace.
   - Update `registry_sync_state` and email the result.
3. **Schedule**: weekly cron (Saturday 06:00 UTC) calling the endpoint — monthly publisher cadence means weekly polling is plenty, with at most 7 days lag.
4. **Safety**: no deletions of companies not in the file beyond what the manual import already does; officials refresh follows the existing truncate-and-reload flow; failed runs retry the next week and are visible in import history.

## Technical notes

- Reuses `src/lib/registrar-mapping.ts`, `src/lib/admin.server.ts` import functions, and the OFAC-style checkpoint/lease pattern.
- One migration: `registry_sync_state` table with GRANTs, RLS (admin read via `has_role`), plus cron schedule applied separately (contains the secret, so not in the migration).
- Verification: run the endpoint manually once with current files — expect "no change detected"; then simulate a changed `Last-Modified` on a small slice to confirm the import path fires.
