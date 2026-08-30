import { supabaseAdmin } from "@/integrations/supabase/client.server";

const JOB_KEY = "content_backfill";
const LOCK_SECONDS = 240;
const DEFAULT_BATCH = 2000;

export type ContentBackfillResult = {
  status: "completed" | "skipped" | "paused" | "failed";
  batchSize: number;
  updated: number;
  remaining: number | null;
  message?: string;
};

type StateRow = { paused?: boolean; locked_until?: string | null } | null;

/**
 * Aligns `companies.content_updated_at` with each record's own last-change
 * timestamp, one bounded batch per run. The SQL side suppresses the IndexNow
 * trigger and keeps `updated_at` intact, so this never floods the submission
 * queue nor invents a freshness date.
 */
export async function runContentBackfill(batchSize = DEFAULT_BATCH): Promise<ContentBackfillResult> {
  const size = Math.min(Math.max(Math.trunc(batchSize) || DEFAULT_BATCH, 1), 5000);
  const now = new Date();

  const { data } = await supabaseAdmin
    .from("job_state")
    .select("paused, locked_until")
    .eq("key", JOB_KEY)
    .maybeSingle();
  const row = data as StateRow;

  if (row?.paused) {
    return { status: "paused", batchSize: size, updated: 0, remaining: null, message: "job paused" };
  }
  if (row?.locked_until && new Date(row.locked_until) > now) {
    return { status: "skipped", batchSize: size, updated: 0, remaining: null, message: "another run in progress" };
  }

  await supabaseAdmin.from("job_state").upsert({
    key: JOB_KEY,
    locked_until: new Date(now.getTime() + LOCK_SECONDS * 1000).toISOString(),
    last_run_at: now.toISOString(),
  } as never);

  try {
    const { data: result, error } = await supabaseAdmin.rpc("backfill_company_content_updated_at", {
      batch_limit: size,
    } as never);
    if (error) throw new Error(error.message);

    const first = (Array.isArray(result) ? result[0] : result) as
      | { updated_count?: number; remaining_count?: number }
      | null;
    const updated = Number(first?.updated_count ?? 0);
    const remaining = Number(first?.remaining_count ?? 0);

    await supabaseAdmin
      .from("job_state")
      .update({ locked_until: null, last_error: null } as never)
      .eq("key", JOB_KEY);

    return { status: "completed", batchSize: size, updated, remaining };
  } catch (error) {
    const message = error instanceof Error ? error.message : "content backfill failed";
    // Circuit breaker: pause the job so the scheduler stops retrying a broken batch.
    await supabaseAdmin
      .from("job_state")
      .update({ locked_until: null, last_error: message, paused: true } as never)
      .eq("key", JOB_KEY);
    return { status: "failed", batchSize: size, updated: 0, remaining: null, message };
  }
}

/** Progress snapshot for admin/monitoring surfaces. */
export async function getContentBackfillState() {
  const { data } = await supabaseAdmin
    .from("job_state")
    .select("paused, last_run_at, last_error")
    .eq("key", JOB_KEY)
    .maybeSingle();
  const row = data as { paused?: boolean; last_run_at?: string | null; last_error?: string | null } | null;
  return {
    paused: !!row?.paused,
    lastRunAt: row?.last_run_at ?? null,
    lastError: row?.last_error ?? null,
  };
}
