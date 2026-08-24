import { createFileRoute } from "@tanstack/react-router";
import { goneSitemapResponse } from "@/lib/gone-sitemap";

export const Route = createFileRoute("/new_company_sitemap_5.xml")({
  server: { handlers: { GET: async () => goneSitemapResponse() } },
});
