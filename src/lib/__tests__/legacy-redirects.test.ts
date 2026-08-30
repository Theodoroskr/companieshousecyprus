import { describe, expect, it } from "vitest";
import {
  LEGACY_REGISTRY_REDIRECTS,
  isKnownCanonicalPath,
  legacyRegistryRedirect,
  normalizeLegacyPath,
} from "@/lib/seo/legacy-redirects";
import { REGISTRY_LANDINGS, registryLandingPath } from "@/lib/seo/registry-landings";

describe("legacy registry URLs redirect permanently", () => {
  it("uses 301 (never 302) for every mapped legacy URL", () => {
    for (const legacy of Object.keys(LEGACY_REGISTRY_REDIRECTS)) {
      const result = legacyRegistryRedirect(legacy);
      expect(result, legacy).not.toBeNull();
      expect(result!.status, legacy).toBe(301);
    }
  });

  it("maps the core registry terms to their landing pages", () => {
    const search = registryLandingPath(REGISTRY_LANDINGS.find((l) => l.slug === "cyprus-company-search")!);
    expect(legacyRegistryRedirect("/company-search")?.target).toBe(search);
    expect(legacyRegistryRedirect("/search-companies")?.target).toBe(search);
    expect(legacyRegistryRedirect("/registrar-of-companies")?.target).toBe(
      "/registry/registrar-of-companies-cyprus",
    );
    expect(legacyRegistryRedirect("/company-status")?.target).toBe(
      "/registry/cyprus-company-status-check",
    );
    expect(legacyRegistryRedirect("/he-number")?.target).toBe(
      "/registry/check-company-registration-number-cyprus",
    );
    expect(legacyRegistryRedirect("/companies-registry")?.target).toBe("/cyprus-companies-registry");
  });

  it("normalises casing, trailing slashes, locale prefixes and pagination", () => {
    const expected = "/registry/cyprus-company-search";
    for (const input of [
      "/Company-Search",
      "/company-search/",
      "/en/company-search",
      "/EL/company-search/",
      "/company-search/page/3",
    ]) {
      expect(legacyRegistryRedirect(input)?.target, input).toBe(expected);
    }
    expect(normalizeLegacyPath("/EN/Companies/")).toBe("/companies");
  });

  it("preserves the original query string", () => {
    expect(legacyRegistryRedirect("/company-search", "?q=coffee+lovers")?.target).toBe(
      "/registry/cyprus-company-search?q=coffee+lovers",
    );
    expect(legacyRegistryRedirect("/company-search", "utm_source=bing")?.target).toBe(
      "/registry/cyprus-company-search?utm_source=bing",
    );
    expect(legacyRegistryRedirect("/company-search", "?")?.target).toBe(
      "/registry/cyprus-company-search",
    );
  });

  it("does not redirect canonical or unknown paths", () => {
    for (const path of [
      "/",
      "/registry/cyprus-company-search",
      "/cyprus-companies-registry",
      "/company/coffee-lovers-ltd-he266206",
      "/directory/liquidation",
      "/some-random-page",
    ]) {
      expect(legacyRegistryRedirect(path), path).toBeNull();
    }
  });
});

describe("redirect targets are canonical and terminal", () => {
  it("every target is a real indexable page", () => {
    for (const target of Object.values(LEGACY_REGISTRY_REDIRECTS)) {
      expect(isKnownCanonicalPath(target), target).toBe(true);
    }
  });

  it("no chains: a target is never itself a legacy source (one hop only)", () => {
    for (const [source, target] of Object.entries(LEGACY_REGISTRY_REDIRECTS)) {
      expect(target, source).not.toBe(source);
      expect(legacyRegistryRedirect(target), target).toBeNull();
    }
  });
});
