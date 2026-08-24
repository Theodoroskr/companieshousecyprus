/**
 * Legacy sitemap URL variants left over from the old WordPress platform.
 *
 * Two different signals are used on purpose:
 * - `goneSitemapResponse()` (410) for the chunk URLs that were actually
 *   submitted to Search Console, so Google drops those stale submissions.
 * - `redirectToSitemap()` (301) for every other legacy alias, so crawlers and
 *   any lingering external links land on the live sitemap index instead of an
 *   error page.
 */
export const CURRENT_SITEMAP_PATH = "/sitemap.xml";

export function redirectToSitemap() {
  return new Response(null, {
    status: 301,
    headers: {
      location: CURRENT_SITEMAP_PATH,
      "cache-control": "public, max-age=86400",
    },
  });
}
