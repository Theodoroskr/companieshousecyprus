import { createFileRoute } from "@tanstack/react-router";
import { redirectToSitemap } from "@/lib/legacy-sitemap";

export const Route = createFileRoute("/sitemap_index.xml.gz")({
  server: { handlers: { GET: async () => redirectToSitemap() } },
});
