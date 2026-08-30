/**
 * Edge-level bot guard for the /auth page.
 *
 * A botnet has been hammering GET /auth with cookieless, referrer-less direct
 * hits from CN data-centre ranges (~180k views, ~0.4s sessions, zero form
 * submissions). Those requests never run JavaScript, so we answer them with a
 * tiny interstitial that sets a cookie and reloads. Real browsers pass it in
 * milliseconds; script-only clients loop on the interstitial and never reach
 * the app.
 */

export const AUTH_GUARD_COOKIE = "chc_ac";

/** Countries whose cookieless direct hits get challenged. */
const CHALLENGED_COUNTRIES = new Set(["CN", "HK"]);

const GUARDED_PATHS = new Set(["/auth", "/auth/", "/reset-password", "/reset-password/"]);

export type GuardDecision = "allow" | "challenge";

function dayStamp(now: Date): string {
  return now.toISOString().slice(0, 10);
}

/** Rotating token the interstitial writes into the cookie. Not a secret — a proof of JS. */
export function guardToken(now: Date = new Date()): string {
  const stamp = dayStamp(now);
  let hash = 2166136261;
  for (const ch of `chc-auth-guard:${stamp}`) {
    hash ^= ch.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return `${stamp}.${(hash >>> 0).toString(36)}`;
}

function hasValidGuardCookie(cookieHeader: string | null, now: Date): boolean {
  if (!cookieHeader) return false;
  const expected = guardToken(now);
  const yesterday = guardToken(new Date(now.getTime() - 86_400_000));
  return cookieHeader
    .split(";")
    .map((part) => part.trim())
    .some((part) => part === `${AUTH_GUARD_COOKIE}=${expected}` || part === `${AUTH_GUARD_COOKIE}=${yesterday}`);
}

function isDocumentRequest(request: Request): boolean {
  if (request.method !== "GET") return false;
  const dest = request.headers.get("sec-fetch-dest");
  if (dest && dest !== "document") return false;
  const accept = request.headers.get("accept") ?? "";
  return accept === "" || accept.includes("text/html") || accept.includes("*/*");
}

export function decideAuthGuard(request: Request, now: Date = new Date()): GuardDecision {
  const url = new URL(request.url);
  if (!GUARDED_PATHS.has(url.pathname)) return "allow";
  if (!isDocumentRequest(request)) return "allow";

  const country = (request.headers.get("cf-ipcountry") ?? "").toUpperCase();
  if (!CHALLENGED_COUNTRIES.has(country)) return "allow";

  // Anyone arriving from our own site (internal link) or already carrying any
  // session/analytics cookie is a returning browser, not a bare probe.
  const cookieHeader = request.headers.get("cookie");
  if (hasValidGuardCookie(cookieHeader, now)) return "allow";

  const referer = request.headers.get("referer");
  if (referer) {
    try {
      if (new URL(referer).host === url.host) return "allow";
    } catch {
      /* malformed referer — treat as direct */
    }
  }

  return "challenge";
}

export function authChallengeResponse(url: string, now: Date = new Date()): Response {
  const token = guardToken(now);
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="robots" content="noindex, nofollow">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Checking your browser</title>
<style>body{font-family:system-ui,sans-serif;margin:0;display:flex;min-height:100vh;align-items:center;justify-content:center;background:#0b1b2b;color:#e8eef5}main{text-align:center;padding:24px}p{opacity:.75;font-size:14px}</style>
</head><body><main>
<h1>Checking your browser…</h1>
<p>This takes a moment. You will be redirected automatically.</p>
<noscript><p>JavaScript is required to continue to the sign-in page.</p></noscript>
<script>
document.cookie = ${JSON.stringify(`${AUTH_GUARD_COOKIE}=${token}`)} + "; path=/; max-age=86400; samesite=lax" + (location.protocol === "https:" ? "; secure" : "");
location.replace(${JSON.stringify(url)});
</script>
</main></body></html>`;

  return new Response(html, {
    status: 503,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "x-robots-tag": "noindex, nofollow",
      "retry-after": "5",
    },
  });
}
