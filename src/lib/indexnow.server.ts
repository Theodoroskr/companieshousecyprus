import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  INDEXNOW_BATCH_SIZE,
  INDEXNOW_HOST,
  INDEXNOW_KEY,
  INDEXNOW_KEY_LOCATION,
  INDEXNOW_ORIGIN,
} from "@/lib/indexnow";

const ENDPOINT = "https://api.indexnow.org/indexnow";
const MAX_CONSECUTIVE_RATE_LIMITS = 4;

export type IndexNowRunResult = {
  ok: boolean;
  status: "submitted" | "idle" | "locked" | "paused" | "error";
  submitted: number;
  pendingRemaining: number;
  httpStatus?: number;
  message?: string;
};

async function readState() {
  const { data } = await supabaseAdmin
    .from("indexnow_state")
    .select("paused_reason, paused_at, consecutive_rate_limits, last_run_at, last_submitted_count, last_error")
    .eq("id", true)
    .maybeSingle();
  return data;
}

async function countPending(): Promise<number> {
  const { count } = await supabaseAdmin
    .from("indexnow_queue")
    .select("slug", { count: "exact", head: true })
    .is("submitted_at", null);
  return count ?? 0;
}

/**
 * Submit one bounded batch of changed company URLs to IndexNow.
 *
 * Safety rails: a database lease makes runs single-flight, progress is recorded
 * per batch so re-runs skip finished work, and repeated rate limits or a hard
 * rejection park the job in a paused state that every entry point checks.
 */
export async function runIndexNowBatch(): Promise<IndexNowRunResult> {
  const state = await readState();
  if (state?.paused_reason) {
    return {
      ok: false,
      status: "paused",
      submitted: 0,
      pendingRemaining: await countPending(),
      message: state.paused_reason,
    };
  }

  const { data: leased, error: leaseError } = await supabaseAdmin.rpc("indexnow_acquire_lease", {
    _seconds: 120,
  });
  if (leaseError) throw leaseError;
  if (!leased) {
    return { ok: false, status: "locked", submitted: 0, pendingRemaining: await countPending() };
  }

  try {
    const { data: pending, error } = await supabaseAdmin
      .from("indexnow_queue")
      .select("slug")
      .is("submitted_at", null)
      .order("queued_at", { ascending: true })
      .limit(INDEXNOW_BATCH_SIZE);
    if (error) throw error;

    const slugs = (pending ?? []).map((row) => row.slug);
    if (slugs.length === 0) {
      await supabaseAdmin
        .from("indexnow_state")
        .update({ last_submitted_count: 0, last_error: null })
        .eq("id", true);
      return { ok: true, status: "idle", submitted: 0, pendingRemaining: 0 };
    }

    const urlList = slugs.map((slug) => `${INDEXNOW_ORIGIN}/company/${slug}`);
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host: INDEXNOW_HOST,
        key: INDEXNOW_KEY,
        keyLocation: INDEXNOW_KEY_LOCATION,
        urlList,
      }),
    });

    if (response.ok || response.status === 202) {
      const now = new Date().toISOString();
      await supabaseAdmin
        .from("indexnow_queue")
        .update({ submitted_at: now, last_error: null })
        .in("slug", slugs);
      await supabaseAdmin
        .from("indexnow_state")
        .update({ consecutive_rate_limits: 0, last_submitted_count: slugs.length, last_error: null })
        .eq("id", true);
      return {
        ok: true,
        status: "submitted",
        submitted: slugs.length,
        pendingRemaining: await countPending(),
        httpStatus: response.status,
      };
    }

    const body = (await response.text()).slice(0, 300);
    const message = `IndexNow HTTP ${response.status}${body ? `: ${body}` : ""}`;

    await supabaseAdmin
      .from("indexnow_queue")
      .update({ attempts: 1, last_error: message })
      .in("slug", slugs);

    if (response.status === 429 || response.status >= 500) {
      // Transient: park until the next scheduled run, and pause only after the
      // limiter keeps rejecting us.
      const streak = (state?.consecutive_rate_limits ?? 0) + 1;
      const pause = streak >= MAX_CONSECUTIVE_RATE_LIMITS;
      await supabaseAdmin
        .from("indexnow_state")
        .update({
          consecutive_rate_limits: streak,
          last_error: message,
          ...(pause ? { paused_reason: message, paused_at: new Date().toISOString() } : {}),
        })
        .eq("id", true);
    } else {
      // 400/403/422 are terminal (bad key or host) — stop the job entirely.
      await supabaseAdmin
        .from("indexnow_state")
        .update({ paused_reason: message, paused_at: new Date().toISOString(), last_error: message })
        .eq("id", true);
    }

    return {
      ok: false,
      status: "error",
      submitted: 0,
      pendingRemaining: await countPending(),
      httpStatus: response.status,
      message,
    };
  } finally {
    await supabaseAdmin.rpc("indexnow_release_lease");
  }
}

export async function getIndexNowStatus() {
  const [state, pending] = await Promise.all([readState(), countPending()]);
  return {
    paused: Boolean(state?.paused_reason),
    pausedReason: state?.paused_reason ?? null,
    lastRunAt: state?.last_run_at ?? null,
    lastSubmittedCount: state?.last_submitted_count ?? 0,
    lastError: state?.last_error ?? null,
    pending,
    keyLocation: INDEXNOW_KEY_LOCATION,
    batchSize: INDEXNOW_BATCH_SIZE,
  };
}
