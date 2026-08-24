import { describe, expect, it } from "vitest";
import {
  A4A_PRODUCT_KIND,
  REPORT_PRODUCTS,
  pickCompanyCode,
  productCodeForSlug,
  registrationDigits,
  reportKindForProduct,
} from "./api4all-codes";

describe("API4ALL product codes", () => {
  it("uses 2200 for the structure (Cyprus Company Profile) report", () => {
    expect(REPORT_PRODUCTS.structure).toBe("2200");
  });

  it("uses 2300 for the credit report", () => {
    expect(REPORT_PRODUCTS.credit).toBe("2300");
  });

  it("maps catalogue products to the right report kind", () => {
    expect(reportKindForProduct("cyprus-company-profile")).toBe("structure");
    expect(reportKindForProduct("cyprus-credit-report")).toBe("credit");
    expect(reportKindForProduct("certificate-of-incorporation")).toBeNull();
  });

  it("maps catalogue products straight to the API4ALL product code", () => {
    expect(productCodeForSlug("cyprus-company-profile")).toBe("2200");
    expect(productCodeForSlug("cyprus-credit-report")).toBe("2300");
    expect(productCodeForSlug("due-diligence-report")).toBeNull();
  });

  it("never reuses the legacy 2100 code", () => {
    expect(Object.values(REPORT_PRODUCTS)).not.toContain("2100");
    expect(Object.keys(A4A_PRODUCT_KIND)).toHaveLength(2);
  });
});

describe("registration number mapping", () => {
  it("extracts digits from registrar numbers", () => {
    expect(registrationDigits("C4404")).toBe("4404");
    expect(registrationDigits("HE240589")).toBe("240589");
    expect(registrationDigits("P13105")).toBe("13105");
  });

  it("maps C4404 to its API4ALL company code", () => {
    const hits = [
      { code: "CY00009999999999", regNo: "C44040" },
      { code: "CY00001234406861", regNo: "C4404" },
    ];
    expect(pickCompanyCode(hits, "C4404")).toBe("CY00001234406861");
  });

  it("matches regardless of prefix or padding differences", () => {
    const hits = [{ code: "CY00001234406861", regNo: "4404" }];
    expect(pickCompanyCode(hits, "C4404")).toBe("CY00001234406861");
  });

  it("falls back to the first coded hit when no exact match exists", () => {
    const hits = [
      { code: null, regNo: "C1111" },
      { code: "CY00005555555555", regNo: "C2222" },
    ];
    expect(pickCompanyCode(hits, "C4404")).toBe("CY00005555555555");
  });

  it("returns null when API4ALL has no code for the company", () => {
    expect(pickCompanyCode([], "C4404")).toBeNull();
    expect(pickCompanyCode([{ code: null, regNo: "C4404" }], "C4404")).toBeNull();
  });
});
