import { createFileRoute } from "@tanstack/react-router";
import { getSitemapIndex } from "@/lib/companies.functions";

const BASE_URL = "https://companieshousecyprus.com";

function w3c(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().replace(/\.\d{3}Z$/, "+00:00");
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const { chunks } = await getSitemapIndex();

        let newest: number | null = null;
        let body = `<?xml version="1.0" encoding="UTF-8"?>\n`;
        body += `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
        // Static pages carry no authoritative per-page change timestamp, so the
        // entry intentionally omits <lastmod>.
        body += `  <sitemap>\n`;
        body += `    <loc>${BASE_URL}/sitemaps/pages.xml</loc>\n`;
        body += `  </sitemap>\n`;
        for (const chunk of chunks) {
          const lastmod = w3c(chunk.lastmod);
          if (chunk.lastmod) {
            const ms = new Date(chunk.lastmod).getTime();
            if (!Number.isNaN(ms) && (newest === null || ms > newest)) newest = ms;
          }
          body += `  <sitemap>\n`;
          body += `    <loc>${BASE_URL}/sitemaps/companies/${chunk.index}.xml</loc>\n`;
          if (lastmod) body += `    <lastmod>${lastmod}</lastmod>\n`;
          body += `  </sitemap>\n`;
        }
        body += `</sitemapindex>\n`;

        const headers: Record<string, string> = {
          "content-type": "application/xml; charset=utf-8",
          "cache-control": "public, max-age=1800, stale-while-revalidate=3600",
        };
        if (newest !== null) headers["last-modified"] = new Date(newest).toUTCString();

        return new Response(body, { headers });
      },
    },
  },
});
