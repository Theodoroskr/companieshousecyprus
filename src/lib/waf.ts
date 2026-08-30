/**
 * Lightweight application WAF for login-probing traffic.
 *
 * Two layers:
 *  1. Deny-list — paths that only exist on WordPress/phpMyAdmin style stacks
 *     (/wp-admin, /wp-login.php, /administrator, .env, ...). We never serve
 *     these, so any hit is a probe: answer 403 immediately, no SSR work.
 *  2. Rate limit — real auth surfaces (/auth, /login, /signin, /reset-password)
 *     get a per-IP sliding window. Bursts beyond the threshold get 403.
 *
 * Counters live in module memory (per worker isolate). That is intentionally
 * cheap: it clips high-rate single-source bursts without any storage
 * round-trip, and legitimate users never approach the threshold.
 */

/** Paths that do not exist in this app — hitting them is always a probe. */
const DENY_PATTERNS: RegExp[] = [
  /^\/wp-(admin|login|content|includes|json)(\/|\.php|$)/i,
  /^\/(xmlrpc|wlwmanifest)\.php$/i,
  /^\/(administrator|admin\.php|phpmyadmin|pma|myadmin|adminer(\.php)?)(\/|$)/i,
  /^\/\.(env|git|aws|ssh|svn)(\/|$)/i,
  /^\/(config|configuration|settings)\.(php|json|yml|yaml|bak)$/i,
  /^\/(cgi-bin|vendor\/phpunit|solr|boaform|hudson|jenkins)(\/|$)/i,
  /^\/(login|signin|admin|user|api)\/.*\.(php|asp|aspx|jsp|cgi)$/i,
  /\.(php|asp|aspx|jsp|cgi|env|sql|bak)$/i,
];

/** Real authentication surfaces we rate-limit rather than deny. */
const AUTH_PATTERNS: RegExp[] = [
  /^\/auth\/?$/i,
  /^\/login\/?$/i,
  /^\/signin\/?$/i,
  /^\/sign-in\/?$/i,
  /^\/register\/?$/i,
  /^\/reset-password\/?$/i,
];

/** User agents that identify themselves as scanners/scripted clients. */
const BAD_USER_AGENT =
  /(sqlmap|nikto|nmap|masscan|dirbuster|gobuster|wpscan|zgrab|hydra|havij|acunetix|nessus|python-requests|go-http-client|libwww-perl|curl\/|wget\/)/i;

export const AUTH_WINDOW_MS = 60_000;
export const AUTH_MAX_HITS = 20;
export const PROBE_WINDOW_MS = 300_000;
export const PROBE_MAX_HITS = 5;

type Bucket = { hits: number[] };
const buckets = new Map<string, Bucket>();
const MAX_TRACKED_CLIENTS = 5_000;

function hit(key: string, windowMs: number, now: number): number {
  let bucket = buckets.get(key);
  if (!bucket) {
    if (buckets.size >= MAX_TRACKED_CLIENTS) buckets.clear(); // cheap bounded memory
    bucket = { hits: [] };
    buckets.set(key, bucket);
  }
  bucket.hits = bucket.hits.filter((t) => now - t < windowMs);
  bucket.hits.push(now);
  return bucket.hits.length;
}

/** Test helper — clears the in-memory rate-limit state. */
export function resetWafState(): void {
  buckets.clear();
}

export function clientKey(request: Request): string {
  const headers = request.headers;
  return (
    headers.get("cf-connecting-ip") ??
    headers.get("x-real-ip") ??
    (headers.get("x-forwarded-for") ?? "").split(",")[0]?.trim() ??
    "unknown"
  );
}

export type WafVerdict =
  | { action: "allow" }
  | { action: "deny"; reason: "probe-path" | "bad-agent" | "rate-limit" };

export function inspectRequest(request: Request, now: number = Date.now()): WafVerdict {
  const url = new URL(request.url);
  const path = url.pathname;
  const ip = clientKey(request);

  if (DENY_PATTERNS.some((re) => re.test(path))) {
    hit(`probe:${ip}`, PROBE_WINDOW_MS, now);
    return { action: "deny", reason: "probe-path" };
  }

  const isAuthPath = AUTH_PATTERNS.some((re) => re.test(path));
  if (!isAuthPath) return { action: "allow" };

  const ua = request.headers.get("user-agent") ?? "";
  if (!ua || BAD_USER_AGENT.test(ua)) return { action: "deny", reason: "bad-agent" };

  // A client that already tripped the deny-list is treated as hostile on the
  // auth surface too.
  const priorProbes = buckets.get(`probe:${ip}`)?.hits.filter((t) => now - t < PROBE_WINDOW_MS).length ?? 0;
  if (priorProbes >= PROBE_MAX_HITS) return { action: "deny", reason: "rate-limit" };

  if (hit(`auth:${ip}`, AUTH_WINDOW_MS, now) > AUTH_MAX_HITS) {
    return { action: "deny", reason: "rate-limit" };
  }

  return { action: "allow" };
}

export function wafDenyResponse(reason: string): Response {
  return new Response("Forbidden", {
    status: 403,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
      "x-robots-tag": "noindex, nofollow",
      "x-waf-reason": reason,
    },
  });
}
