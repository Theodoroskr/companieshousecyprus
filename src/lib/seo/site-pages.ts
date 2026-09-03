/**
 * Canonical inventory of public, indexable pages.
 *
 * Single source of truth for /sitemaps/pages.xml and for the
 * sitemap/robots regression tests. Company profile URLs live in the
 * chunked company sitemaps and are not listed here.
 */
import { DIRECTORY_SIGNALS } from "@/lib/directory-signals";
import { INTERNATIONAL_GUIDES, INTERNATIONAL_HUB_PATH } from "@/lib/seo/international-guides";
import { REGISTRY_LANDINGS, registryLandingPath, SITE_URL } from "@/lib/seo/registry-landings";

export { SITE_URL };

export type SitemapPage = {
  path: string;
  priority: string;
  changefreq: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
};

export const HOME_PAGE: SitemapPage = { path: "/", priority: "1.0", changefreq: "weekly" };

export const STATIC_PAGES: SitemapPage[] = [
  HOME_PAGE,
  { path: "/search", priority: "0.8", changefreq: "weekly" },
  { path: "/cyprus-companies-registry", priority: "0.9", changefreq: "monthly" },
  ...REGISTRY_LANDINGS.map((landing) => ({
    path: registryLandingPath(landing),
    priority: "0.9",
    changefreq: "monthly" as const,
  })),
  { path: INTERNATIONAL_HUB_PATH, priority: "0.8", changefreq: "monthly" },
  ...INTERNATIONAL_GUIDES.map((guide) => ({
    path: guide.path,
    priority: "0.8",
    changefreq: "monthly" as const,
  })),
  { path: "/directory", priority: "0.8", changefreq: "weekly" },
  ...DIRECTORY_SIGNALS.map((signal) => ({
    path: `/directory/${signal.slug}`,
    priority: "0.7",
    changefreq: "weekly" as const,
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
  { path: "/statistics", priority: "0.7", changefreq: "monthly" },
  { path: "/faq", priority: "0.5", changefreq: "monthly" },
  { path: "/contact", priority: "0.5", changefreq: "yearly" },
  { path: "/terms", priority: "0.3", changefreq: "yearly" },
  { path: "/privacy", priority: "0.3", changefreq: "yearly" },
];

/** Renders the <urlset> body for the static pages sitemap. */
export function buildPagesSitemapXml(pages: SitemapPage[] = STATIC_PAGES): string {
  let body = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  body += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
  for (const entry of pages) {
    body += `  <url>\n`;
    body += `    <loc>${SITE_URL}${entry.path}</loc>\n`;
    body += `    <changefreq>${entry.changefreq}</changefreq>\n`;
    body += `    <priority>${entry.priority}</priority>\n`;
    body += `  </url>\n`;
  }
  body += `</urlset>\n`;
  return body;
}
