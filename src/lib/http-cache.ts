import { createIsomorphicFn } from "@tanstack/react-start";
import { setResponseHeader, setResponseStatus } from "@tanstack/react-start/server";

/**
 * Caching policy for public, SSR-rendered pages.
 *
 * These are isomorphic functions: on the client they compile to no-ops (and the
 * server-only import is stripped from the browser bundle), on the server they
 * set real response headers.
 */
export const setCompanyPageCacheHeaders = createIsomorphicFn()
  .client((_opts: { slug: string; updatedAt?: string | null }) => {})
  .server((opts: { slug: string; updatedAt?: string | null }) => {
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
  });

/** Caching for public directory listing pages (counts refresh hourly). */
export const setDirectoryPageCacheHeaders = createIsomorphicFn()
  .client(() => {})
  .server(() => {
    setResponseHeader(
      "cache-control",
      "public, max-age=300, s-maxage=86400, stale-while-revalidate=604800",
    );
    setResponseHeader("vary", "Accept-Encoding");
  });

/** Pages that must never be cached or indexed (missing / errored company). */
export const setNoStoreHeaders = createIsomorphicFn()
  .client((_status?: number) => {})
  .server((status?: number) => {
    setResponseHeader("cache-control", "no-store");
    setResponseHeader("x-robots-tag", "noindex");
    if (status) setResponseStatus(status);
  });
