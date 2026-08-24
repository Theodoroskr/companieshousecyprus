import { createFileRoute } from "@tanstack/react-router";
import { redirectToSitemap } from "@/lib/legacy-sitemap";

export const Route = createFileRoute("/sitemap1.xml")({
  server: { handlers: { GET: async () => redirectToSitemap() } },
});
