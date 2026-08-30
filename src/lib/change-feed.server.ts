import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { INDEXNOW_ORIGIN } from "@/lib/indexnow";
import { runIndexNowBatch, type IndexNowRunResult } from "@/lib/indexnow.server";
import {
import { companyCanonicalSlug } from "@/lib/slug";
  CHANGE_FEED_MAX_ITEMS,
  changeFeedWindowStart,
  type ChangeFeedRunSummary,
  type ChangedCompany,
} from "@/lib/change-feed";

/** How many IndexNow batches a single daily run may push. */
const MAX_BATCHES_PER_RUN = 1;

function canonicalUrl(row: { slug: string; name?: string | null; official_no?: string | null; canonical_slug?: string | null }): string {
  return `${INDEXNOW_ORIGIN}/company/${row.canonical_slug ?? companyCanonicalSlug(row)}`;
}

async function lastCompletedWindowEnd(): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("change_feed_runs")
    .select("window_end")
    .eq("status", "completed")
    .order("window_end", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.window_end ?? null;
}

/**
 * Companies whose registry record changed inside the window, oldest first so
 * paging by `updated_at` is stable.
 */
export async function listChangedCompanies(options: {
  since?: string | null;
  until?: string;
  limit?: number;
}): Promise<{ windowStart: string; windowEnd: string; items: ChangedCompany[]; truncated: boolean }> {
  const windowEnd = options.until ?? new Date().toISOString();
  const windowStart = options.since ?? changeFeedWindowStart(await lastCompletedWindowEnd());
  const limit = Math.min(Math.max(options.limit ?? CHANGE_FEED_MAX_ITEMS, 1), CHANGE_FEED_MAX_ITEMS);

  // The Data API caps a single response at 1,000 rows, so page with an
  // offset until the requested limit is filled.
  const PAGE = 1000;
  const items: ChangedCompany[] = [];
  let truncated = false;

  for (let offset = 0; offset < limit + 1; offset += PAGE) {
    const upper = Math.min(offset + PAGE, limit + 1) - 1;
    const { data, error } = await supabaseAdmin
      .from("companies")
      .select("slug, canonical_slug, official_no, name, updated_at")
      .gte("updated_at", windowStart)
      .lt("updated_at", windowEnd)
      .order("updated_at", { ascending: true })
      .order("slug", { ascending: true })
      .range(offset, upper);
    if (error) throw new Error(error.message);

    const rows = data ?? [];
    for (const row of rows) {
      if (items.length >= limit) {
        truncated = true;
        break;
      }
      items.push({
        id: row.official_no ?? row.slug,
        slug: row.slug,
        name: row.name,
        updatedAt: row.updated_at ?? windowEnd,
        canonicalUrl: canonicalUrl(row),
      });
    }
    if (truncated || rows.length < upper - offset + 1) break;
  }

  return { windowStart, windowEnd, items, truncated };
}

/** Queue only the slugs that are not already waiting for submission. */
async function enqueueForIndexNow(slugs: string[]): Promise<number> {
  if (slugs.length === 0) return 0;
  const { data: pending, error } = await supabaseAdmin
    .from("indexnow_queue")
    .select("slug")
    .is("submitted_at", null)
    .in("slug", slugs);
  if (error) throw new Error(error.message);

  const alreadyPending = new Set((pending ?? []).map((row) => row.slug));
  const missing = slugs.filter((slug) => !alreadyPending.has(slug));
  if (missing.length === 0) return 0;

  const now = new Date().toISOString();
  const { error: upsertError } = await supabaseAdmin.from("indexnow_queue").upsert(
    missing.map((slug) => ({ slug, queued_at: now, submitted_at: null, attempts: 0, last_error: null })),
    { onConflict: "slug" },
  );
  if (upsertError) throw new Error(upsertError.message);
  return missing.length;
}

/**
 * Daily job: read the changed-company feed, regenerate the sitemap chunk
 * metadata so `lastmod` reflects those changes, then push only the changed
 * profiles to IndexNow.
 */
export async function runDailyChangeFeed(): Promise<ChangeFeedRunSummary & { truncated: boolean }> {
  const feed = await listChangedCompanies({});

  const { data: run, error: runError } = await supabaseAdmin
    .from("change_feed_runs")
    .insert({
      window_start: feed.windowStart,
      window_end: feed.windowEnd,
      changed_count: feed.items.length,
      status: "running",
    })
    .select("id")
    .single();
  if (runError) throw new Error(runError.message);

  let enqueued = 0;
  let chunks: number | null = null;
  let submitted = 0;
  let indexNowStatus: string | null = null;
  const notes: string[] = [];
  let status: "completed" | "failed" = "completed";

  try {
    enqueued = await enqueueForIndexNow(feed.items.map((item) => item.slug));

    // Chunk regeneration is a heavy full-table pass. The scheduled job runs it
    // in-database before calling us, so a timeout here is informational only.
    const { data: chunkCount, error: chunkError } = await supabaseAdmin.rpc("refresh_sitemap_chunks");
    if (chunkError) {
      notes.push(`sitemap refresh skipped: ${chunkError.message}`);
    } else {
      chunks = (chunkCount as number | null) ?? null;
    }

    let result: IndexNowRunResult | null = null;
    for (let i = 0; i < MAX_BATCHES_PER_RUN; i += 1) {
      result = await runIndexNowBatch();
      submitted += result.submitted;
      if (!result.ok || result.pendingRemaining === 0) break;
    }
    indexNowStatus = result?.status ?? null;
    if (result && !result.ok) {
      notes.push(result.message ?? `IndexNow ${result.status}`);
      if (result.status === "error" || result.status === "paused") status = "failed";
    }
    if (feed.truncated) notes.push(`window truncated at ${CHANGE_FEED_MAX_ITEMS} companies`);
  } catch (error) {
    status = "failed";
    notes.push(error instanceof Error ? error.message : "daily change feed failed");
  }

  const finishedAt = new Date().toISOString();
  await supabaseAdmin
    .from("change_feed_runs")
    .update({
      enqueued_count: enqueued,
      chunks_refreshed: chunks,
      indexnow_submitted: submitted,
      indexnow_status: indexNowStatus,
      status,
      message: notes.length ? notes.join("; ").slice(0, 1000) : null,
      finished_at: finishedAt,
    })
    .eq("id", run.id);

  return {
    id: run.id,
    windowStart: feed.windowStart,
    windowEnd: feed.windowEnd,
    changedCount: feed.items.length,
    enqueuedCount: enqueued,
    chunksRefreshed: chunks,
    indexNowSubmitted: submitted,
    indexNowStatus,
    status,
    message: notes.length ? notes.join("; ") : null,
    startedAt: feed.windowEnd,
    finishedAt,
    truncated: feed.truncated,
  };
}

export async function listChangeFeedRuns(limit = 10): Promise<ChangeFeedRunSummary[]> {
  const { data, error } = await supabaseAdmin
    .from("change_feed_runs")
    .select(
      "id, window_start, window_end, changed_count, enqueued_count, chunks_refreshed, indexnow_submitted, indexnow_status, status, message, started_at, finished_at",
    )
    .order("started_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    id: row.id,
    windowStart: row.window_start,
    windowEnd: row.window_end,
    changedCount: row.changed_count,
    enqueuedCount: row.enqueued_count,
    chunksRefreshed: row.chunks_refreshed,
    indexNowSubmitted: row.indexnow_submitted,
    indexNowStatus: row.indexnow_status,
    status: row.status,
    message: row.message,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
  }));
}
