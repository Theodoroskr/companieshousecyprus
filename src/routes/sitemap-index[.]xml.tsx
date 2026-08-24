import { createFileRoute } from "@tanstack/react-router";
import { redirectToSitemap } from "@/lib/legacy-sitemap";

export const Route = createFileRoute("/sitemap-index.xml")({
  server: { handlers: { GET: async () => redirectToSitemap() } },
});
