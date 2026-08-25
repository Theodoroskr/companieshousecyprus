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
const RATE_LIMIT_COOLDOWN_MS = 24 * 60 * 60 * 1000;

export type IndexNowRunResult = {
  ok: boolean;
  status: "submitted" | "idle" | "locked" | "cooling_down" | "paused" | "error";
  submitted: number;
  pendingRemaining: number;
  httpStatus?: number;
  message?: string;
};

function isRateLimitMessage(value: string | null | undefined): boolean {
  return Boolean(value?.includes("IndexNow HTTP 429") || value?.includes("TooManyRequests"));
}

function retryAt(value: string | null | undefined): Date | null {
  if (!value) return null;
  const started = new Date(value).getTime();
  if (Number.isNaN(started)) return null;
  return new Date(started + RATE_LIMIT_COOLDOWN_MS);
}

function isCoolingDown(value: string | null | undefined): boolean {
  const retry = retryAt(value);
  return Boolean(retry && retry.getTime() > Date.now());
}

function cooldownMessage(value: string | null | undefined): string {
  const retry = retryAt(value);
  return retry
    ? `IndexNow is cooling down after Bing rate limiting. Next retry after ${retry.toISOString()}.`
    : "IndexNow is cooling down after Bing rate limiting.";
}

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
    if (isRateLimitMessage(state.paused_reason)) {
      if (isCoolingDown(state.paused_at ?? state.last_run_at)) {
        return {
          ok: false,
          status: "cooling_down",
          submitted: 0,
          pendingRemaining: await countPending(),
          message: cooldownMessage(state.paused_at ?? state.last_run_at),
        };
      }

      await supabaseAdmin
        .from("indexnow_state")
        .update({ paused_reason: null, paused_at: null, consecutive_rate_limits: 0, last_error: null })
        .eq("id", true);
    } else {
      return {
        ok: false,
        status: "paused",
        submitted: 0,
        pendingRemaining: await countPending(),
        message: state.paused_reason,
      };
    }
  }

  if (isRateLimitMessage(state?.last_error) && isCoolingDown(state?.last_run_at)) {
    return {
      ok: false,
      status: "cooling_down",
      submitted: 0,
      pendingRemaining: await countPending(),
      message: cooldownMessage(state?.last_run_at),
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
      .select("slug, path")
      .is("submitted_at", null)
      .order("queued_at", { ascending: true })
      .limit(INDEXNOW_BATCH_SIZE);
    if (error) throw error;

    const rows = pending ?? [];
    const slugs = rows.map((row) => row.slug);
    if (slugs.length === 0) {
      await supabaseAdmin
        .from("indexnow_state")
        .update({ last_submitted_count: 0, last_error: null })
        .eq("id", true);
      return { ok: true, status: "idle", submitted: 0, pendingRemaining: 0 };
    }

    // Rows queued before paths existed (and company rows) fall back to the
    // canonical profile URL built from the slug.
    const urlList = rows.map(
      (row) => `${INDEXNOW_ORIGIN}${row.path ?? `/company/${row.slug}`}`,
    );

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

    // Bing answers 403 SiteVerificationNotCompleted while it re-checks the key
    // file — transient, not a bad key.
    const verificationPending = response.status === 403 && body.includes("SiteVerificationNotCompleted");

    if (response.status === 429) {
      // Rate limits are expected when Bing tightens quotas. Do not permanently
      // pause; record the error and let later cron runs respect the cooldown.
      const streak = (state?.consecutive_rate_limits ?? 0) + 1;
      await supabaseAdmin
        .from("indexnow_state")
        .update({
          consecutive_rate_limits: streak,
          last_error: message,
        })
        .eq("id", true);
    } else if (response.status >= 500 || verificationPending) {
      // Transient provider errors: park until the next scheduled run, and pause
      // only after repeated failures.
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
  const pausedReason = isRateLimitMessage(state?.paused_reason) ? null : (state?.paused_reason ?? null);
  const coolingDown =
    (isRateLimitMessage(state?.paused_reason) && isCoolingDown(state?.paused_at ?? state?.last_run_at)) ||
    (isRateLimitMessage(state?.last_error) && isCoolingDown(state?.last_run_at));
  const nextRetryAt = retryAt(state?.paused_at ?? state?.last_run_at)?.toISOString() ?? null;
  return {
    paused: Boolean(pausedReason),
    pausedReason,
    coolingDown,
    nextRetryAt: coolingDown ? nextRetryAt : null,
    lastRunAt: state?.last_run_at ?? null,
    lastSubmittedCount: state?.last_submitted_count ?? 0,
    lastError: state?.last_error ?? null,
    pending,
    keyLocation: INDEXNOW_KEY_LOCATION,
    batchSize: INDEXNOW_BATCH_SIZE,
  };
}

/**
 * Queue arbitrary site paths (sitemaps, landing pages, guides) for the next
 * IndexNow batch. Company profiles and sitemap chunks are queued automatically
 * by database triggers; this is for app-initiated content changes.
 */
export async function enqueueIndexNowPaths(paths: string[]): Promise<number> {
  const clean = Array.from(new Set(paths.filter((p) => p.startsWith("/"))));
  if (clean.length === 0) return 0;
  const { data, error } = await supabaseAdmin.rpc("enqueue_indexnow_urls", { _paths: clean });
  if (error) throw new Error(error.message);
  return (data as number | null) ?? clean.length;
}
