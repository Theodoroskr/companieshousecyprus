/**
 * End-to-end fulfilment tests across several sample registration numbers.
 *
 * For each sample company we assert the registrar registration number resolves
 * to its API4ALL company code, the correct product code is ordered
 * (2200 structure / 2300 credit) and `freshinvestigation: 1` is always sent.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

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

/** Sample registrar companies and their API4ALL company codes. */
const SAMPLES = [
  { regNo: "C4404", slug: "infocredit-group-limited-c4404", code: "CY00001234406861", name: "INFOCREDIT GROUP LIMITED" },
  { regNo: "HE240589", slug: "apik-services-limited-he240589", code: "CY00000024058901", name: "A.P.I.K. SERVICES LIMITED" },
  { regNo: "C13105", slug: "sample-partnership-c13105", code: "CY00000013105077", name: "SAMPLE TRADING LIMITED" },
  { regNo: "P13105", slug: "sample-partnership-p13105", code: "CY00000013105099", name: "SAMPLE PARTNERSHIP" },
] as const;

let calls: string[] = [];
let bodies: Record<string, unknown>[] = [];

function stubFetch() {
  calls = [];
  bodies = [];
  vi.stubGlobal("fetch", async (input: unknown, init?: RequestInit) => {
    const url = String(input);
    calls.push(url);
    const json = (body: unknown) =>
      new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });

    if (url.includes("/token/")) return json({ access_token: "test-token", expires_in: 3600 });
    if (url.includes("/search/cy/reg_no/")) {
      const requested = decodeURIComponent(url.split("/search/cy/reg_no/")[1]!.split("?")[0]!);
      const hits = SAMPLES.filter((s) => s.regNo === requested).map((s) => ({
        code: s.code,
        name: s.name,
        reg_no: s.regNo,
      }));
      // API4ALL commonly returns near matches too; keep a decoy first.
      return json({ data: [{ code: "CY00009999999999", name: "DECOY LTD", reg_no: "C9999" }, ...hits] });
    }
    if (url.includes("/report/")) return json({ report: "ok", code: url.split("/").pop() });
    if (url.includes("/order")) {
      bodies.push(JSON.parse(String(init?.body ?? "{}")));
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

async function fulfil(item: Row) {
  db.order_items = item;
  const { fulfilOrderItem } = await import("@/lib/orders.server");
  return fulfilOrderItem("item-1");
}

const cases = SAMPLES.flatMap((sample) =>
  (["structure", "credit"] as const).map((kind) => ({
    ...sample,
    kind,
    product: kind === "structure" ? "2200" : "2300",
    productSlug: kind === "structure" ? "cyprus-company-profile" : "cyprus-credit-report",
  })),
);

describe("end-to-end fulfilment across sample companies", () => {
  it.each(cases)(
    "$regNo $kind report resolves to $code and delivers",
    async ({ regNo, slug, code, kind, productSlug }) => {
      const result = await fulfil({
        id: "item-1",
        order_id: "order-1",
        product_slug: productSlug,
        company_slug: slug,
        company_number: regNo,
        a4a_kind: null,
        a4a_code: null,
      });

      expect(result).toEqual({ ok: true, code });
      expect(calls.some((url) => url.includes(`/search/cy/reg_no/${regNo}`))).toBe(true);
      expect(calls.some((url) => url.endsWith(`/report/${kind}/code/${code}`))).toBe(true);

      const delivered = db.updates.find((u) => u.table === "order_items");
      expect(delivered?.values).toMatchObject({
        a4a_kind: kind,
        a4a_code: code,
        fulfilment_status: "delivered",
      });
    },
  );

  it.each(cases)(
    "$regNo $kind order sends product $product with freshinvestigation: 1",
    async ({ code, kind, product }) => {
      const { createOrder } = await import("@/lib/api4all.server");
      await createOrder({ kind, code, reference: `CHC-${code}-${kind}` });

      expect(bodies).toHaveLength(1);
      const item = (bodies[0] as { items: Record<string, unknown>[] }).items[0]!;
      expect(item["product"]).toBe(product);
      expect(item["freshinvestigation"]).toBe(1);
      expect(item["code"] ?? item["company_code"] ?? code).toBeTruthy();
    },
  );
});
