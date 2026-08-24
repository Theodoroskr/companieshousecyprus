import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { PRODUCTS } from "@/lib/products";
import { priceBreakdown } from "@/lib/pricing";

/** Products fulfilled through API4ALL. */
export const A4A_PRODUCT_KIND: Record<string, "structure" | "credit"> = {
  "cyprus-company-profile": "structure",
  "cyprus-credit-report": "credit",
};

function ordersClient() {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!url || !key) throw new Error("Missing Supabase service credentials");
  const isNewKey = key.startsWith("sb_secret_") || key.startsWith("sb_publishable_");
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    global: {
      fetch: (input, init) => {
        const headers = new Headers(
          typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
        );
        if (init?.headers) new Headers(init.headers).forEach((v, k) => headers.set(k, v));
        if (isNewKey && headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
  });
}

const cents = (value: number) => Math.round(value * 100);

function randomToken(bytes = 24) {
  const array = new Uint8Array(bytes);
  crypto.getRandomValues(array);
  return [...array].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function makeReference() {
  const stamp = Date.now().toString(36).toUpperCase().slice(-6);
  const suffix = randomToken(2).toUpperCase();
  return `CHC-${stamp}-${suffix}`;
}

export type PlaceOrderInput = {
  fullName: string;
  email: string;
  firm?: string | null;
  vatNumber?: string | null;
  phone?: string | null;
  notes?: string | null;
  items: {
    productSlug: string;
    companySlug: string | null;
    companyName: string | null;
    companyNumber: string | null;
    quantity: number;
  }[];
};

export async function placeOrder(input: PlaceOrderInput) {
  const supabase = ordersClient();
  const rows = input.items
    .map((item) => {
      const product = PRODUCTS.find((candidate) => candidate.slug === item.productSlug);
      if (!product) return null;
      const quantity = Math.min(20, Math.max(1, Math.round(item.quantity || 1)));
      const breakdown = priceBreakdown(product, quantity);
      return {
        product,
        quantity,
        breakdown,
        companySlug: item.companySlug?.slice(0, 200) ?? null,
        companyName: item.companyName?.slice(0, 300) ?? null,
        companyNumber: item.companyNumber?.slice(0, 40) ?? null,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  if (rows.length === 0) throw new Error("Your basket is empty.");

  const subtotal = rows.reduce((sum, row) => sum + row.breakdown.documentPrice, 0);
  const serviceFee = rows.reduce((sum, row) => sum + row.breakdown.serviceFee, 0);
  const vat = Math.round((subtotal + serviceFee) * 0.19 * 100) / 100;
  const total = subtotal + serviceFee + vat;

  const reference = makeReference();
  const accessToken = randomToken();

  const { data: order, error } = await supabase
    .from("orders")
    .insert({
      reference,
      access_token: accessToken,
      full_name: input.fullName.trim().slice(0, 200),
      email: input.email.trim().slice(0, 200),
      firm: input.firm?.trim().slice(0, 200) || null,
      vat_number: input.vatNumber?.trim().slice(0, 40) || null,
      phone: input.phone?.trim().slice(0, 60) || null,
      notes: input.notes?.trim().slice(0, 2000) || null,
      subtotal_cents: cents(subtotal),
      service_fee_cents: cents(serviceFee),
      vat_cents: cents(vat),
      total_cents: cents(total),
      status: "awaiting_payment",
    })
    .select("id, reference, access_token")
    .single();

  if (error || !order) throw new Error(error?.message ?? "Could not create the order");

  const { error: itemsError } = await supabase.from("order_items").insert(
    rows.map((row) => ({
      order_id: order.id,
      product_slug: row.product.slug,
      product_name: row.product.name,
      company_slug: row.companySlug,
      company_name: row.companyName,
      company_number: row.companyNumber,
      quantity: row.quantity,
      document_price_cents: cents(row.breakdown.documentPrice),
      service_fee_cents: cents(row.breakdown.serviceFee),
      vat_cents: cents(row.breakdown.vat),
      total_cents: cents(row.breakdown.total),
      a4a_kind: A4A_PRODUCT_KIND[row.product.slug] ?? null,
      fulfilment_status: "pending",
    })),
  );
  if (itemsError) throw new Error(itemsError.message);

  return { reference: order.reference, token: order.access_token };
}

const ORDER_COLUMNS =
  "id, reference, status, full_name, email, firm, vat_number, phone, notes, subtotal_cents, service_fee_cents, vat_cents, total_cents, created_at, updated_at";
const ITEM_COLUMNS =
  "id, product_slug, product_name, company_slug, company_name, company_number, quantity, document_price_cents, service_fee_cents, vat_cents, total_cents, a4a_kind, a4a_code, fulfilment_status, fulfilment_message, delivered_at";

export async function readOrder(reference: string, token: string) {
  const supabase = ordersClient();
  const { data: order, error } = await supabase
    .from("orders")
    .select(ORDER_COLUMNS)
    .eq("reference", reference.trim().toUpperCase())
    .eq("access_token", token.trim())
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!order) return null;

  const { data: items, error: itemsError } = await supabase
    .from("order_items")
    .select(`${ITEM_COLUMNS}, report_json`)
    .eq("order_id", order.id)
    .order("created_at", { ascending: true });
  if (itemsError) throw new Error(itemsError.message);

  return {
    order,
    items: (items ?? []).map((item) => {
      const { report_json, ...rest } = item;
      return {
        ...rest,
        hasReport: report_json !== null && report_json !== undefined,
        reportJson: item.fulfilment_status === "delivered" && report_json ? JSON.stringify(report_json, null, 2) : null,
      };
    }),
  };
}

export async function listOrders(limit = 50) {
  const supabase = ordersClient();
  const { data, error } = await supabase
    .from("orders")
    .select(`${ORDER_COLUMNS}, order_items(${ITEM_COLUMNS})`)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function setOrderStatus(reference: string, status: string) {
  const supabase = ordersClient();
  const { error } = await supabase.from("orders").update({ status }).eq("reference", reference);
  if (error) throw new Error(error.message);
  return { ok: true as const };
}

/** Pull the report from API4ALL for one order item and store it. */
export async function fulfilOrderItem(itemId: string) {
  const supabase = ordersClient();
  const { data: item, error } = await supabase
    .from("order_items")
    .select("id, order_id, product_slug, company_number, a4a_kind, a4a_code")
    .eq("id", itemId)
    .single();
  if (error || !item) throw new Error(error?.message ?? "Order item not found");

  const kind = (item.a4a_kind ?? A4A_PRODUCT_KIND[item.product_slug]) as "structure" | "credit" | undefined;
  if (!kind) throw new Error("This product is not fulfilled through API4ALL");

  const { fetchReport, searchByRegistration } = await import("@/lib/api4all.server");

  const fail = async (message: string) => {
    await supabase
      .from("order_items")
      .update({ fulfilment_status: "failed", fulfilment_message: message.slice(0, 900) })
      .eq("id", item.id);
    return { ok: false as const, message };
  };

  let code = item.a4a_code;
  if (!code) {
    const regNo = item.company_number?.trim();
    if (!regNo) return fail("No registration number stored for this item");
    try {
      const hits = await searchByRegistration(regNo);
      code = hits.find((hit) => hit.code)?.code ?? null;
    } catch (searchError) {
      return fail(searchError instanceof Error ? searchError.message : "API4ALL search failed");
    }
    if (!code) return fail(`API4ALL has no company code for ${regNo}`);
  }

  try {
    const report = await fetchReport(kind, code);
    await supabase
      .from("order_items")
      .update({
        a4a_kind: kind,
        a4a_code: code,
        report_json: report as never,
        fulfilment_status: "delivered",
        fulfilment_message: null,
        delivered_at: new Date().toISOString(),
      })
      .eq("id", item.id);
    return { ok: true as const, code };
  } catch (reportError) {
    return fail(reportError instanceof Error ? reportError.message : "API4ALL report fetch failed");
  }
}
