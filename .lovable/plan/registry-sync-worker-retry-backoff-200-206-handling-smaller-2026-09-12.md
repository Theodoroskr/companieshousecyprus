# Registry sync worker: retry/backoff, 200+206 handling, smaller chunks, progress indicator

## Current state (verified in code)

Most of this request is already implemented in `src/lib/registry-sync.server.ts` from recent fixes:

- **Retry with backoff** — `fetchRange` retries failed range downloads up to `RANGE_MAX_RETRIES` times with exponential backoff (`RANGE_RETRY_BASE_MS * 2^n`, capped at 8s), resuming from the last received byte with `If-Range` validators.
- **200 and 206 handling** — accepts 206 partial content, and when the server ignores the Range header and returns 200, it slices the full body; past-EOF requests accept the available bytes instead of failing.
- **Chunked download** — the download is already split into 4 MiB slices (`CHUNK_BYTES`), with `bytes_processed` persisted after each slice so any failure resumes mid-file.

## What is missing (this plan)

1. **Smaller chunks**: reduce `CHUNK_BYTES` from 4 MiB to 1 MiB so each network slice is shorter and less likely to drop mid-transfer on the portal's CDN. Resume logic is unchanged.

2. **Progress indicator for the automated sync** on the admin import page (`/admin/import`):
   - The automated refresh already records per-file progress in `import_runs` (`bytes_processed` / `file_size`, kind `registry_auto`) — only the display is missing.
   - Add a "Registry refresh in progress" card that appears while a `registry_auto` run is active, showing: file name, a progress bar (percent = bytes processed / file size), rows written so far, and the current phase.
   - It polls every few seconds while active and disappears when the run completes or fails (the failure already triggers the email alert).
   - The existing import history table stays as-is.

## Technical details

- Edits: `src/lib/registry-sync.server.ts` (one constant), `src/lib/admin.server.ts` or a small function to expose the active `registry_auto` run, and `src/routes/_authenticated/admin.import.tsx` (progress card + polling).
- No database or RLS changes — the columns already exist and admin reads are already authorized.
- Verified with typecheck; visible in the preview immediately, live on next publish.
