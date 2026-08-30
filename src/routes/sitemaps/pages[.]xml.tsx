import { createFileRoute } from "@tanstack/react-router";
import { buildPagesSitemapXml } from "@/lib/seo/site-pages";

export const Route = createFileRoute("/sitemaps/pages.xml")({
  server: {
    handlers: {
      GET: async () =>
        new Response(buildPagesSitemapXml(), {
          headers: { "content-type": "application/xml; charset=utf-8" },
        }),
    },
  },
});
