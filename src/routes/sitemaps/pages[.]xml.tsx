import { createFileRoute } from "@tanstack/react-router";
import { DIRECTORY_SIGNALS } from "@/lib/directory-signals";

const BASE_URL = "https://companieshousecyprus.com";

const PATHS = [
  { path: "/", priority: "1.0", changefreq: "weekly" },
  { path: "/search", priority: "0.8", changefreq: "weekly" },
  { path: "/cyprus-companies-registry", priority: "0.9", changefreq: "monthly" },
  { path: "/directory", priority: "0.8", changefreq: "weekly" },
  ...DIRECTORY_SIGNALS.map((signal) => ({
    path: `/directory/${signal.slug}`,
    priority: "0.7",
    changefreq: "weekly",
  })),
  { path: "/guides", priority: "0.6", changefreq: "monthly" },
  { path: "/guides/register-company-cyprus", priority: "0.9", changefreq: "monthly" },
  { path: "/guides/companies-house-cyprus", priority: "0.9", changefreq: "monthly" },
  { path: "/company-set-up/", priority: "0.9", changefreq: "monthly" },


  { path: "/pricing", priority: "0.8", changefreq: "monthly" },
  { path: "/solutions/kyb-for-banks", priority: "0.8", changefreq: "monthly" },
  { path: "/report/structure", priority: "0.7", changefreq: "monthly" },
  { path: "/report/credit", priority: "0.7", changefreq: "monthly" },
  { path: "/about", priority: "0.5", changefreq: "yearly" },
  { path: "/certifications", priority: "0.5", changefreq: "yearly" },
  { path: "/resources", priority: "0.5", changefreq: "monthly" },
  { path: "/faq", priority: "0.5", changefreq: "monthly" },
  { path: "/contact", priority: "0.5", changefreq: "yearly" },
  { path: "/terms", priority: "0.3", changefreq: "yearly" },
  { path: "/privacy", priority: "0.3", changefreq: "yearly" },
];

export const Route = createFileRoute("/sitemaps/pages.xml")({
  server: {
    handlers: {
      GET: async () => {
        let body = `<?xml version="1.0" encoding="UTF-8"?>\n`;
        body += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
        for (const entry of PATHS) {
          body += `  <url>\n`;
          body += `    <loc>${BASE_URL}${entry.path}</loc>\n`;
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
