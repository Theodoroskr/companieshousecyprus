/**
 * Contract test for the API4ALL order payload.
 *
 * Locks the full request schema — field names, types and values — for both
 * structure (product 2200) and credit (product 2300) orders, plus the HTTP
 * method, endpoint and headers used to submit it.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { z } from "zod";

const CODE = "CY00001234406861";

let requests: { url: string; init: RequestInit }[] = [];

beforeEach(() => {
  process.env["API4ALL_USERNAME"] = "user";
  process.env["API4ALL_PASSWORD"] = "pass";
  process.env["API4ALL_API_KEY"] = "key";
  requests = [];
  vi.stubGlobal("fetch", async (input: unknown, init?: RequestInit) => {
    const url = String(input);
    requests.push({ url, init: init ?? {} });
    const body = url.includes("/token/") ? { access_token: "test-token", expires_in: 3600 } : { ok: true };
    return new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });
  });
  vi.resetModules();
});

/** Exact shape API4ALL expects for `POST /orders/create/`. */
const itemSchema = z
  .object({
    code: z.string().regex(/^CY\d{14}$/),
    reference: z.string().min(1),
    language: z.literal("EN"),
    product: z.enum(["2200", "2300"]),
    format: z.literal("JSON"),
    speed: z.string().min(1),
    freshinvestigation: z.literal(1),
    comments: z.string(),
  })
  .strict();

const payloadSchema = z
  .object({
    reference: z.string().min(1),
    items: z.array(itemSchema).length(1),
  })
  .strict();

async function submit(kind: "structure" | "credit", reference: string, extra: Record<string, string> = {}) {
  const { createOrder } = await import("@/lib/api4all.server");
  await createOrder({ kind, code: CODE, reference, ...extra });
  const request = requests.find((r) => r.url.includes("/orders/create"))!;
  return { request, payload: JSON.parse(String(request.init.body ?? "{}")) as unknown };
}

describe("API4ALL order payload schema", () => {
  it.each([
    { kind: "structure", product: "2200" },
    { kind: "credit", product: "2300" },
  ] as const)("$kind order matches the full payload contract (product $product)", async ({ kind, product }) => {
    const { payload } = await submit(kind, `CHC-SCHEMA-${kind}`);

    const parsed = payloadSchema.parse(payload);
    expect(parsed.reference).toBe(`CHC-SCHEMA-${kind}`);
    expect(parsed.items[0]).toEqual({
      code: CODE,
      reference: `CHC-SCHEMA-${kind}`,
      language: "EN",
      product,
      format: "JSON",
      speed: "Normal",
      freshinvestigation: 1,
      comments: "",
    });
  });

  it("rejects unknown or renamed fields in the item payload", async () => {
    const { payload } = await submit("structure", "CHC-STRICT");
    const item = (payload as { items: Record<string, unknown>[] }).items[0]!;

    expect(Object.keys(item).sort()).toEqual(
      ["code", "comments", "format", "freshinvestigation", "language", "product", "reference", "speed"].sort(),
    );
    expect(itemSchema.safeParse({ ...item, extraField: true }).success).toBe(false);
    expect(itemSchema.safeParse({ ...item, freshinvestigation: "1" }).success).toBe(false);
    expect(itemSchema.safeParse({ ...item, product: 2200 }).success).toBe(false);
  });

  it("honours language and speed overrides while keeping the schema valid", async () => {
    const { payload } = await submit("credit", "CHC-OVERRIDE", { speed: "Express" });
    const parsed = payloadSchema.parse(payload);
    expect(parsed.items[0]!.speed).toBe("Express");
    expect(parsed.items[0]!.product).toBe("2300");
    expect(parsed.items[0]!.freshinvestigation).toBe(1);
  });

  it("posts JSON to /orders/create/ with a bearer token", async () => {
    const { request } = await submit("structure", "CHC-HTTP");
    expect(request.url).toBe("https://v3.api4all.io/a4a/3.0/api/orders/create/");
    expect(request.init.method).toBe("POST");
    const headers = request.init.headers as Record<string, string>;
    expect(headers["Content-Type"]).toBe("application/json");
    expect(headers["Accept"]).toBe("application/json");
    expect(headers["Authorization"]).toMatch(/^Bearer .+/);
  });
});
