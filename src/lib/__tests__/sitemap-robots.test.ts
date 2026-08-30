import { describe, expect, it } from "vitest";
import {
  buildPagesSitemapXml,
  HOME_PAGE,
  SITE_URL,
  STATIC_PAGES,
} from "@/lib/seo/site-pages";
import { ROBOTS_TXT } from "@/lib/seo/robots";
import { HOME_CANONICAL_URL } from "@/lib/home-head";
import {
  buildRegistryLandingHead,
  registryLandingCanonical,
  registryLandingPath,
  REGISTRY_LANDINGS,
} from "@/lib/seo/registry-landings";
import { DIRECTORY_SIGNALS } from "@/lib/directory-signals";

const xml = buildPagesSitemapXml();
const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]!);

describe("pages sitemap", () => {
  it("references the canonical homepage URL exactly once", () => {
    expect(HOME_PAGE.path).toBe("/");
    expect(locs.filter((loc) => loc === HOME_CANONICAL_URL)).toHaveLength(1);
    expect(`${SITE_URL}/`).toBe(HOME_CANONICAL_URL);
  });

  it("lists every public static page as an absolute canonical URL", () => {
    expect(locs).toHaveLength(STATIC_PAGES.length);
    for (const page of STATIC_PAGES) {
      expect(locs).toContain(`${SITE_URL}${page.path}`);
    }
    for (const loc of locs) {
      expect(loc.startsWith(`${SITE_URL}/`)).toBe(true);
      expect(loc).not.toContain("?");
    }
  });

  it("has no duplicate URLs", () => {
    expect(new Set(locs).size).toBe(locs.length);
  });

  it("includes every registry landing page and directory signal", () => {
    for (const landing of REGISTRY_LANDINGS) {
      expect(locs).toContain(registryLandingCanonical(landing));
    }
    for (const signal of DIRECTORY_SIGNALS) {
      expect(locs).toContain(`${SITE_URL}/directory/${signal.slug}`);
    }
  });

  it("excludes private and transactional routes", () => {
    const blocked = ["/cart", "/checkout", "/account", "/admin", "/auth", "/order/"];
    for (const path of blocked) {
      expect(locs.some((loc) => loc.includes(path))).toBe(false);
    }
  });

  it("is well-formed sitemap XML", () => {
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(xml.trimEnd().endsWith("</urlset>")).toBe(true);
  });
});

describe("robots.txt", () => {
  it("points at the sitemap index on the canonical origin", () => {
    expect(ROBOTS_TXT).toContain(`Sitemap: ${SITE_URL}/sitemap.xml`);
  });

  it("allows crawling of the homepage and public sections", () => {
    expect(ROBOTS_TXT).toMatch(/User-agent: \*/);
    expect(ROBOTS_TXT).not.toMatch(/^Disallow: \/$/m);
    expect(ROBOTS_TXT).toMatch(/^Allow: \/$/m);
  });

  it("does not disallow any URL listed in the pages sitemap", () => {
    const disallowed = [...ROBOTS_TXT.matchAll(/^Disallow:\s*(\S+)$/gm)]
      .map((match) => match[1]!)
      .filter((rule) => rule !== "/*?");
    for (const page of STATIC_PAGES) {
      for (const rule of disallowed) {
        expect(page.path.startsWith(rule)).toBe(false);
      }
    }
  });
});

describe("registry landing metadata", () => {
  it("derives title, description and canonical from one definition", () => {
    for (const landing of REGISTRY_LANDINGS) {
      const head = buildRegistryLandingHead(landing);
      const canonical = registryLandingCanonical(landing);

      expect(head.meta).toContainEqual({ title: landing.title });
      expect(head.meta).toContainEqual({ name: "description", content: landing.description });
      expect(head.meta).toContainEqual({ property: "og:title", content: landing.title });
      expect(head.meta).toContainEqual({
        property: "og:description",
        content: landing.description,
      });
      expect(head.meta).toContainEqual({ property: "og:url", content: canonical });
      expect(head.meta).toContainEqual({ name: "twitter:title", content: landing.title });
      expect(head.links).toEqual([{ rel: "canonical", href: canonical }]);
      expect(canonical).toBe(`${SITE_URL}${registryLandingPath(landing)}`);
    }
  });

  it("keeps H1, title and snippet lengths on-brief and unique", () => {
    const slugs = new Set<string>();
    for (const landing of REGISTRY_LANDINGS) {
      expect(slugs.has(landing.slug)).toBe(false);
      slugs.add(landing.slug);
      expect(landing.h1.length).toBeGreaterThan(10);
      expect(landing.title.length).toBeLessThanOrEqual(60);
      expect(landing.description.length).toBeLessThanOrEqual(165);
      // H1 and title must share the page's core term.
      const core = landing.h1.toLowerCase().split(" ").slice(0, 2).join(" ");
      expect(landing.title.toLowerCase()).toContain(core);
    }
  });

  it("emits breadcrumb and FAQ JSON-LD anchored to the canonical URL", () => {
    for (const landing of REGISTRY_LANDINGS) {
      const [breadcrumb, faq] = buildRegistryLandingHead(landing).scripts.map((script) =>
        JSON.parse(script.children),
      );
      expect(breadcrumb["@type"]).toBe("BreadcrumbList");
      expect(breadcrumb.itemListElement[0].item).toBe(HOME_CANONICAL_URL);
      expect(breadcrumb.itemListElement[1].item).toBe(registryLandingCanonical(landing));
      expect(faq["@type"]).toBe("FAQPage");
      expect(faq.mainEntity).toHaveLength(landing.faqs.length);
    }
  });
});
