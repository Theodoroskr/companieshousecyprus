/**
 * Shared handler for the legacy WordPress sitemap chunks that were retired
 * with the old platform. 410 Gone is a stronger signal than 404, so Google
 * drops the stale submissions from Search Console faster.
 */
export function goneSitemapResponse() {
  return new Response(
    "410 Gone - this sitemap was retired with the old platform. Use /sitemap.xml\n",
    {
      status: 410,
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "public, max-age=86400",
      },
    },
  );
}
