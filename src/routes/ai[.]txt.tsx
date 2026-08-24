import { createFileRoute } from "@tanstack/react-router";

/**
 * ai.txt — Machine-readable AI crawler policy for Companies House Cyprus.
 *
 * Declares which AI crawlers may access the site and what they may do with the
 * content. Complements robots.txt with an explicit AI-specific policy.
 */
export const Route = createFileRoute("/ai.txt")({
  server: {
    handlers: {
      GET: () => {
        const body = [
          "# AI crawler policy for companieshousecyprus.com",
          "",
          "# Allowed AI agents",
          "Allow: GPTBot",
          "Allow: ChatGPT-User",
          "Allow: ClaudeBot",
          "Allow: Claude-Web",
          "Allow: Google-Extended",
          "Allow: GoogleOther",
          "Allow: PerplexityBot",
          "Allow: BingPreview",
          "Allow: cohere-ai",
          "",
          "# Disallowed uses",
          "Disallow: bulk-scraping-profiles-for-resale",
          "Disallow: automated-account-creation",
          "Disallow: credential-stuffing",
          "",
          "# LLM guide and sitemap",
          "LLM-guide: https://companieshousecyprus.com/llms.txt",
          "Sitemap: https://companieshousecyprus.com/sitemap.xml",
          "",
          "# Contact",
          "Contact: info@companieshousecyprus.com",
        ].join("\n");
        return new Response(body, {
          headers: {
            "content-type": "text/plain; charset=utf-8",
            "x-robots-tag": "all",
          },
        });
      },
    },
  },
});
