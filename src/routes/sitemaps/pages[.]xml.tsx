import { createFileRoute } from "@tanstack/react-router";
import { buildPagesSitemapXml, STATIC_PAGES } from "@/lib/seo/site-pages";

export const Route = createFileRoute("/sitemaps/pages.xml")({
  server: {
    handlers: {
      GET: async () => {
        const { publishedGuides } = await import('@/lib/weekly-guides.server');
        const guides=await publishedGuides();
        return new Response(buildPagesSitemapXml([...STATIC_PAGES,...guides.map(g=>({ path:`/guides/${g.slug}`, priority:'0.7',changefreq:'monthly' as const }))]), {
          headers: { "content-type": "application/xml; charset=utf-8" },
        });
      },
    },
  },
});
