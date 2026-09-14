# Fix the daily change feed ("Bad Request", stuck since 30 Aug)

## What is actually happening (verified)

Every daily run since 7 Sep has failed with the same message, `Bad Request`, and each one records `changed_count: 5000`, `enqueued_count: 0`, `chunks_refreshed: —`. The window start has been frozen at 30 Aug 2026 because the window only advances when a run completes — so each day re-processes the same capped batch and fails again in the same place.

The failure happens at the very first step of the run, when the changed companies are queued for search-engine notification. That step sends all 5,000 company IDs to the database in a single request; the request line is far too long and the database API rejects it with `Bad Request` before anything is queued. Nothing after that (sitemap refresh, submission) ever runs.

Separately, the submission queue is healthy but stalled on the search-engine side: 128 URLs are waiting and the last provider response was `HTTP 429 TooManyRequests`, with a streak of 15. That is rate limiting, not a bug — it resolves itself once the daily job stops hammering and the cooldown passes.

## The fix

1. **Batch the ID lookups.** In the change-feed job, split the "which of these are already queued" check and the queue insert into chunks of 500 IDs instead of one request with 5,000. This removes the `Bad Request` entirely.
2. **Advance the window on partial progress.** Record the window end even when a later step (sitemap refresh or submission) fails, so the feed stops replaying the same 30 Aug backlog forever. Only a failure in the queueing step itself keeps the window where it is.
3. **Don't treat rate limiting as a run failure.** A `429` from the search engine already has its own cooldown handling; the run should finish as completed with a note rather than marked failed, so the window advances normally.
4. **First run after the fix** will process the current capped 5,000-company backlog; subsequent daily runs return to normal small windows.

## Technical notes

- Edits are limited to `src/lib/change-feed.server.ts`:
  - `enqueueForIndexNow` — chunk `.in("slug", …)` and the `upsert` at 500 slugs per call, accumulate the inserted count.
  - `runDailyChangeFeed` — set `status: "completed"` with a note when `runIndexNowBatch` returns `cooling_down` / `429`; keep `failed` only for genuine errors, and make sure the run row is finalised with the window end in all non-throwing paths.
- No database or schema changes; `change_feed_runs`, `indexnow_queue` and the cron schedule stay as they are.
- Verification: trigger the feed endpoint manually and confirm the run row shows `completed`, a non-zero `enqueued_count`, and a window start that has moved off 30 Aug.
