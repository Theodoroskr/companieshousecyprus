import { describe, expect, it } from "vitest";
import { companyDescription, companyTitle } from "@/lib/seo/company-meta";

const SHORT = { name: "ACME TRADING LTD", officialNo: "HE 123456" };
const LONG = {
  name: "INTERNATIONAL SHIPPING AND OFFSHORE INVESTMENT HOLDINGS LIMITED",
  officialNo: "HE 400001",
};

describe("companyTitle", () => {
  it("puts the company name first with the topic suffix", () => {
    expect(companyTitle(SHORT)).toBe("ACME TRADING LTD — Cyprus company profile");
  });

  it("adds the registration number when the name is too long for the suffix", () => {
    const title = companyTitle({ name: "MEDITERRANEAN MARINE SERVICES LIMITED", officialNo: "HE 222" });
    expect(title.startsWith("MEDITERRANEAN MARINE SERVICES LIMITED")).toBe(true);
    expect(title.length).toBeLessThanOrEqual(64);
  });

  it("never truncates very long names mid-word beyond the limit", () => {
    const title = companyTitle(LONG);
    expect(title.length).toBeLessThanOrEqual(64);
  });

  it("keeps the full name visible for typical names", () => {
    expect(companyTitle({ name: "NOVARDIA CREDIT INSURANCE BROKERS LTD", officialNo: "HE 98765" }))
      .toContain("NOVARDIA CREDIT INSURANCE BROKERS LTD");
  });
});

describe("companyDescription", () => {
  it("leads with officers, office and filing history and ends with status", () => {
    const description = companyDescription({
      ...SHORT,
      status: "Active",
      typeEn: "Limited Company",
      districtEn: "Nicosia",
    });
    expect(description).toBe(
      "Directors, secretary, registered office and filing history for ACME TRADING LTD (HE 123456), a Limited Company in Nicosia, Cyprus. Status: Active.",
    );
    expect(description.length).toBeLessThanOrEqual(155);
  });

  it("uses Owner wording for business names", () => {
    const description = companyDescription({ ...SHORT, businessName: true, status: "Active" });
    expect(description).toContain("Owner");
    expect(description).not.toContain("Directors");
  });

  it("falls back to a status phrase from statusGroup when status text is missing", () => {
    const description = companyDescription({ ...SHORT, status: null, statusGroup: "active" });
    expect(description).toContain("Status: Active.");
  });

  it("always stays within 155 characters and keeps the full name", () => {
    const description = companyDescription({
      ...LONG,
      status: "Active",
      typeEn: "Private Company Limited by Shares",
      districtEn: "Nicosia",
    });
    expect(description.length).toBeLessThanOrEqual(155);
    expect(description).toContain(LONG.name);
  });

  it("degrades to a minimal record line when everything is missing", () => {
    const description = companyDescription({ ...SHORT, status: null, statusGroup: null });
    expect(description).toContain(SHORT.name);
    expect(description).toContain(SHORT.officialNo);
    expect(description).not.toContain("Status:");
  });
});
