import { describe, expect, it } from "vitest";
import { collectedCents, countsAsRevenue, sumCollectedCents } from "./order-revenue";

describe("admin revenue rules", () => {
  it("counts delivered orders as revenue, not only orders still marked paid", () => {
    expect(countsAsRevenue({ status: "delivered" })).toBe(true);
    expect(countsAsRevenue({ status: "paid" })).toBe(true);
    expect(countsAsRevenue({ status: "processing" })).toBe(true);
  });

  it("never counts cancelled or awaiting-payment orders", () => {
    expect(collectedCents({ status: "cancelled", total_cents: 9950, charged_total_cents: 9950 })).toBe(0);
    expect(collectedCents({ status: "awaiting_payment", total_cents: 21850 })).toBe(0);
  });

  it("uses the amount actually charged at checkout over the quoted total", () => {
    expect(collectedCents({ status: "delivered", total_cents: 10710, charged_total_cents: 9000 })).toBe(9000);
    expect(collectedCents({ status: "delivered", total_cents: 7735, charged_total_cents: null })).toBe(7735);
  });

  it("sums only revenue orders", () => {
    expect(
      sumCollectedCents([
        { status: "delivered", total_cents: 15470, charged_total_cents: 15470 },
        { status: "cancelled", total_cents: 9950, charged_total_cents: 9950 },
        { status: "awaiting_payment", total_cents: 21850 },
      ]),
    ).toBe(15470);
  });
});
