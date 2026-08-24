/**
 * Duplicate submission safety: paying/reconciling the same order twice (webhook
 * + return-from-checkout, or a double click) must not fulfil an item twice.
 * Each intended order hits API4ALL exactly once, with `freshinvestigation: 1`.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

type Row = Record<string, unknown>;

const A4A_CODE = "CY00001234406861";

const db: {
  order: Row;
  items: Row[];
} = { order: {}, items: [] };

function tableStub(table: string) {
  let itemId: string | null = null;

  const chain: Record<string, unknown> = {
    select: () => chain,
    order: () => chain,
    eq: (column: string, value: unknown) => {
      if (table === "order_items" && column === "id") itemId = String(value);
      return chain;
    },
    maybeSingle: async () => ({ data: table === "orders" ? db.order : (db.items[0] ?? null), error: null }),
    single: async () => ({
      data: table === "order_items" ? (db.items.find((i) => i["id"] === itemId) ?? null) : db.order,
      error: null,
    }),
    // awaiting the chain (list query) resolves to all rows
    then: (resolve: (value: { data: Row[]; error: null }) => unknown) =>
      Promise.resolve({ data: table === "order_items" ? db.items : [db.order], error: null }).then(resolve),
    update: (values: Row) => ({
      eq: async (column: string, value: unknown) => {
        if (table === "orders") Object.assign(db.order, values);
        else {
          for (const item of db.items) {
            if (column !== "id" || item["id"] === value) Object.assign(item, values);
          }
        }
        return { error: null };
      },
    }),
  };
  return chain;
}

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({ from: (table: string) => tableStub(table) }),
}));

let reportCalls: string[] = [];
let orderBodies: Record<string, unknown>[] = [];

function stubFetch() {
  reportCalls = [];
  orderBodies = [];
  vi.stubGlobal("fetch", async (input: unknown, init?: RequestInit) => {
    const url = String(input);
    const json = (body: unknown) =>
      new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });

    if (url.includes("/token/")) return json({ access_token: "test-token", expires_in: 3600 });
    if (url.includes("/search/cy/reg_no/"))
      return json({ data: [{ code: A4A_CODE, name: "INFOCREDIT GROUP LIMITED", reg_no: "C4404" }] });
    if (url.includes("/report/")) {
      reportCalls.push(url);
      return json({ report: "ok" });
    }
    if (url.includes("/orders/create")) {
      orderBodies.push(JSON.parse(String(init?.body ?? "{}")));
      return json({ ok: true });
    }
    return json({});
  });
}

beforeEach(() => {
  process.env["SUPABASE_URL"] = "https://example.supabase.co";
  process.env["SUPABASE_SERVICE_ROLE_KEY"] = "sb_secret_test";
  process.env["API4ALL_USERNAME"] = "user";
  process.env["API4ALL_PASSWORD"] = "pass";
  process.env["API4ALL_API_KEY"] = "key";
  db.order = { id: "order-1", status: "awaiting_payment" };
  db.items = [
    {
      id: "item-1",
      order_id: "order-1",
      product_slug: "cyprus-company-profile",
      company_slug: "infocredit-group-limited-c4404",
      company_number: "C4404",
      a4a_kind: "structure",
      a4a_code: null,
      fulfilment_status: "pending",
    },
  ];
  stubFetch();
  vi.resetModules();
});

describe("duplicate order submissions", () => {
  it("fulfils an item once even when the order is marked paid twice", async () => {
    const { markOrderPaid } = await import("@/lib/orders.server");

    await markOrderPaid("order-1");
    expect(reportCalls).toHaveLength(1);
    expect(db.items[0]!["fulfilment_status"]).toBe("delivered");
    const paidAt = db.order["paid_at"];

    // Second webhook / return-from-checkout for the same order
    await markOrderPaid("order-1");
    expect(reportCalls).toHaveLength(1);
    expect(db.order["paid_at"]).toBe(paidAt);
    expect(db.order["status"]).toBe("paid");
  });

  it("still delivers a second, not-yet-fulfilled item on the same order", async () => {
    db.items.push({
      id: "item-2",
      order_id: "order-1",
      product_slug: "cyprus-credit-report",
      company_slug: "infocredit-group-limited-c4404",
      company_number: "C4404",
      a4a_kind: "credit",
      a4a_code: null,
      fulfilment_status: "pending",
    });
    const { markOrderPaid } = await import("@/lib/orders.server");

    await markOrderPaid("order-1");
    expect(reportCalls.filter((u) => u.includes("/report/structure/"))).toHaveLength(1);
    expect(reportCalls.filter((u) => u.includes("/report/credit/"))).toHaveLength(1);

    await markOrderPaid("order-1");
    expect(reportCalls).toHaveLength(2);
  });

  it("sends freshinvestigation: 1 exactly once per intended API4ALL order", async () => {
    const { createOrder } = await import("@/lib/api4all.server");

    await createOrder({ kind: "structure", code: A4A_CODE, reference: "CHC-DUP-1" });
    expect(orderBodies).toHaveLength(1);
    expect((orderBodies[0] as { items: Row[] }).items[0]!["freshinvestigation"]).toBe(1);
    expect((orderBodies[0] as { items: Row[] }).items[0]!["product"]).toBe("2200");

    // A retry with the same reference is a new intended order: one payload each,
    // never a duplicated item inside a single payload.
    await createOrder({ kind: "structure", code: A4A_CODE, reference: "CHC-DUP-1" });
    expect(orderBodies).toHaveLength(2);
    for (const body of orderBodies) {
      expect((body as { items: Row[] }).items).toHaveLength(1);
      expect((body as { items: Row[] }).items[0]!["freshinvestigation"]).toBe(1);
    }
  });
});
