import { describe, expect, it } from "vitest";
import { PRODUCTS_BY_SLUG, REPORT_SLUG_ALIASES } from "@/lib/products";
import { STATIC_PAGES } from "@/lib/seo/site-pages";

describe("report addresses", () => {
  it("forwards /report/structure to the public Structure Report page", () => {
    expect(REPORT_SLUG_ALIASES["structure"]).toBe("cyprus-company-profile");
    expect(PRODUCTS_BY_SLUG["cyprus-company-profile"]?.internalOnly).toBeFalsy();
  });

  it("forwards /report/credit to the public Credit Report page", () => {
    expect(REPORT_SLUG_ALIASES["credit"]).toBe("cyprus-credit-report");
    expect(PRODUCTS_BY_SLUG["cyprus-credit-report"]?.internalOnly).toBeFalsy();
  });

  it("lists only report pages that exist in the sitemap", () => {
    const reportPaths = STATIC_PAGES.map((p) => p.path).filter((p) => p.startsWith("/report/"));
    expect(reportPaths.length).toBeGreaterThan(0);
    for (const path of reportPaths) {
      const product = PRODUCTS_BY_SLUG[path.slice("/report/".length)];
      expect(product, path).toBeDefined();
      expect(product?.internalOnly, path).toBeFalsy();
    }
  });
});
