import { describe, expect, it } from "vitest";
import {
  HOME_TITLE,
  HOME_DESCRIPTION,
  HOME_CANONICAL_URL,
  buildHomeHead,
} from "../home-head";

// Regression guard: the homepage title, meta description and canonical URL
// are the snippet Google indexes. Any accidental edit or drift between
// title/description, Open Graph, Twitter card and canonical fails here.
describe("homepage head metadata", () => {
  it("keeps the pinned title, description and canonical URL", () => {
    expect(HOME_TITLE).toBe(
      "Companies House Cyprus | Free Cyprus Company Search",
    );
    expect(HOME_DESCRIPTION).toBe(
      "Search Companies House Cyprus free: company status, registration number, type, directors and registered office. Official certificates and reports delivered digitally in minutes.",
    );
    expect(HOME_CANONICAL_URL).toBe("https://companieshousecyprus.com/");
  });

  it("emits title and description meta tags", () => {
    const { meta } = buildHomeHead();
    expect(meta).toContainEqual({ title: HOME_TITLE });
    expect(meta).toContainEqual({
      name: "description",
      content: HOME_DESCRIPTION,
    });
  });

  it("keeps og:title and og:description identical to the snippet text", () => {
    const { meta } = buildHomeHead();
    expect(meta).toContainEqual({ property: "og:title", content: HOME_TITLE });
    expect(meta).toContainEqual({
      property: "og:description",
      content: HOME_DESCRIPTION,
    });
  });

  it("keeps twitter card text identical to the snippet text", () => {
    const { meta } = buildHomeHead();
    expect(meta).toContainEqual({
      name: "twitter:title",
      content: HOME_TITLE,
    });
    expect(meta).toContainEqual({
      name: "twitter:description",
      content: HOME_DESCRIPTION,
    });
    expect(meta).toContainEqual({
      name: "twitter:card",
      content: "summary_large_image",
    });
  });

  it("points canonical and og:url at the same canonical URL", () => {
    const { meta, links } = buildHomeHead();
    expect(links).toContainEqual({
      rel: "canonical",
      href: HOME_CANONICAL_URL,
    });
    expect(meta).toContainEqual({
      property: "og:url",
      content: HOME_CANONICAL_URL,
    });
  });

  it("emits exactly one canonical link", () => {
    const { links } = buildHomeHead();
    expect(links.filter((l) => l.rel === "canonical")).toHaveLength(1);
  });
});
