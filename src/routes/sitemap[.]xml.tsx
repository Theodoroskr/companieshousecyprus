import { createFileRoute } from "@tanstack/react-router";
import { getCompanyCount } from "@/lib/companies.functions";

const SITEMAP_CHUNK_SIZE = 50_000;
const BASE_URL = "https://companieshousecyprus.com";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const count = await getCompanyCount();
        const chunks = Math.ceil(count / SITEMAP_CHUNK_SIZE);

        let body = `<?xml version="1.0" encoding="UTF-8"?>\n`;
        body += `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
        body += `  <sitemap>\n`;
        body += `    <loc>${BASE_URL}/sitemaps/companies/0.xml</loc>\n`;
        body += `  </sitemap>\n`;
        for (let i = 1; i < chunks; i++) {
          body += `  <sitemap>\n`;
          body += `    <loc>${BASE_URL}/sitemaps/companies/${i}.xml</loc>\n`;
          body += `  </sitemap>\n`;
        }
        body += `</sitemapindex>\n`;

        return new Response(body, {
          headers: { "content-type": "application/xml; charset=utf-8" },
        });
      },
    },
  },
});
