/**
 * Automated API4ALL report collection (server-only).
 *
 * Two paths bring a placed API4ALL order to "delivered":
 *  1. pollPendingReports() — a bounded, single-flight job run every few minutes
 *     by the scheduler, retrying items still in "processing".
 *  2. applyCallbackReport() — API4ALL (or an operator) pushes the JSON report to
 *     /api/public/a4a-callback, which stores it immediately.
 */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const JOB_KEY = "a4a_poll";
const BATCH_SIZE = 8;
const MAX_ATTEMPTS = 48; // ~4h at 5 min spacing
const LOCK_SECONDS = 240;

function client() {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!url || !key) throw new Error("Missing Supabase service credentials");
  const isNewKey = key.startsWith("sb_secret_") || key.startsWith("sb_publishable_");
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    global: {
      fetch: (input, init) => {
        const headers = new Headers(
          typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
        );
        if (init?.headers) new Headers(init.headers).forEach((v, k) => headers.set(k, v));
        if (isNewKey && headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
  });
}

type Supa = ReturnType<typeof client>;

/** Shared secret for the poll + callback endpoints, stored in the database. */
export async function verifyJobSecret(token: string | null | undefined): Promise<boolean> {
  if (!token) return false;
  const supabase = client();
  const { data } = await supabase.from("job_state").select("secret").eq("key", JOB_KEY).maybeSingle();
  const secret = (data as { secret?: string | null } | null)?.secret;
  return !!secret && secret.length === token.length && secret === token;
}

export async function getJobStatus() {
  const supabase = client();
  const { data } = await supabase
    .from("job_state")
    .select("key, paused, last_run_at, last_error, secret")
    .eq("key", JOB_KEY)
    .maybeSingle();
  const row = data as
    | { paused?: boolean; last_run_at?: string | null; last_error?: string | null; secret?: string | null }
    | null;
  return {
    paused: !!row?.paused,
    lastRunAt: row?.last_run_at ?? null,
    lastError: row?.last_error ?? null,
    callbackToken: row?.secret ?? null,
  };
}

async function acquireLock(supabase: Supa) {
  const now = new Date();
  const { data } = await supabase
    .from("job_state")
    .select("paused, locked_until")
    .eq("key", JOB_KEY)
    .maybeSingle();
  const row = data as { paused?: boolean; locked_until?: string | null } | null;
  if (row?.paused) return { ok: false as const, reason: "paused" as const };
  if (row?.locked_until && new Date(row.locked_until) > now) {
    return { ok: false as const, reason: "locked" as const };
  }
  await supabase
    .from("job_state")
    .upsert({
      key: JOB_KEY,
      locked_until: new Date(now.getTime() + LOCK_SECONDS * 1000).toISOString(),
      last_run_at: now.toISOString(),
    } as never)
    .eq("key", JOB_KEY);
  return { ok: true as const };
}

async function releaseLock(supabase: Supa, lastError: string | null) {
  await supabase
    .from("job_state")
    .update({ locked_until: null, last_error: lastError } as never)
    .eq("key", JOB_KEY);
}

/**
 * Store a retrieved report on the item and queue it for admin review.
 * The client is emailed only when an administrator releases it
 * (see releaseOrderItemReport in orders.server.ts).
 */
async function deliverReport(
  supabase: Supa,
  item: { id: string; order_id: string; product_name: string; company_name: string | null; company_number: string | null },
  payload: { kind: string; code: string | null; report: unknown },
) {
  await supabase
    .from("order_items")
    .update({
      report_json: { kind: payload.kind, code: payload.code, report: payload.report } as never,
      fulfilment_status: "awaiting_review",
      fulfilment_message: "Report received from API4ALL — awaiting admin review before release.",
      delivered_at: null,
      a4a_next_attempt_at: null,
    })
    .eq("id", item.id);
}

/** Retry a bounded batch of pending API4ALL reports. */
export async function pollPendingReports() {
  const supabase = client();
  const lock = await acquireLock(supabase);
  if (!lock.ok) return { ran: false as const, reason: lock.reason };

  let pausedReason: string | null = null;
  let delivered = 0;
  let pending = 0;
  let failed = 0;

  try {
    const nowIso = new Date().toISOString();
    const { data: items } = await supabase
      .from("order_items")
      .select("id, order_id, product_name, company_name, company_number, a4a_kind, a4a_code, a4a_attempts")
      .eq("fulfilment_status", "processing")
      .not("a4a_kind", "is", null)
      .not("a4a_code", "is", null)
      .or(`a4a_next_attempt_at.is.null,a4a_next_attempt_at.lte.${nowIso}`)
      .order("a4a_next_attempt_at", { ascending: true, nullsFirst: true })
      .limit(BATCH_SIZE);

    const { fetchReport } = await import("@/lib/api4all.server");

    for (const raw of items ?? []) {
      const item = raw as typeof raw & { a4a_attempts: number | null };
      const attempts = (item.a4a_attempts ?? 0) + 1;
      try {
        const report = await fetchReport(item.a4a_kind as "structure" | "credit", item.a4a_code as string);
        await supabase.from("order_items").update({ a4a_attempts: attempts } as never).eq("id", item.id);
        await deliverReport(supabase, item as never, {
          kind: item.a4a_kind as string,
          code: item.a4a_code,
          report,
        });
        delivered += 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Report fetch failed";
        const credentialsProblem = /credentials are not configured|\(401\)|\(403\)/i.test(message);
        const giveUp = attempts >= MAX_ATTEMPTS;
        // Back off geometrically, capped at 30 minutes.
        const delayMs = Math.min(30, 5 * attempts) * 60_000;
        await supabase
          .from("order_items")
          .update({
            a4a_attempts: attempts,
            a4a_next_attempt_at: new Date(Date.now() + delayMs).toISOString(),
            fulfilment_status: giveUp ? "failed" : "processing",
            fulfilment_message: `${giveUp ? "Gave up after" : "Attempt"} ${attempts}: ${message}`.slice(0, 900),
          } as never)
          .eq("id", item.id);
        if (giveUp) failed += 1;
        else pending += 1;
        if (credentialsProblem) {
          pausedReason = `API4ALL access problem: ${message}`;
          break;
        }
      }
    }
  } finally {
    await releaseLock(supabase, pausedReason);
    if (pausedReason) {
      await supabase.from("job_state").update({ paused: true } as never).eq("key", JOB_KEY);
    }
  }

  return { ran: true as const, delivered, pending, failed, paused: pausedReason };
}

/** Resume the job after an operator fixes the cause of a pause. */
export async function resumeReportJob() {
  const supabase = client();
  await supabase
    .from("job_state")
    .update({ paused: false, last_error: null, locked_until: null } as never)
    .eq("key", JOB_KEY);
  return { ok: true as const };
}

/**
 * Apply a report pushed by API4ALL to the callback endpoint.
 * The item is matched on the reference we sent with the order, or on the
 * company code + report kind of a pending item.
 */
export async function applyCallbackReport(input: {
  reference?: string | null;
  code?: string | null;
  kind?: string | null;
  report: unknown;
}) {
  const supabase = client();
  const select =
    "id, order_id, product_name, company_name, company_number, a4a_kind, a4a_code, a4a_reference, fulfilment_status";

  let item: Record<string, unknown> | null = null;

  if (input.reference) {
    const { data } = await supabase
      .from("order_items")
      .select(select)
      .eq("a4a_reference", input.reference.trim())
      .maybeSingle();
    item = (data as Record<string, unknown> | null) ?? null;
  }

  if (!item && input.code) {
    const query = supabase
      .from("order_items")
      .select(select)
      .eq("a4a_code", input.code.trim())
      .in("fulfilment_status", ["processing", "failed"])
      .order("created_at", { ascending: false })
      .limit(1);
    const { data } = input.kind ? await query.eq("a4a_kind", input.kind) : await query;
    item = ((data as Record<string, unknown>[] | null) ?? [])[0] ?? null;
  }

  if (!item) return { ok: false as const, message: "No matching pending order item" };
  if (item["fulfilment_status"] === "delivered") return { ok: true as const, alreadyDelivered: true as const };

  await deliverReport(supabase, item as never, {
    kind: (item["a4a_kind"] as string) ?? input.kind ?? "structure",
    code: (item["a4a_code"] as string) ?? input.code ?? null,
    report: input.report,
  });

  return { ok: true as const, itemId: item["id"] as string };
}
