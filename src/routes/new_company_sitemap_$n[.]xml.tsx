import { createFileRoute } from "@tanstack/react-router";

/**
 * Legacy WordPress sitemap chunks (/new_company_sitemap_2.xml ... _10.xml).
 * They no longer exist. Answer 410 Gone instead of the app's 404 page so
 * Google retires the stale submissions faster.
 */
export const Route = createFileRoute("/new_company_sitemap_$n.xml")({
  server: {
    handlers: {
      GET: async () =>
        new Response("410 Gone — this sitemap was retired with the old platform. Use /sitemap.xml\n", {
          status: 410,
          headers: {
            "content-type": "text/plain; charset=utf-8",
            "cache-control": "public, max-age=86400",
          },
        }),
    },
  },
});
