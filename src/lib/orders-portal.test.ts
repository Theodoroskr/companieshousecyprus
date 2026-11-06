import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { listOrdersForUser } from "./orders.server";

const rows = [
  { id: "guest", user_id: null, email: "John@Example.com", created_at: "2026-11-06", order_items: [{ id: "document", fulfilment_status: "delivered" }] },
  { id: "linked", user_id: "john", email: "john@example.com", created_at: "2026-11-05", order_items: [] },
  { id: "other", user_id: null, email: "other@example.com", created_at: "2026-11-04", order_items: [] },
];

beforeEach(() => {
  vi.stubEnv("SUPABASE_URL", "https://orders.example.com");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "sb_secret_test");
  // Exercise the actual query builder, with a local response for its database request.
  vi.stubGlobal("fetch", async (input: RequestInfo | URL) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    const user = url.searchParams.get("user_id");
    const email = url.searchParams.get("email");
    const matched = rows.filter((row) => {
      if (user) return row.user_id === user.slice(3);
      if (email?.startsWith("eq.")) return row.email === email.slice(3);
      if (email?.startsWith("ilike.")) {
        const pattern = email.slice(6).replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/%/g, ".*").replace(/_/g, ".");
        return new RegExp(`^${pattern}$`, "i").test(row.email);
      }
      throw new Error("Unscoped order query");
    });
    return new Response(JSON.stringify(matched), { headers: { "Content-Type": "application/json" } });
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("client portal order ownership", () => {
  it("returns mixed-case guest orders and their documents for the same signed-in email", async () => {
    const orders = await listOrdersForUser("john", "john@example.com");
    expect(orders.map((order) => order.id)).toEqual(["guest", "linked"]);
    expect(orders[0]?.order_items).toEqual(rows[0]?.order_items);
  });

  it("does not expose another customer's orders or duplicate account-linked orders", async () => {
    const orders = await listOrdersForUser("john", " JOHN@EXAMPLE.COM ");
    expect(orders.map((order) => order.id)).toEqual(["guest", "linked"]);
    expect(orders.some((order) => order.id === "other")).toBe(false);
  });

  it.each(["%@example.com", "_ohn@example.com", "john\\@example.com", "*", ""]) ("does not broaden ownership with wildcard or empty email %s", async (email) => {
    const orders = await listOrdersForUser("john", email);
    expect(orders.map((order) => order.id)).toEqual(["linked"]);
  });
});