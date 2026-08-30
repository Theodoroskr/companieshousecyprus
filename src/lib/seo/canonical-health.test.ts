import { describe, expect, it } from "vitest";
import {
  chunkIndexForRank,
  evaluateCheck,
  extractCanonicalHref,
  extractLocs,
} from "@/lib/seo/canonical-health";

const base = {
  slug: "C4404",
  canonicalSlug: "infocredit-group-limited-he4404",
  sample: "random",
  status: 200 as number | null,
  location: null as string | null,
  html:
    '<link rel="canonical" href="https://companieshousecyprus.com/company/infocredit-group-limited-he4404"/>' as
      | string
      | null,
  fetchError: null as string | null,
  expectedChunk: 0 as number | null,
  inSitemap: true as boolean | null,
  sitemapError: null as string | null,
  idStatus: 301 as number | null,
  idLocation: "/company/infocredit-group-limited-he4404" as string | null,
};

describe("chunkIndexForRank", () => {
  it("maps ranks to 50k chunks", () => {
    expect(chunkIndexForRank(0)).toBe(0);
    expect(chunkIndexForRank(49_999)).toBe(0);
    expect(chunkIndexForRank(50_000)).toBe(1);
    expect(chunkIndexForRank(571_217)).toBe(11);
  });
});

describe("extractLocs / extractCanonicalHref", () => {
  it("pulls every loc", () => {
    const locs = extractLocs("<url><loc>https://x/a</loc></url><url><loc>\n https://x/b \n</loc></url>");
    expect(locs.has("https://x/a")).toBe(true);
    expect(locs.has("https://x/b")).toBe(true);
    expect(locs.size).toBe(2);
  });

  it("finds the canonical link only", () => {
    const html = '<link rel="stylesheet" href="/a.css"><link href="/company/C1" rel="canonical">';
    expect(extractCanonicalHref(html)).toBe("/company/C1");
    expect(extractCanonicalHref("<link rel=\"alternate\" href=\"/x\">")).toBeNull();
  });
});

describe("evaluateCheck", () => {
  it("passes a healthy canonical URL", () => {
    const check = evaluateCheck(base);
    expect(check.ok).toBe(true);
    expect(check.issues).toEqual([]);
  });

  it("flags redirects", () => {
    const check = evaluateCheck({ ...base, status: 301, location: "/company/c4404", html: null });
    expect(check.issues).toContain("redirected");
    expect(check.ok).toBe(false);
  });

  it("flags non-200 responses", () => {
    expect(evaluateCheck({ ...base, status: 404, html: null }).issues).toContain("not-200");
  });

  it("flags sitemap omissions", () => {
    expect(evaluateCheck({ ...base, inSitemap: false }).issues).toContain("missing-in-sitemap");
  });

  it("flags canonical mismatches", () => {
    const check = evaluateCheck({
      ...base,
      html: '<link rel="canonical" href="https://companieshousecyprus.com/company/infocredit-c4404">',
    });
    expect(check.issues).toContain("canonical-mismatch");
  });

  it("checks the canonical name-based URL, not the registry-ID URL", () => {
    const check = evaluateCheck(base);
    expect(check.url).toBe("https://companieshousecyprus.com/company/infocredit-group-limited-he4404");
    expect(check.canonicalSlug).toBe("infocredit-group-limited-he4404");
  });

  it("accepts a 301 from the registry-ID URL to the canonical URL", () => {
    const check = evaluateCheck(base);
    expect(check.idRedirectsToCanonical).toBe(true);
    expect(check.issues).toEqual([]);
  });

  it("accepts an absolute redirect target", () => {
    const check = evaluateCheck({
      ...base,
      idLocation: "https://companieshousecyprus.com/company/infocredit-group-limited-he4404",
    });
    expect(check.idRedirectsToCanonical).toBe(true);
  });

  it("flags an ID URL that serves 200 instead of redirecting", () => {
    const check = evaluateCheck({ ...base, idStatus: 200, idLocation: null });
    expect(check.issues).toContain("id-url-not-redirecting");
  });

  it("flags an ID URL that redirects to a stale slug", () => {
    const check = evaluateCheck({ ...base, idLocation: "/company/old-name-he4404" });
    expect(check.issues).toContain("id-url-not-redirecting");
  });

  it("flags a temporary redirect from the ID URL", () => {
    const check = evaluateCheck({ ...base, idStatus: 302 });
    expect(check.issues).toContain("id-url-not-redirecting");
  });

  it("skips the ID-redirect check when the slug is already canonical", () => {
    const check = evaluateCheck({
      ...base,
      canonicalSlug: "C4404",
      html: '<link rel="canonical" href="https://companieshousecyprus.com/company/C4404">',
      idStatus: null,
      idLocation: null,
    });
    expect(check.idRedirectsToCanonical).toBeNull();
    expect(check.issues).toEqual([]);
  });

  it("flags unreachable sitemap chunks without claiming a missing URL", () => {
    const check = evaluateCheck({ ...base, inSitemap: null, sitemapError: "HTTP 500" });
    expect(check.issues).toEqual(["sitemap-unreachable"]);
  });

  it("flags fetch failures", () => {
    const check = evaluateCheck({ ...base, status: null, html: null, fetchError: "socket hang up" });
    expect(check.issues).toContain("fetch-failed");
  });
});
