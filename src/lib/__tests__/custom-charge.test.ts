import { describe, expect, it, vi } from "vitest";
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: {} }));
import { customChargeTotals } from "@/lib/orders.server";

describe("custom charge totals", () => {
  it("adds 19% VAT when enabled", () => {
    expect(customChargeTotals(5000, true)).toEqual({ net: 5000, vat: 950, total: 5950 });
  });
  it("charges no VAT when disabled", () => {
    expect(customChargeTotals(5000, false)).toEqual({ net: 5000, vat: 0, total: 5000 });
  });
});
