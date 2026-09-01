# Fix the stalled OFAC SDN import

## What I found

- Last successful OFAC import: **30 Aug 14:55 UTC**, 19,507 records.
- Every scheduled run since **31 Aug 12:40** (nine runs, every ~3h) is stuck in status `parsing`: no `completed_at`, no error message, and **zero staged rows** — the run dies mid-file, before the first sanctions entries appear near the end of the 126 MB XML.
- The database relay job created on **30 Aug 17:34** is still marked `ready` and was never consumed. Because `sanctions_relay_tick()` returns `ready_waiting` while an unconsumed copy exists, no fresh copy of the file has been transferred for two days — every stalled run re-reads the same stale 16 chunks.
- The source lock (`sanctions_sources.import_locked_at`) is set but self-expires after 15 minutes, so the schedule keeps firing; nothing surfaces the repeated failure except the "no successful update in 24 hours" banner.

Root cause is not yet fully confirmed: the run stops silently, which points to the worker being cut off (runtime/CPU limit or the 300s pg_net timeout aborting the request) rather than a parse error. Step 1 below confirms it before the fix is locked in.

## Plan

**1. Clear the jam and get a fresh file (immediate)**
- Mark the nine stuck `parsing` runs as `failed` with an explanatory message and clear the OFAC lock.
- Expire the stale `ready` relay job and delete its chunks, so `sanctions_relay_tick()` starts a fresh transfer from Treasury on its next tick.

**2. Confirm the failure mode**
- Add progress instrumentation to the streaming worker: after every N MB, write bytes-read / records-parsed / elapsed time into `sanctions_imports.diagnostic_details`.
- Trigger one manual run and read the heartbeat: it will show exactly where and after how long the run dies (timeout vs. error vs. memory).

**3. Make the run finish reliably**
Depending on step 2:
- If it is a time limit: process the relay in a resumable way — each invocation consumes a bounded slice of relay chunks, persists the partial staging state and the next chunk index, and the schedule continues where it left off until the file is fully staged, then publishes atomically.
- If it is an error in chunk reading: fix the read path (smaller chunk reads, retry on failed chunk) and keep the single-pass run.
- Raise the scheduled call timeout so a healthy run is never cut off mid-parse.

**4. Watchdog so this never goes quiet again**
- A scheduled job fails any sanctions import left in a non-terminal status for more than 30 minutes, writes a clear error, releases the lock, and expires relay jobs left `ready` for more than 24 hours.
- Surface the real message in the admin screening page so the source card says why the last run failed instead of showing a silent stall.

## Technical notes

- Files touched: `src/lib/sanctions.server.ts` (heartbeat + resumable relay consumption), `src/routes/api/public/ofac-worker.ts` (invocation shape), plus migrations for the watchdog function, cron entry and relay expiry.
- The publication path (`sanctions_staging` → atomic publish RPC), the sanity gates and the digest check stay exactly as they are; nothing is published from a partial file.
- Scheduled imports for EU, UN and UK are unaffected and stay running.
