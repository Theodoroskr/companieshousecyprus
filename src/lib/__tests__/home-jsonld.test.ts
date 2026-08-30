import { describe, expect, it } from "vitest";
import {
  HOME_TITLE,
  HOME_DESCRIPTION,
  HOME_CANONICAL_URL,
  buildHomeHead,
} from "../home-head";
import { homeWebsiteJsonLd, homeOrganizationJsonLd } from "../home-jsonld";

// Regression guard: the homepage WebSite/Organization JSON-LD must agree with
// the meta snippet (title/description) and point at the canonical URL, so
// crawlers never see conflicting identity signals.
describe("homepage JSON-LD", () => {
  it("WebSite url and @id derive from the canonical URL", () => {
    const site = homeWebsiteJsonLd();
    expect(site["@type"]).toBe("WebSite");
    expect(site.url).toBe(HOME_CANONICAL_URL);
    expect(site["@id"]).toBe(`${HOME_CANONICAL_URL}#website`);
    expect(site.publisher?.["@id"]).toBe(`${HOME_CANONICAL_URL}#organization`);
  });

  it("Organization url, @id and logo derive from the canonical URL", () => {
    const org = homeOrganizationJsonLd();
    expect(org["@type"]).toBe("Organization");
    expect(org.url).toBe(HOME_CANONICAL_URL);
    expect(org["@id"]).toBe(`${HOME_CANONICAL_URL}#organization`);
    expect(org.logo.url).toBe(`${HOME_CANONICAL_URL}favicon.png`);
  });

  it("SearchAction target uses the canonical origin", () => {
    const site = homeWebsiteJsonLd();
    expect(site.potentialAction.target.urlTemplate).toBe(
      `${HOME_CANONICAL_URL}search?q={search_term_string}&page=1`,
    );
  });

  it("entity names match the site title brand", () => {
    const brand = HOME_TITLE.split(/[|:]/)[0]!.trim();
    expect(homeWebsiteJsonLd().name).toBe(brand);
    expect(homeOrganizationJsonLd().name).toBe(brand);
  });

  it("no JSON-LD field drifts from the meta snippet description", () => {
    // The Organization description is a longer marketing paragraph, but the
    // head description must remain the pinned snippet text — pin both so a
    // future edit of one forces a conscious decision on the other.
    const { meta } = buildHomeHead();
    expect(meta).toContainEqual({
      name: "description",
      content: HOME_DESCRIPTION,
    });
    expect(homeOrganizationJsonLd().description).toBe(
      "Search and browse Cyprus companies from the official Registrar of Companies. Company profiles, officials & owners, addresses, statuses, and certified documents delivered digitally.",
    );
  });

  it("canonical URL matches between head and JSON-LD", () => {
    const { links } = buildHomeHead();
    const canonical = links.find((l) => l.rel === "canonical")?.href;
    expect(canonical).toBe(homeWebsiteJsonLd().url);
    expect(canonical).toBe(homeOrganizationJsonLd().url);
  });
});
