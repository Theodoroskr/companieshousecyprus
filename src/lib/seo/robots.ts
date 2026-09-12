// Single source of truth for robots.txt. Keep in sync with public/robots.txt.
export const ROBOTS_TXT = `# robots.txt for companieshousecyprus.com
# Canonical company profiles: /company/<ID> and /company/<slug> (no query strings)
# Query-string variants stay crawlable so Google can read their canonical/noindex tags.

User-agent: *
Allow: /
Allow: /company/
Allow: /companies/
Allow: /sitemap.xml
Disallow: /cart
Disallow: /checkout
Disallow: /account
Disallow: /admin
Disallow: /auth
Disallow: /order/
Disallow: /api/
Disallow: /lovable/

User-agent: Googlebot
Allow: /
Allow: /company/
Disallow: /cart
Disallow: /checkout
Disallow: /account
Disallow: /admin
Disallow: /auth
Disallow: /order/
Disallow: /api/

User-agent: Bingbot
Allow: /
Allow: /company/
Disallow: /cart
Disallow: /checkout
Disallow: /account
Disallow: /admin
Disallow: /auth
Disallow: /order/
Disallow: /api/

# Social preview fetchers (need unrestricted page access)
User-agent: Twitterbot
Allow: /

User-agent: facebookexternalhit
Allow: /

# AI crawlers: allow public content, block private and parameterized URLs
User-agent: GPTBot
Allow: /
Disallow: /cart
Disallow: /checkout
Disallow: /account
Disallow: /admin
Disallow: /auth
Disallow: /order/

User-agent: ChatGPT-User
Allow: /
Disallow: /account
Disallow: /admin
Disallow: /order/

User-agent: OAI-SearchBot
Allow: /
Disallow: /account
Disallow: /admin
Disallow: /order/

User-agent: ClaudeBot
Allow: /
Disallow: /account
Disallow: /admin
Disallow: /order/

User-agent: Claude-Web
Allow: /
Disallow: /account
Disallow: /admin
Disallow: /order/

User-agent: Google-Extended
Allow: /

User-agent: GoogleOther
Allow: /
Disallow: /account
Disallow: /admin
Disallow: /order/

User-agent: PerplexityBot
Allow: /
Disallow: /account
Disallow: /admin
Disallow: /order/

User-agent: BingPreview
Allow: /

User-agent: cohere-ai
Allow: /
Disallow: /account
Disallow: /admin
Disallow: /order/

Sitemap: https://companieshousecyprus.com/sitemap.xml
Sitemap: https://companieshousecyprus.com/sitemaps/cyprus-corporate-registry.xml
AI-sitemap: https://companieshousecyprus.com/llms.txt
AI-policy: https://companieshousecyprus.com/ai.txt
`;
