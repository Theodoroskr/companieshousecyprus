import { describe, expect, it } from "vitest";
import { PRODUCTS } from "@/lib/products";
import { priceBreakdown } from "@/lib/pricing";

function sum(
  rows: { slug: string; quantity?: number; apostille?: boolean }[],
) {
  const breakdowns = rows.map((row) => {
    const product = PRODUCTS.find((candidate) => candidate.slug === row.slug);
    if (!product) throw new Error(`Unknown product ${row.slug}`);
    return priceBreakdown(product, row.quantity ?? 1, { apostille: row.apostille });
  });
  const round = (value: number) => Math.round(value * 100) / 100;
  return {
    vat: round(breakdowns.reduce((total, item) => total + item.vat, 0)),
    total: round(breakdowns.reduce((total, item) => total + item.total, 0)),
  };
}

describe("order totals", () => {
  it("charges VAT on the service fee only for certificates", () => {
    const one = sum([{ slug: "certificate-of-good-standing" }]);
    expect(one.vat).toBe(9.5);
    expect(one.total).toBe(99.5);
  });

  it("adds two certificates to 199.00 with 19.00 VAT", () => {
    const two = sum([
      { slug: "certificate-of-good-standing" },
      { slug: "certificate-of-directors-and-secretary" },
    ]);
    expect(two.vat).toBe(19);
    expect(two.total).toBe(199);
  });

  it("taxes the apostille add-on", () => {
    const plain = sum([{ slug: "certificate-of-good-standing" }]);
    const withApostille = sum([{ slug: "certificate-of-good-standing", apostille: true }]);
    expect(withApostille.total).toBe(Math.round((plain.total + 100 + 19) * 100) / 100);
  });
});
