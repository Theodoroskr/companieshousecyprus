import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: () => {
        const body = [
          "User-agent: *",
          "Allow: /",
          "",
          "# OpenAI / ChatGPT crawlers",
          "User-agent: GPTBot",
          "Allow: /",
          "User-agent: ChatGPT-User",
          "Allow: /",
          "",
          "# Anthropic crawlers",
          "User-agent: ClaudeBot",
          "Allow: /",
          "User-agent: Claude-Web",
          "Allow: /",
          "",
          "# Google AI crawlers",
          "User-agent: Google-Extended",
          "Allow: /",
          "User-agent: GoogleOther",
          "Allow: /",
          "",
          "# Common AI crawlers",
          "User-agent: PerplexityBot",
          "Allow: /",
          "User-agent: BingPreview",
          "Allow: /",
          "User-agent: cohere-ai",
          "Allow: /",
          "",
          "Sitemap: https://companieshousecyprus.com/sitemap.xml",
          "AI-sitemap: https://companieshousecyprus.com/llms.txt",
          "AI-policy: https://companieshousecyprus.com/ai.txt",
        ].join("\n");
        return new Response(body, {
          headers: { "content-type": "text/plain; charset=utf-8" },
        });
      },
    },
  },
});
