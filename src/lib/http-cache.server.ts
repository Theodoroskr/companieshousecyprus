import { setResponseHeader, setResponseStatus } from "@tanstack/react-start/server";

/**
 * Caching policy for public, SSR-rendered company profile pages.
 *
 * - Browsers keep a short copy (max-age) so back/forward and repeat visits are instant.
 * - Shared caches / CDN keep it much longer (s-maxage) and refresh in the background
 *   (stale-while-revalidate), which is what cuts crawl latency for search engines.
 * - Last-Modified + ETag let crawlers and the CDN revalidate cheaply.
 */
export function setCompanyPageCacheHeaders(opts: {
  slug: string;
  updatedAt?: string | null;
}) {
  setResponseHeader(
    "cache-control",
    "public, max-age=300, s-maxage=86400, stale-while-revalidate=604800",
  );
  setResponseHeader("vary", "Accept-Encoding");

  const updated = opts.updatedAt ? new Date(opts.updatedAt) : null;
  if (updated && !Number.isNaN(updated.getTime())) {
    setResponseHeader("last-modified", updated.toUTCString());
    setResponseHeader("etag", `W/"${opts.slug}-${Math.floor(updated.getTime() / 1000)}"`);
  }
}

/** Caching for public directory listing pages (counts refresh hourly). */
export function setDirectoryPageCacheHeaders() {
  setResponseHeader(
    "cache-control",
    "public, max-age=300, s-maxage=86400, stale-while-revalidate=604800",
  );
  setResponseHeader("vary", "Accept-Encoding");
}



/** Pages that must never be cached or indexed (missing / errored company). */
export function setNoStoreHeaders(status?: number) {
  setResponseHeader("cache-control", "no-store");
  setResponseHeader("x-robots-tag", "noindex");
  if (status) setResponseStatus(status);
}
