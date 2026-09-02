# Make the OFAC import resumable and CPU-safe

## Confirmed problem

- The current `/api/public/ofac-worker` starts `runOfacStreamingImport()` with an untracked fire-and-forget promise.
- The latest successful import processed 126.5 MB / 19,507 records, but needed about 158 seconds to parse and another 55 seconds to publish. That exceeds a single request worker's CPU allowance.
- Production logs show the request isolate being terminated with HTTP 502, and the database contains matching imports abandoned in `parsing`.
- The relay successfully downloads the Treasury file in 16 chunks, but the application still consumes all chunks and publishes the full list in one invocation. The existing heartbeat/watchdog detects failure but does not make processing resumable.

## Fix

**1. Add durable OFAC work state**

- Add a service-only OFAC work table keyed by relay job/import, recording phase, next relay chunk, parser section, carry-over XML fragment, counters, lease expiry, retry count and last error.
- Add service-only intermediate tables for the cross-chunk OFAC data needed to assemble sanctions entries (reference values, locations, identity documents, parties and relationships).
- Keep the existing `sanctions_staging` table and atomic publication function as the final safety boundary; partial work is never published.
- Add explicit service-role grants, RLS, indexes, uniqueness constraints and cascade cleanup for every new table.

**2. Process one bounded slice per request**

- Replace the single-pass in-memory parser path with a resumable parser that consumes at most one relay chunk (or a fixed CPU/time budget) per invocation.
- Persist complete parsed blocks into the intermediate tables and retain only the incomplete trailing XML fragment plus section cursor between invocations.
- During the `SanctionsEntries` phase, resolve persisted party/location/document relationships in bounded batches and write final records idempotently to `sanctions_staging`.
- Acquire a database lease before each slice so overlapping cron calls exit safely; use unique keys/upserts so retries cannot duplicate work.

**3. Make every continuation explicit**

- Change `/api/public/ofac-worker` to await exactly one bounded slice and return its durable status (`waiting_for_relay`, `processing`, `ready_to_publish`, `completed`, `failed`) instead of starting an untracked promise.
- Schedule the endpoint frequently enough to drain remaining work, but invoke the next slice only while unfinished work exists. No immediate self-invocation loop.
- Keep the relay fetch schedule independent: it continues building a fresh 16-chunk file before parsing begins.

**4. Bound publication and recovery**

- Split expensive final publication preparation into bounded database batches where necessary, then perform the existing atomic source swap only after all validation gates pass.
- Preserve SHA-256 verification, record-count drop protection, entity/person/ship/aircraft counts and unchanged-file detection.
- Extend the watchdog to release expired leases, retry a bounded number of failed slices, fail terminal jobs clearly, clean intermediate rows, and leave the previous live OFAC dataset untouched.
- Mark a relay file consumed only after successful publication or an identical-file completion—not immediately after parsing.

**5. Verify before closing the finding**

- Add parser/resume tests covering a block split across relay chunks, duplicate slice delivery, lease contention, retry after interruption, and no publication from partial input.
- Run the focused sanctions tests and typecheck.
- Trigger the worker repeatedly until one fresh relay progresses through every checkpoint and finishes without any request exceeding its bounded slice budget.
- Confirm the active OFAC record count, latest successful timestamp, zero abandoned staging rows, and HTTP 2xx responses; then resolve the Project monitoring finding as fixed.

## Scope protection

- EU, UN and UK import paths remain unchanged.
- Public screening behavior and status wording remain unchanged.
- The old OFAC dataset remains active throughout processing and is replaced only by the existing atomic publication gate.
