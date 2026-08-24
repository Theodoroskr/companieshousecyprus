/**
 * Integration tests: a paid client order item is fulfilled end-to-end through
 * API4ALL with the correct product code (2200 structure, 2300 credit) and the
 * registration number (e.g. C4404) resolved to a company code (CY0000...).
 *
 * Supabase and the network are stubbed; the real orders.server + api4all.server
 * code paths run.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

/* ------------------------------------------------------------------ */
/* Supabase stub                                                       */
/* ------------------------------------------------------------------ */

type Row = Record<string, unknown>;

const db: {
  order_items: Row;
  companies: Row | null;
  updates: { table: string; values: Row }[];
} = { order_items: {}, companies: null, updates: [] };

function tableStub(table: string) {
  const result = () => {
    if (table === "order_items") return db.order_items;
    if (table === "companies") return db.companies;
    return null;
  };
  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: () => chain,
    maybeSingle: async () => ({ data: result(), error: null }),
    single: async () => ({ data: result(), error: null }),
    update: (values: Row) => {
      db.updates.push({ table, values });
      return { eq: async () => ({ error: null }) };
    },
  };
  return chain;
}

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({ from: (table: string) => tableStub(table) }),
}));

/* ------------------------------------------------------------------ */
/* Network stub                                                        */
/* ------------------------------------------------------------------ */

const A4A_CODE = "CY00001234406861";
let calls: string[] = [];

function stubFetch() {
  calls = [];
  vi.stubGlobal("fetch", async (input: unknown, init?: RequestInit) => {
    const url = String(input);
    calls.push(url);
    const json = (body: unknown) =>
      new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });

    if (url.includes("/token/")) return json({ access_token: "test-token", expires_in: 3600 });
    if (url.includes("/search/cy/reg_no/")) {
      return json({
        data: [
          { code: "CY00009999999999", name: "OTHER LTD", reg_no: "C9999" },
          { code: A4A_CODE, name: "INFOCREDIT GROUP LIMITED", reg_no: "C4404" },
        ],
      });
    }
    if (url.includes("/report/")) return json({ report: "ok", code: url.split("/").pop() });
    if (url.includes("/order")) {
      calls.push(`BODY ${String(init?.body ?? "")}`);
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
  db.companies = null;
  db.updates = [];
  stubFetch();
  vi.resetModules();
});

const itemFor = (kind: "structure" | "credit", overrides: Row = {}): Row => ({
  id: "item-1",
  order_id: "order-1",
  product_slug: kind === "structure" ? "cyprus-company-profile" : "cyprus-credit-report",
  company_slug: "infocredit-group-limited-c4404",
  company_number: "C4404",
  a4a_kind: kind,
  a4a_code: null,
  ...overrides,
});

async function fulfil(item: Row) {
  db.order_items = item;
  const { fulfilOrderItem } = await import("@/lib/orders.server");
  return fulfilOrderItem("item-1");
}

describe("order fulfilment through API4ALL", () => {
  it("resolves C4404 to its API4ALL company code and delivers a structure report", async () => {
    const result = await fulfil(itemFor("structure"));

    expect(result).toEqual({ ok: true, code: A4A_CODE });
    expect(calls.some((url) => url.includes("/search/cy/reg_no/C4404"))).toBe(true);
    expect(calls.some((url) => url.endsWith(`/report/structure/code/${A4A_CODE}`))).toBe(true);

    const cached = db.updates.find((u) => u.table === "companies");
    expect(cached?.values["a4a_code"]).toBe(A4A_CODE);

    const delivered = db.updates.find((u) => u.table === "order_items");
    expect(delivered?.values).toMatchObject({
      a4a_kind: "structure",
      a4a_code: A4A_CODE,
      fulfilment_status: "delivered",
    });
  });

  it("delivers a credit report for the credit product", async () => {
    const result = await fulfil(itemFor("credit"));
    expect(result).toEqual({ ok: true, code: A4A_CODE });
    expect(calls.some((url) => url.endsWith(`/report/credit/code/${A4A_CODE}`))).toBe(true);
  });

  it("uses the cached company code instead of searching again", async () => {
    db.companies = { a4a_code: A4A_CODE };
    const result = await fulfil(itemFor("structure"));
    expect(result).toEqual({ ok: true, code: A4A_CODE });
    expect(calls.some((url) => url.includes("/search/cy/reg_no/"))).toBe(false);
  });

  it("derives the report kind from the product slug when a4a_kind is missing", async () => {
    await fulfil(itemFor("credit", { a4a_kind: null }));
    expect(calls.some((url) => url.endsWith(`/report/credit/code/${A4A_CODE}`))).toBe(true);
  });

  it("marks the item failed when API4ALL has no code for the registration number", async () => {
    vi.stubGlobal("fetch", async (input: unknown) => {
      const url = String(input);
      calls.push(url);
      const body = url.includes("/token/") ? { access_token: "t", expires_in: 3600 } : { data: [] };
      return new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });
    });
    const result = await fulfil(itemFor("structure"));
    expect(result.ok).toBe(false);
    const failed = db.updates.find((u) => u.table === "order_items");
    expect(failed?.values["fulfilment_status"]).toBe("failed");
  });

  it("rejects products that are not fulfilled through API4ALL", async () => {
    await expect(fulfil(itemFor("structure", { a4a_kind: null, product_slug: "certificate-of-good-standing" }))).rejects.toThrow(
      /not fulfilled through API4ALL/,
    );
  });
});

describe("API4ALL order product codes", () => {
  it("sends product 2200 for a structure order and 2300 for a credit order", async () => {
    const { createOrder } = await import("@/lib/api4all.server");

    await createOrder({ kind: "structure", code: A4A_CODE, reference: "CHC-1" });
    let body = calls.find((c) => c.startsWith("BODY "))!;
    expect(JSON.parse(body.slice(5)).items[0].product).toBe("2200");

    calls = [];
    await createOrder({ kind: "credit", code: A4A_CODE, reference: "CHC-2" });
    body = calls.find((c) => c.startsWith("BODY "))!;
    expect(JSON.parse(body.slice(5)).items[0].product).toBe("2300");
  });
});
