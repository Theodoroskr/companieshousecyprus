import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { PRODUCTS } from "@/lib/products";
import { priceBreakdown } from "@/lib/pricing";

/** Products fulfilled through API4ALL. */
export { A4A_PRODUCT_KIND } from "@/lib/api4all-codes";
import { A4A_PRODUCT_KIND, pickCompanyCode, registrationCandidates } from "@/lib/api4all-codes";

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
  userId?: string | null;
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
      user_id: input.userId?.trim() || null,
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

  {
    const { sendOrderConfirmationEmail } = await import("@/lib/order-emails.server");
    await sendOrderConfirmationEmail(
      {
        reference: order.reference,
        access_token: order.access_token,
        full_name: input.fullName,
        email: input.email,
        firm: input.firm ?? null,
        vat_number: input.vatNumber ?? null,
        subtotal_cents: cents(subtotal),
        service_fee_cents: cents(serviceFee),
        vat_cents: cents(vat),
        total_cents: cents(total),
      },
      rows.map((row) => ({
        product_name: row.product.name,
        company_name: row.companyName,
        company_number: row.companyNumber,
        quantity: row.quantity,
        total_cents: cents(row.breakdown.total),
      })),
    );
  }

  return { reference: order.reference, token: order.access_token };
}

const ORDER_COLUMNS =
  "id, reference, status, full_name, email, firm, vat_number, phone, notes, subtotal_cents, service_fee_cents, vat_cents, total_cents, created_at, updated_at, due_date, delivered_at";
const ITEM_COLUMNS =
  "id, product_slug, product_name, company_slug, company_name, company_number, quantity, document_price_cents, service_fee_cents, vat_cents, total_cents, a4a_kind, a4a_code, fulfilment_status, fulfilment_message, delivered_at, due_date, document_path, document_name, document_size, order_documents(id, name, size_bytes, content_type, created_at, path)";

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
  const patch: { status: string; delivered_at?: string | null } = { status };

  const { data: existing } = await supabase
    .from("orders")
    .select("id, reference, access_token, full_name, email, status, delivered_at")
    .eq("reference", reference)
    .maybeSingle();

  // The delivery date follows the status automatically.
  if (status === "delivered") {
    if (!existing?.delivered_at) patch.delivered_at = new Date().toISOString();
  } else {
    patch.delivered_at = null;
  }

  const { error } = await supabase.from("orders").update(patch).eq("reference", reference);
  if (error) throw new Error(error.message);

  // Notify the client the first time an order is marked delivered.
  if (status === "delivered" && existing && existing.status !== "delivered") {
    await notifyOrderDelivered(existing.id, {
      reference: existing.reference,
      access_token: existing.access_token,
      full_name: existing.full_name,
      email: existing.email,
    });
  }

  return { ok: true as const };
}

/** Collect every uploaded document for an order, sign it, and email the client. */
async function notifyOrderDelivered(
  orderId: string,
  order: { reference: string; access_token?: string | null; full_name?: string | null; email?: string | null },
) {
  try {
    const supabase = ordersClient();
    const { data: items } = await supabase
      .from("order_items")
      .select("product_name, company_name, company_number")
      .eq("order_id", orderId);
    const { data: docs } = await supabase
      .from("order_documents")
      .select("name, path, created_at")
      .eq("order_id", orderId)
      .order("created_at", { ascending: true });

    const documents = await Promise.all(
      (docs ?? []).map(async (doc) => ({
        name: doc.name,
        url: await signOrderDocument(doc.path, 60 * 60 * 24 * 7).catch(() => null),
      })),
    );

    const { sendOrderDeliveredEmail } = await import("@/lib/order-emails.server");
    await sendOrderDeliveredEmail(order, documents, items ?? []);
  } catch (error) {
    console.error("Delivered notification failed", order.reference, error);
  }
}



/* ------------------------------------------------------------------ */
/* API4ALL JSON reports → branded, reviewable deliverables             */
/* ------------------------------------------------------------------ */

const REPORT_ITEM_COLUMNS =
  "id, order_id, product_name, company_name, company_number, a4a_kind, fulfilment_status, delivered_at, report_json";

function parseStoredReport(item: {
  a4a_kind: string | null;
  report_json: unknown;
  product_name: string;
}) {
  const { parseReport } = require("@/lib/reports/parser") as typeof import("@/lib/reports/parser");
  const kind: "structure" | "credit" = item.a4a_kind === "credit" ? "credit" : "structure";
  return parseReport(item.report_json, kind);
}

/** Admin: parsed report for review, whatever the fulfilment state. */
export async function reportForReview(itemId: string) {
  const supabase = ordersClient();
  const { data: item } = await supabase
    .from("order_items")
    .select(REPORT_ITEM_COLUMNS)
    .eq("id", itemId)
    .maybeSingle();
  if (!item) throw new Error("Order item not found");

  const { data: order } = await supabase
    .from("orders")
    .select("reference, full_name, email")
    .eq("id", item.order_id)
    .maybeSingle();

  const { parseReport } = await import("@/lib/reports/parser");
  const kind: "structure" | "credit" = item.a4a_kind === "credit" ? "credit" : "structure";
  return {
    report: parseReport(item.report_json, kind),
    meta: {
      itemId: item.id,
      reference: order?.reference ?? "—",
      customer: order?.full_name ?? null,
      email: order?.email ?? null,
      productName: item.product_name,
      companyName: item.company_name,
      companyNumber: item.company_number,
      fulfilmentStatus: item.fulfilment_status,
      deliveredAt: item.delivered_at,
    },
  };
}

/** Client portal: parsed report for an item the caller owns, once released. */
export async function reportForOwner(itemId: string, userId: string, email: string) {
  const supabase = ordersClient();
  const { data: item } = await supabase
    .from("order_items")
    .select(`${REPORT_ITEM_COLUMNS}, orders!inner(reference, user_id, email)`)
    .eq("id", itemId)
    .maybeSingle();
  const owner = (item as { orders?: { reference: string; user_id: string | null; email: string | null } } | null)?.orders;
  if (!item || !owner) throw new Error("Report not found");
  const mine =
    (owner.user_id && owner.user_id === userId) ||
    (owner.email ?? "").toLowerCase() === email.trim().toLowerCase();
  if (!mine) throw new Error("Report not found");
  if (item.fulfilment_status !== "delivered") throw new Error("This report is still being finalised by our team.");

  const { parseReport } = await import("@/lib/reports/parser");
  const kind: "structure" | "credit" = item.a4a_kind === "credit" ? "credit" : "structure";
  const report = parseReport(item.report_json, kind);
  if (!report) throw new Error("Report not found");
  return {
    report,
    meta: {
      itemId: item.id,
      reference: owner.reference,
      productName: item.product_name,
      companyName: item.company_name,
      companyNumber: item.company_number,
      deliveredAt: item.delivered_at,
    },
  };
}

/** Admin: release a reviewed report to the client and email them. */
export async function releaseOrderItemReport(itemId: string, notify = true) {
  const supabase = ordersClient();
  const { data: item } = await supabase
    .from("order_items")
    .select("id, order_id, product_name, company_name, company_number, fulfilment_status, report_json")
    .eq("id", itemId)
    .maybeSingle();
  if (!item) throw new Error("Order item not found");
  if (!item.report_json) throw new Error("There is no report stored for this line yet");

  const deliveredAt = new Date().toISOString();
  const { error } = await supabase
    .from("order_items")
    .update({
      fulfilment_status: "delivered",
      fulfilment_message: null,
      delivered_at: deliveredAt,
      a4a_next_attempt_at: null,
    })
    .eq("id", item.id);
  if (error) throw new Error(error.message);

  const { data: siblings } = await supabase
    .from("order_items")
    .select("fulfilment_status")
    .eq("order_id", item.order_id);
  const allDelivered = (siblings ?? []).every((row) => row.fulfilment_status === "delivered");

  const { data: order } = await supabase
    .from("orders")
    .select("id, reference, full_name, email")
    .eq("id", item.order_id)
    .maybeSingle();

  if (order && allDelivered) {
    await supabase.from("orders").update({ status: "delivered", delivered_at: deliveredAt }).eq("id", order.id);
  }

  if (order && notify) {
    try {
      const { sendDocumentReadyEmail } = await import("@/lib/order-emails.server");
      await sendDocumentReadyEmail(
        { reference: order.reference, full_name: order.full_name, email: order.email },
        {
          product_name: item.product_name,
          company_name: item.company_name,
          company_number: item.company_number,
          document_name: `${item.product_name} — available in your client portal`,
        },
      );
    } catch (emailError) {
      console.error("Report release email failed", order.reference, emailError);
    }
  }

  return { ok: true as const, notified: order ? notify : false };
}

/** Pull the report from API4ALL for one order item and store it. */
export async function fulfilOrderItem(itemId: string) {
  const supabase = ordersClient();
  const { data: item, error } = await supabase
    .from("order_items")
    .select("id, order_id, product_slug, company_slug, company_number, a4a_kind, a4a_code")
    .eq("id", itemId)
    .single();
  if (error || !item) throw new Error(error?.message ?? "Order item not found");

  const kind = (item.a4a_kind ?? A4A_PRODUCT_KIND[item.product_slug]) as "structure" | "credit" | undefined;
  if (!kind) throw new Error("This product is not fulfilled through API4ALL");

  const { fetchReport, searchByRegistration, createOrder } = await import("@/lib/api4all.server");

  const { data: parentOrder } = await supabase
    .from("orders")
    .select("reference")
    .eq("id", item.order_id)
    .maybeSingle();


  const fail = async (message: string) => {
    await supabase
      .from("order_items")
      .update({ fulfilment_status: "failed", fulfilment_message: message.slice(0, 900) })
      .eq("id", item.id);
    return { ok: false as const, message };
  };

  // Resolve the API4ALL company code (e.g. CY00001234406861) for this registration
  // number (e.g. C4404): stored on the item → cached on the company → live lookup.
  let code = item.a4a_code;
  const regNo = item.company_number?.trim() ?? "";

  if (!code && item.company_slug) {
    const { data: company } = await supabase
      .from("companies")
      .select("a4a_code")
      .eq("slug", item.company_slug)
      .maybeSingle();
    code = company?.a4a_code ?? null;
  }

  if (!code) {
    if (!regNo) return fail("No registration number stored for this item");
    const candidates = registrationCandidates(regNo);
    try {
      for (const candidate of candidates) {
        const hits = await searchByRegistration(candidate);
        code = pickCompanyCode(hits, candidate);
        if (code) break;
      }
    } catch (searchError) {
      return fail(searchError instanceof Error ? searchError.message : "API4ALL search failed");
    }
    if (!code) return fail(`API4ALL has no company code for ${regNo} (tried ${candidates.join(", ")})`);

    if (item.company_slug) {
      await supabase.from("companies").update({ a4a_code: code }).eq("slug", item.company_slug);
    }
  }


  // Always place a fresh-investigation order with API4ALL, then pull the report.
  const reference = `${parentOrder?.reference ?? "CHC"}-${item.id.slice(0, 8)}`;
  let placement: unknown = null;
  try {
    placement = await createOrder({ kind, code, reference });
  } catch (orderError) {
    return fail(
      orderError instanceof Error ? orderError.message : "API4ALL order placement failed",
    );
  }

  try {
    const report = await fetchReport(kind, code);
    await supabase
      .from("order_items")
      .update({
        a4a_kind: kind,
        a4a_code: code,
        a4a_reference: reference,
        a4a_attempts: 1,
        a4a_next_attempt_at: null,
        report_json: { placement, report } as never,
        fulfilment_status: "delivered",
        fulfilment_message: null,
        delivered_at: new Date().toISOString(),
      })
      .eq("id", item.id);
    return { ok: true as const, code };
  } catch (reportError) {
    // The order is placed; the report just isn't ready yet — the scheduled poller
    // (or an API4ALL push to /api/public/a4a-callback) completes it automatically.
    await supabase
      .from("order_items")
      .update({
        a4a_kind: kind,
        a4a_code: code,
        a4a_reference: reference,
        a4a_attempts: 1,
        a4a_next_attempt_at: new Date(Date.now() + 5 * 60_000).toISOString(),
        report_json: { placement } as never,
        fulfilment_status: "processing",
        fulfilment_message: `Order placed with API4ALL (${reference}); awaiting report — retrying automatically. ${
          reportError instanceof Error ? reportError.message : "fetch failed"
        }`.slice(0, 900),
      })
      .eq("id", item.id);
    return { ok: true as const, code, pending: true as const };
  }

}

/* ------------------------------------------------------------------ */
/* Payments (Revolut Merchant)                                         */
/* ------------------------------------------------------------------ */

/** Create (or reuse) a Revolut checkout for an order and return the hosted checkout URL. */
export async function startPayment(reference: string, token: string, origin: string) {
  const supabase = ordersClient();
  const { data: order, error } = await supabase
    .from("orders")
    .select("id, reference, status, email, full_name, total_cents, payment_order_id, checkout_url, payment_state")
    .eq("reference", reference.trim().toUpperCase())
    .eq("access_token", token.trim())
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!order) throw new Error("Order not found");
  if (order.status === "paid" || order.payment_state === "completed") {
    return { alreadyPaid: true as const, checkoutUrl: null };
  }
  if (order.checkout_url && order.payment_state === "pending") {
    return { alreadyPaid: false as const, checkoutUrl: order.checkout_url };
  }

  const { createRevolutOrder } = await import("@/lib/revolut.server");
  const safeOrigin = /^https?:\/\//.test(origin) ? origin.replace(/\/+$/, "") : "";
  const redirectUrl = `${safeOrigin}/order/${order.reference}?token=${encodeURIComponent(token.trim())}`;

  const payment = await createRevolutOrder({
    amountCents: order.total_cents,
    reference: order.reference,
    description: `Companies House Cyprus order ${order.reference}`,
    email: order.email,
    fullName: order.full_name,
    redirectUrl,
  });

  await supabase
    .from("orders")
    .update({
      payment_provider: "revolut",
      payment_order_id: payment.id,
      payment_state: payment.state ?? "pending",
      checkout_url: payment.checkout_url ?? null,
    })
    .eq("id", order.id);

  if (!payment.checkout_url) throw new Error("Revolut did not return a checkout link");
  return { alreadyPaid: false as const, checkoutUrl: payment.checkout_url };
}

const PAID_STATES = new Set(["completed", "authorised", "authorized"]);

/** Mark an order paid and auto-fulfil every API4ALL item on it. */
export async function markOrderPaid(orderId: string) {
  const supabase = ordersClient();
  const { data: order } = await supabase
    .from("orders")
    .select(
      "id, status, reference, full_name, email, firm, vat_number, subtotal_cents, service_fee_cents, vat_cents, total_cents, paid_at",
    )
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return { ok: false as const };
  if (order.status !== "paid" && order.status !== "delivered") {
    const paidAt = new Date().toISOString();
    await supabase
      .from("orders")
      .update({ status: "paid", payment_state: "completed", paid_at: paidAt })
      .eq("id", orderId);

    const { sendPaymentReceiptEmail } = await import("@/lib/order-emails.server");
    await sendPaymentReceiptEmail({ ...order, paid_at: paidAt });
  }

  const { data: items } = await supabase
    .from("order_items")
    .select("id, a4a_kind, product_slug, fulfilment_status")
    .eq("order_id", orderId);

  for (const item of items ?? []) {
    const kind = item.a4a_kind ?? A4A_PRODUCT_KIND[item.product_slug];
    if (!kind || item.fulfilment_status === "delivered") continue;
    try {
      await fulfilOrderItem(item.id);
    } catch {
      /* fulfilment failures are recorded on the item itself */
    }
  }
  return { ok: true as const };
}

/** Look up the payment status at Revolut and reconcile the order (used on return from checkout). */
export async function syncPayment(reference: string, token: string) {
  const supabase = ordersClient();
  const { data: order } = await supabase
    .from("orders")
    .select("id, status, payment_order_id")
    .eq("reference", reference.trim().toUpperCase())
    .eq("access_token", token.trim())
    .maybeSingle();
  if (!order?.payment_order_id) return { status: order?.status ?? null, paid: false };
  if (order.status === "paid" || order.status === "delivered") return { status: order.status, paid: true };

  const { retrieveRevolutOrder } = await import("@/lib/revolut.server");
  const payment = await retrieveRevolutOrder(order.payment_order_id);
  const paid = PAID_STATES.has((payment.state ?? "").toLowerCase());
  if (paid) {
    await markOrderPaid(order.id);
    return { status: "paid", paid: true };
  }
  await supabase.from("orders").update({ payment_state: payment.state ?? null }).eq("id", order.id);
  return { status: order.status, paid: false };
}

/** Webhook path: reconcile by the Revolut order id. */
export async function markPaidByPaymentId(paymentOrderId: string) {
  const supabase = ordersClient();
  const { data: order } = await supabase
    .from("orders")
    .select("id")
    .eq("payment_order_id", paymentOrderId)
    .maybeSingle();
  if (!order) return { ok: false as const };
  return markOrderPaid(order.id);
}

/** Webhook path: record a failed/cancelled payment. */
export async function markPaymentState(paymentOrderId: string, state: string) {
  const supabase = ordersClient();
  await supabase.from("orders").update({ payment_state: state }).eq("payment_order_id", paymentOrderId);
  return { ok: true as const };
}

/** Orders linked to a signed-in user account or email address — powers the client portal. */
export async function listOrdersForUser(userId: string, email: string, limit = 100) {
  const supabase = ordersClient();
  const { data, error } = await supabase
    .from("orders")
    .select(`${ORDER_COLUMNS}, access_token, paid_at, order_items(${ITEM_COLUMNS})`)
    .or(`user_id.eq.${userId},email.ilike.${email.trim()}`)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data ?? [];
}

/* ------------------------------------------------------------------ */
/* Monitoring dates + uploaded documents                               */
/* ------------------------------------------------------------------ */

const DOCUMENTS_BUCKET = "order-documents";

const nullableDate = (value?: string | null) => {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : null;
};

/** Admin: set the promised due date (and optionally the delivery date) on an order. */
export async function setOrderDates(input: {
  reference: string;
  dueDate?: string | null;
  deliveredAt?: string | null;
}) {
  const supabase = ordersClient();
  const delivered = nullableDate(input.deliveredAt);
  const { error } = await supabase
    .from("orders")
    .update({
      due_date: nullableDate(input.dueDate),
      delivered_at: delivered ? new Date(`${delivered}T12:00:00Z`).toISOString() : null,
    })
    .eq("reference", input.reference.trim().toUpperCase());

  if (error) throw new Error(error.message);
  return { ok: true as const };
}

/** Admin: set a per-line due date. */
export async function setOrderItemDueDate(itemId: string, dueDate?: string | null) {
  const supabase = ordersClient();
  const { error } = await supabase
    .from("order_items")
    .update({ due_date: nullableDate(dueDate) })
    .eq("id", itemId);
  if (error) throw new Error(error.message);
  return { ok: true as const };
}

/** Admin: upload one or more completed documents for an order line and notify the client. */
export async function uploadOrderItemDocuments(input: {
  itemId: string;
  files: { fileName: string; contentType: string; base64: string }[];
  notify: boolean;
}) {
  const supabase = ordersClient();
  const { data: item, error } = await supabase
    .from("order_items")
    .select("id, order_id, product_name, company_name, company_number")
    .eq("id", input.itemId)
    .single();
  if (error || !item) throw new Error(error?.message ?? "Order item not found");
  if (!input.files.length) throw new Error("No files to upload");

  const uploaded: { path: string; name: string; size: number }[] = [];

  for (const file of input.files) {
    const binary = Uint8Array.from(atob(file.base64), (char) => char.charCodeAt(0));
    if (binary.byteLength === 0) throw new Error(`${file.fileName || "File"} is empty`);
    if (binary.byteLength > 25 * 1024 * 1024) throw new Error("Files must be 25 MB or smaller");

    const safeName = file.fileName.replace(/[^A-Za-z0-9._-]+/g, "-").slice(-120) || "document.pdf";
    const path = `${item.order_id}/${item.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from(DOCUMENTS_BUCKET)
      .upload(path, binary, { contentType: file.contentType || "application/octet-stream", upsert: true });
    if (uploadError) throw new Error(uploadError.message);

    const { error: insertError } = await supabase.from("order_documents").insert({
      order_id: item.order_id,
      order_item_id: item.id,
      path,
      name: safeName,
      size_bytes: binary.byteLength,
      content_type: file.contentType || null,
    });
    if (insertError) throw new Error(insertError.message);

    uploaded.push({ path, name: safeName, size: binary.byteLength });
  }

  const latest = uploaded[uploaded.length - 1]!;
  const deliveredAt = new Date().toISOString();
  const { error: updateError } = await supabase
    .from("order_items")
    .update({
      document_path: latest.path,
      document_name: latest.name,
      document_size: latest.size,
      fulfilment_status: "delivered",
      fulfilment_message: null,
      delivered_at: deliveredAt,
    })
    .eq("id", item.id);
  if (updateError) throw new Error(updateError.message);

  const { data: order } = await supabase
    .from("orders")
    .select("id, reference, full_name, email, status")
    .eq("id", item.order_id)
    .maybeSingle();

  // Mark the whole order delivered once every line is done.
  const { data: siblings } = await supabase
    .from("order_items")
    .select("fulfilment_status")
    .eq("order_id", item.order_id);
  const allDelivered = (siblings ?? []).every((row) => row.fulfilment_status === "delivered");
  if (order && allDelivered) {
    await supabase
      .from("orders")
      .update({ status: "delivered", delivered_at: deliveredAt })
      .eq("id", order.id);
  }

  if (order && input.notify) {
    const { sendDocumentReadyEmail } = await import("@/lib/order-emails.server");
    await sendDocumentReadyEmail(
      { reference: order.reference, full_name: order.full_name, email: order.email },
      {
        product_name: item.product_name,
        company_name: item.company_name,
        company_number: item.company_number,
        document_name: uploaded.map((doc) => doc.name).join(", "),
      },
    );
  }

  return { ok: true as const, documentNames: uploaded.map((doc) => doc.name), notified: input.notify };
}

/** Admin: remove one uploaded document. */
export async function deleteOrderDocument(documentId: string) {
  const supabase = ordersClient();
  const { data: doc } = await supabase
    .from("order_documents")
    .select("id, path, order_item_id")
    .eq("id", documentId)
    .maybeSingle();
  if (!doc) throw new Error("Document not found");

  await supabase.storage.from(DOCUMENTS_BUCKET).remove([doc.path]);
  const { error } = await supabase.from("order_documents").delete().eq("id", doc.id);
  if (error) throw new Error(error.message);

  // Keep the order line's "latest document" pointer in sync.
  const { data: remaining } = await supabase
    .from("order_documents")
    .select("path, name, size_bytes")
    .eq("order_item_id", doc.order_item_id)
    .order("created_at", { ascending: false })
    .limit(1);
  const latest = remaining?.[0];
  await supabase
    .from("order_items")
    .update({
      document_path: latest?.path ?? null,
      document_name: latest?.name ?? null,
      document_size: latest?.size_bytes ?? null,
    })
    .eq("id", doc.order_item_id);

  return { ok: true as const };
}

/** Time-limited download link for an uploaded document. */
export async function signOrderDocument(path: string, expiresIn = 300) {
  const supabase = ordersClient();
  const { data, error } = await supabase.storage.from(DOCUMENTS_BUCKET).createSignedUrl(path, expiresIn);
  if (error || !data?.signedUrl) throw new Error(error?.message ?? "Could not create a download link");
  return data.signedUrl;
}

/** Resolve a download link for one item, checking the caller owns the order. */
export async function documentUrlForUser(itemId: string, userId: string, email: string, documentId?: string) {
  const supabase = ordersClient();
  const { data: item } = await supabase
    .from("order_items")
    .select("id, document_path, orders!inner(user_id, email)")
    .eq("id", itemId)
    .maybeSingle();
  const owner = (item as { orders?: { user_id: string | null; email: string | null } } | null)?.orders;
  if (!item || !owner) throw new Error("Document not found");
  const mine =
    (owner.user_id && owner.user_id === userId) ||
    (owner.email ?? "").toLowerCase() === email.trim().toLowerCase();
  if (!mine) throw new Error("Document not found");
  const path = documentId ? await documentPath(documentId, itemId) : item.document_path;
  if (!path) throw new Error("Document not found");
  return signOrderDocument(path);
}

/** Look up one stored document, scoped to its order line. */
async function documentPath(documentId: string, itemId: string) {
  const supabase = ordersClient();
  const { data } = await supabase
    .from("order_documents")
    .select("path")
    .eq("id", documentId)
    .eq("order_item_id", itemId)
    .maybeSingle();
  return data?.path ?? null;
}

/** Resolve a download link for one item using the order reference + access token. */
export async function documentUrlForToken(itemId: string, reference: string, token: string, documentId?: string) {
  const supabase = ordersClient();
  const { data: order } = await supabase
    .from("orders")
    .select("id")
    .eq("reference", reference.trim().toUpperCase())
    .eq("access_token", token.trim())
    .maybeSingle();
  if (!order) throw new Error("Order not found");
  const { data: item } = await supabase
    .from("order_items")
    .select("document_path")
    .eq("id", itemId)
    .eq("order_id", order.id)
    .maybeSingle();
  if (!item) throw new Error("Document not found");
  const path = documentId ? await documentPath(documentId, itemId) : item.document_path;
  if (!path) throw new Error("Document not found");
  return signOrderDocument(path);
}
