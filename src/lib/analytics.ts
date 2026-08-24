/**
 * Lightweight, dependency-free event tracking.
 *
 * Events are pushed to `window.dataLayer` (GTM-compatible) and also emitted as
 * a DOM CustomEvent so any future analytics wrapper can subscribe without
 * touching call sites. Safe to call during SSR — it no-ops on the server.
 */
export type TrackedEvent =
  | "cta_click"
  | "form_start"
  | "form_submit"
  | "form_error"
  | "guide_download";

export function trackEvent(event: TrackedEvent, params: Record<string, string | number | boolean> = {}) {
  if (typeof window === "undefined") return;
  const payload = { event, ...params };
  const w = window as unknown as { dataLayer?: unknown[] };
  w.dataLayer = w.dataLayer ?? [];
  w.dataLayer.push(payload);
  try {
    window.dispatchEvent(new CustomEvent("app:track", { detail: payload }));
  } catch {
    /* ignore */
  }
}

/** Reads UTM + referral context from the current browser location. */
export function campaignContext(): {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  landing_page?: string;
  referral_url?: string;
} {
  if (typeof window === "undefined") return {};
  const url = new URL(window.location.href);
  const get = (key: string) => url.searchParams.get(key)?.slice(0, 200) || undefined;
  const out: Record<string, string> = {
    landing_page: `${url.origin}${url.pathname}`,
  };
  const source = get("utm_source");
  const medium = get("utm_medium");
  const campaign = get("utm_campaign");
  if (source) out["utm_source"] = source;
  if (medium) out["utm_medium"] = medium;
  if (campaign) out["utm_campaign"] = campaign;
  if (document.referrer) out["referral_url"] = document.referrer.slice(0, 500);
  return out;
}
