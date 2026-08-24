import { createFileRoute } from "@tanstack/react-router";
import { getSitemapChunk } from "@/lib/companies.functions";

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
        const { rows } = await getSitemapChunk({ data: { n } });

        let body = `<?xml version="1.0" encoding="UTF-8"?>\n`;
        body += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
        for (const row of rows) {
          const loc = `${BASE_URL}/company/${row.slug}`;
          body += `  <url>\n`;
          body += `    <loc>${loc}</loc>\n`;
          body += `    <changefreq>monthly</changefreq>\n`;
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
