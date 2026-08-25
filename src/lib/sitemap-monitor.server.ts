/**
 * Automated sitemap health monitor.
 *
 * Runs from the scheduler every 15 minutes: fetches /sitemap.xml, discovers
 * every sitemap it advertises (pages + company chunks) and fetches each one.
 * Any non-200 response, non-XML body or network failure is recorded and an
 * alert email is sent to the office address. Repeat alerts for the same
 * failure signature are throttled; a recovery email is sent once the
 * sitemaps are healthy again.
 */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { extractLocs } from "@/lib/seo/canonical-health";
import { sendTemplateEmail } from "@/lib/email-templates/send-email";

const JOB_KEY = "sitemap_monitor";
const SITE_URL = "https://companieshousecyprus.com";
const ALERT_TO = "info@companieshousecyprus.com";
/** Don't re-send an identical failure alert more often than this. */
const RE_ALERT_MINUTES = 360;
const FETCH_TIMEOUT_MS = 25_000;
/** Company chunks are multi-megabyte; probe a few at a time so none time out. */
const CONCURRENCY = 3;

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

export async function verifySitemapMonitorSecret(token: string | null | undefined): Promise<boolean> {
  if (!token) return false;
  const supabase = client();
  const { data } = await supabase.from("job_state").select("secret").eq("key", JOB_KEY).maybeSingle();
  const secret = (data as { secret?: string | null } | null)?.secret;
  return !!secret && secret.length === token.length && secret === token;
}

export type SitemapProbe = {
  url: string;
  path: string;
  kind: "index" | "child";
  ok: boolean;
  status: number | null;
  contentType: string | null;
  urlCount: number | null;
  error: string | null;
};

async function probe(origin: string, path: string, kind: SitemapProbe["kind"]): Promise<SitemapProbe> {
  const base: SitemapProbe = {
    url: `${SITE_URL}${path}`,
    path,
    kind,
    ok: false,
    status: null,
    contentType: null,
    urlCount: null,
    error: null,
  };
  try {
    const res = await fetch(`${origin}${path}`, {
      method: "GET",
      redirect: "manual",
      headers: { "user-agent": "chc-sitemap-monitor" },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    const body = await res.text();
    const contentType = res.headers.get("content-type");
    const isXml = !!contentType && contentType.includes("xml");
    let error: string | null = null;
    if (res.status >= 300 && res.status < 400) error = `redirected to ${res.headers.get("location") ?? "unknown"}`;
    else if (!res.ok) error = `HTTP ${res.status}`;
    else if (!isXml) error = `unexpected content-type: ${contentType ?? "none"}`;
    else if (!body.includes("<loc>")) error = "sitemap contains no <loc> entries";
    return {
      ...base,
      ok: error === null,
      status: res.status,
      contentType,
      urlCount: isXml ? extractLocs(body).size : null,
      error,
      // Keep the parsed locs out of the return shape; callers ask for them separately.
    };
  } catch (err) {
    return { ...base, error: err instanceof Error ? err.message : "fetch failed" };
  }
}

async function discoverChildPaths(origin: string): Promise<{ paths: string[]; error: string | null }> {
  try {
    const res = await fetch(`${origin}/sitemap.xml`, {
      headers: { "user-agent": "chc-sitemap-monitor" },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return { paths: [], error: `index HTTP ${res.status}` };
    const xml = await res.text();
    const paths = Array.from(extractLocs(xml), (loc) => {
      try {
        return new URL(loc).pathname;
      } catch {
        return loc.startsWith("/") ? loc : null;
      }
    }).filter((p): p is string => !!p);
    return { paths, error: null };
  } catch (err) {
    return { paths: [], error: err instanceof Error ? err.message : "index fetch failed" };
  }
}

export type SitemapMonitorResult = {
  checkedAt: string;
  healthy: boolean;
  durationMs: number;
  totals: { checked: number; failing: number; urls: number };
  failures: Array<{ path: string; status: number | null; error: string | null }>;
  probes: SitemapProbe[];
  alert: { sent: boolean; kind: "failure" | "recovery" | null; reason: string | null };
};

/** Runs one full health check, persists it and alerts on state changes. */
export async function runSitemapHealthCheck(origin: string): Promise<SitemapMonitorResult> {
  const startedAt = Date.now();
  const supabase = client();

  const indexProbe = await probe(origin, "/sitemap.xml", "index");
  const discovered = indexProbe.ok ? await discoverChildPaths(origin) : { paths: [], error: null };

  // Cap the fan-out so a very large index cannot exhaust the worker.
  const paths = discovered.paths.slice(0, 60);
  const childProbes: SitemapProbe[] = [];
  for (let i = 0; i < paths.length; i += CONCURRENCY) {
    const batch = paths.slice(i, i + CONCURRENCY);
    childProbes.push(...(await Promise.all(batch.map((path) => probe(origin, path, "child")))));
  }

  const probes = [indexProbe, ...childProbes];
  const failures = probes
    .filter((p) => !p.ok)
    .map((p) => ({ path: p.path, status: p.status, error: p.error }));
  if (indexProbe.ok && discovered.paths.length === 0) {
    failures.push({ path: "/sitemap.xml", status: indexProbe.status, error: "index advertises no sitemaps" });
  }

  const healthy = failures.length === 0;
  const signature = healthy
    ? "healthy"
    : failures
        .map((f) => `${f.path}:${f.status ?? "err"}`)
        .sort()
        .join("|");

  const { data: previous } = await supabase
    .from("sitemap_health_runs")
    .select("healthy, alert_signature, alerted, checked_at")
    .order("checked_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const prev = previous as
    | { healthy: boolean; alert_signature: string | null; alerted: boolean; checked_at: string }
    | null;

  let alertKind: "failure" | "recovery" | null = null;
  let alertReason: string | null = null;

  if (!healthy) {
    const sameFailure = prev?.alert_signature === signature && prev?.alerted === true;
    const lastAlertMs = prev?.checked_at ? new Date(prev.checked_at).getTime() : 0;
    const stale = Date.now() - lastAlertMs > RE_ALERT_MINUTES * 60_000;
    if (!sameFailure || stale) alertKind = "failure";
    else alertReason = "throttled: identical failure already reported";
  } else if (prev && prev.healthy === false) {
    alertKind = "recovery";
  }

  let alertError: string | null = null;
  if (alertKind) {
    try {
      await sendTemplateEmail("sitemap-alert", ALERT_TO, {
        idempotencyKey: `sitemap-${alertKind}-${signature}-${new Date().toISOString().slice(0, 13)}`,
        templateData: {
          state: alertKind,
          checkedAt: new Date().toLocaleString("en-GB", { timeZone: "Asia/Nicosia" }),
          checked: probes.length,
          failing: failures.length,
          failures: failures.map((f) => ({
            path: f.path,
            status: f.status === null ? "no response" : String(f.status),
            error: f.error ?? "unknown error",
          })),
          dashboardUrl: `${SITE_URL}/admin/sitemap`,
        },
      });
    } catch (err) {
      alertError = err instanceof Error ? err.message : "alert email failed";
      console.error("Sitemap alert email failed", err);
    }
  }

  const durationMs = Date.now() - startedAt;

  await supabase.from("sitemap_health_runs").insert({
    healthy,
    checked_count: probes.length,
    failing_count: failures.length,
    duration_ms: durationMs,
    failures,
    alert_signature: signature,
    alerted: alertKind !== null && alertError === null,
    alert_kind: alertKind,
    alert_error: alertError,
  });

  await supabase
    .from("job_state")
    .update({
      last_run_at: new Date().toISOString(),
      last_error: healthy ? null : failures.map((f) => `${f.path}: ${f.error}`).join("; ").slice(0, 500),
    })
    .eq("key", JOB_KEY);

  return {
    checkedAt: new Date().toISOString(),
    healthy,
    durationMs,
    totals: {
      checked: probes.length,
      failing: failures.length,
      urls: probes.reduce((sum, p) => sum + (p.urlCount ?? 0), 0),
    },
    failures,
    probes,
    alert: { sent: alertKind !== null && alertError === null, kind: alertKind, reason: alertReason ?? alertError },
  };
}

export type SitemapMonitorRun = {
  id: string;
  checkedAt: string;
  healthy: boolean;
  checked: number;
  failing: number;
  durationMs: number | null;
  failures: Array<{ path: string; status: number | null; error: string | null }>;
  alerted: boolean;
  alertKind: string | null;
};

/** Recent monitor history for the admin dashboard. */
export async function readSitemapMonitorHistory(limit = 20): Promise<SitemapMonitorRun[]> {
  const supabase = client();
  const { data, error } = await supabase
    .from("sitemap_health_runs")
    .select("id, checked_at, healthy, checked_count, failing_count, duration_ms, failures, alerted, alert_kind")
    .order("checked_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    checkedAt: row.checked_at,
    healthy: row.healthy,
    checked: row.checked_count,
    failing: row.failing_count,
    durationMs: row.duration_ms,
    failures: (row.failures as SitemapMonitorRun["failures"]) ?? [],
    alerted: row.alerted,
    alertKind: row.alert_kind,
  }));
}
