import { createFileRoute } from "@tanstack/react-router";
import { SITE_URL } from "@/lib/seo/site-pages";

/**
 * Dedicated sitemap for the Cyprus corporate registry section, submitted to
 * Google Search Console on its own so indexing of the registry hub can be
 * tracked separately from the rest of the site.
 *
 * Static content pages carry no authoritative per-page change timestamp, so
 * entries intentionally omit <lastmod>.
 */
const URLS = [
  { path: "/cyprus-corporate-registry", changefreq: "daily", priority: "0.9" },
  { path: "/guides/cyprus-he-number-lookup", changefreq: "monthly", priority: "0.8" },
] as const;

export const Route = createFileRoute("/sitemaps/cyprus-corporate-registry.xml")({
  server: {
    handlers: {
      GET: async () => {
        let body = `<?xml version="1.0" encoding="UTF-8"?>\n`;
        body += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
        for (const entry of URLS) {
          body += `  <url>\n`;
          body += `    <loc>${SITE_URL}${entry.path}</loc>\n`;
          body += `    <changefreq>${entry.changefreq}</changefreq>\n`;
          body += `    <priority>${entry.priority}</priority>\n`;
          body += `  </url>\n`;
        }
        body += `</urlset>\n`;
        return new Response(body, {
          headers: { "content-type": "application/xml; charset=utf-8" },
        });
      },
    },
  },
});
