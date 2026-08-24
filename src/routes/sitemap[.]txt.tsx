import { createFileRoute } from "@tanstack/react-router";
import { redirectToSitemap } from "@/lib/legacy-sitemap";

export const Route = createFileRoute("/sitemap.txt")({
  server: { handlers: { GET: async () => redirectToSitemap() } },
});
