import { createFileRoute } from "@tanstack/react-router";
import { getSitemapChunk, getSitemapIndex } from "@/lib/companies.functions";

const BASE_URL = "https://companieshousecyprus.com";

export const Route = createFileRoute("/sitemaps/companies/$n.xml")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const raw = params["n.xml"] ?? "0";
        const n = parseInt(raw, 10);
        if (Number.isNaN(n) || n < 0) {
          return new Response("Invalid sitemap chunk", { status: 400 });
        }
        const [{ rows }, { chunks }] = await Promise.all([
          getSitemapChunk({ data: { n } }),
          getSitemapIndex(),
        ]);

        let body = `<?xml version="1.0" encoding="UTF-8"?>\n`;
        body += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
        for (const row of rows) {
          const loc = `${BASE_URL}/company/${row.canonicalSlug}`;
          body += `  <url>\n`;
          body += `    <loc>${loc}</loc>\n`;
          // Page-specific lastmod (content_updated_at) so recrawlers pick up
          // enriched profiles; omitted when the source timestamp is missing.
          if (row.lastmod) {
            const d = new Date(row.lastmod);
            if (!Number.isNaN(d.getTime())) {
              body += `    <lastmod>${d.toISOString().slice(0, 10)}</lastmod>\n`;
            }
          }
          body += `    <changefreq>monthly</changefreq>\n`;
          body += `  </url>\n`;
        }

        body += `</urlset>\n`;

        const headers: Record<string, string> = {
          "content-type": "application/xml; charset=utf-8",
          "cache-control": "public, max-age=1800, stale-while-revalidate=3600",
        };
        const lastmod = chunks.find((chunk) => chunk.index === n)?.lastmod;
        if (lastmod) {
          const ms = new Date(lastmod).getTime();
          if (!Number.isNaN(ms)) headers["last-modified"] = new Date(ms).toUTCString();
        }

        return new Response(body, { headers });
      },
    },
  },
});
