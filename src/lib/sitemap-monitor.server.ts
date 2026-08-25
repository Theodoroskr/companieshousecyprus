/**
 * Automated sitemap health monitor.
 *
 * Runs from the scheduler every 15 minutes: fetches /sitemap.xml, discovers
 * every sitemap it advertises (pages + company chunks) and fetches each one.
 * Any non-200 response, non-XML body or network failure is recorded and an
 * alert email is sent to the office address. Failure alerts are deduplicated
 * per incident; a recovery email is sent once the incident clears.
 */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { extractLocs } from "@/lib/seo/canonical-health";
import { sendTemplateEmail } from "@/lib/email-templates/send-email";

const JOB_KEY = "sitemap_monitor";
const SITE_URL = "https://companieshousecyprus.com";
const ALERT_TO = "info@companieshousecyprus.com";
const FETCH_TIMEOUT_MS = 25_000;
/** Company chunks are multi-megabyte; probe a few at a time so none time out. */
const CONCURRENCY = 4;

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

const USER_AGENT =
  "Mozilla/5.0 (compatible; CHCSitemapMonitor/1.0; +https://companieshousecyprus.com/admin/sitemap)";
/** Company chunks are ~6 MB; only the first slice is needed to validate them. */
const RANGE_BYTES = 256 * 1024;
/** Transient 403/429/5xx/timeouts are retried before a failure is recorded. */
const MAX_ATTEMPTS = 3;

function isLargeChunk(path: string) {
  return path.includes("/sitemaps/companies/");
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function canonicalOrigin() {
  return new URL(SITE_URL).origin;
}

async function fetchSitemap(url: string, partial: boolean) {
  const headers: Record<string, string> = {
    "user-agent": USER_AGENT,
    accept: "application/xml,text/xml;q=0.9,*/*;q=0.5",
    "cache-control": "no-cache",
  };
  if (partial) headers["range"] = `bytes=0-${RANGE_BYTES - 1}`;
  return fetch(url, {
    method: "GET",
    redirect: "manual",
    headers,
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
}

async function probeOnce(origin: string, path: string, partial: boolean) {
  const res = await fetchSitemap(`${origin}${path}`, partial);
  const body = await res.text();
  const contentType = res.headers.get("content-type");
  const isXml = !!contentType && contentType.includes("xml");
  // Some origins ignore Range and return the whole file; only 206 is truly partial.
  const truncated = res.status === 206;
  let error: string | null = null;
  if (res.status >= 300 && res.status < 400) error = `redirected to ${res.headers.get("location") ?? "unknown"}`;
  else if (res.status !== 200 && res.status !== 206) error = `HTTP ${res.status}`;
  else if (!isXml) error = `unexpected content-type: ${contentType ?? "none"}`;
  else if (!body.includes("<loc>")) error = "sitemap contains no <loc> entries";
  return {
    status: res.status,
    contentType,
    error,
    urlCount: isXml && !truncated ? extractLocs(body).size : null,
  };
}

function retryable(status: number | null, error: string | null): boolean {
  if (status === 403 || status === 429 || (status !== null && status >= 500)) return true;
  return status === null && !!error;
}

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
  const partial = kind === "child" && isLargeChunk(path);
  let last: SitemapProbe = base;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const result = await probeOnce(origin, path, partial);
      last = { ...base, ...result, ok: result.error === null };
    } catch (err) {
      last = { ...base, error: err instanceof Error ? err.message : "fetch failed" };
    }
    if (last.ok || !retryable(last.status, last.error)) return last;
    if (attempt < MAX_ATTEMPTS) await sleep(attempt * 1_500);
  }
  return last;
}

async function discoverChildPaths(origin: string): Promise<{ paths: string[]; error: string | null }> {
  try {
    const res = await fetchSitemap(`${origin}/sitemap.xml`, false);
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

type PreviousMonitorRun = {
  healthy: boolean;
  alert_signature: string | null;
  alerted: boolean;
  alert_kind: string | null;
  checked_at: string;
};

async function readLatestRun(supabase: ReturnType<typeof client>) {
  const { data } = await supabase
    .from("sitemap_health_runs")
    .select("healthy, alert_signature, alerted, alert_kind, checked_at")
    .order("checked_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data as PreviousMonitorRun | null;
}

async function readLatestHealthyRunAt(supabase: ReturnType<typeof client>) {
  const { data } = await supabase
    .from("sitemap_health_runs")
    .select("checked_at")
    .eq("healthy", true)
    .order("checked_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data as { checked_at: string } | null)?.checked_at ?? null;
}

async function hasFailureAlertInOpenIncident(supabase: ReturnType<typeof client>, since: string | null) {
  let query = supabase
    .from("sitemap_health_runs")
    .select("id", { count: "exact", head: true })
    .eq("healthy", false)
    .eq("alerted", true)
    .eq("alert_kind", "failure");

  if (since) query = query.gt("checked_at", since);

  const { count } = await query;
  return (count ?? 0) > 0;
}

/** Runs one full health check, persists it and alerts on state changes. */
export async function runSitemapHealthCheck(_origin: string): Promise<SitemapMonitorResult> {
  const startedAt = Date.now();
  const supabase = client();
  const origin = canonicalOrigin();

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

  const prev = await readLatestRun(supabase);

  let alertKind: "failure" | "recovery" | null = null;
  let alertReason: string | null = null;
  let incidentKey = signature;

  if (!healthy) {
    const latestHealthyAt = await readLatestHealthyRunAt(supabase);
    const alreadyAlerted = await hasFailureAlertInOpenIncident(supabase, latestHealthyAt);
    incidentKey = `${latestHealthyAt ?? "initial"}-${signature}`;

    if (!alreadyAlerted) alertKind = "failure";
    else alertReason = "deduplicated: failure incident already reported";
  } else if (prev && prev.healthy === false) {
    alertKind = "recovery";
    incidentKey = prev.alert_signature ?? signature;
  }

  let alertError: string | null = null;
  if (alertKind) {
    try {
      await sendTemplateEmail("sitemap-alert", ALERT_TO, {
        idempotencyKey: `sitemap-${alertKind}-${incidentKey}`,
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
