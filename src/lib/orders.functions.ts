import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type OrderListItem = {
  id: string;
  reference: string;
  status: string;
  created_at: string;
  total_cents: number;
  order_items: {
    id: string;
    product_name: string;
    company_name: string | null;
    company_number: string | null;
    fulfilment_status: string;
    download_url: string | null;
  }[];
};

export type PlaceOrderPayload = {
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

export const submitOrder = createServerFn({ method: "POST" })
  .inputValidator((data: PlaceOrderPayload) => {
    if (!data.fullName?.trim()) throw new Error("Full name is required");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(data.email?.trim() ?? "")) throw new Error("A valid email is required");
    if (!Array.isArray(data.items) || data.items.length === 0) throw new Error("Your basket is empty");
    if (data.items.length > 30) throw new Error("Too many items in one order");
    return data;
  })
  .handler(async ({ data }) => {
    const { placeOrder } = await import("@/lib/orders.server");
    return placeOrder(data);
  });

export const fetchOrder = createServerFn({ method: "POST" })
  .inputValidator((data: { reference: string; token: string }) => data)
  .handler(async ({ data }) => {
    if (!data.reference?.trim() || !data.token?.trim()) return null;
    const { readOrder } = await import("@/lib/orders.server");
    return readOrder(data.reference, data.token);
  });

export const adminListOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertAdmin } = await import("@/lib/admin.server");
    await assertAdmin(context.userId);
    const { listOrders } = await import("@/lib/orders.server");
    return { orders: await listOrders() };
  });

export const adminSetOrderStatus = createServerFn({ method: "POST" })
  .inputValidator((data: { reference: string; status: string }) => data)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/admin.server");
    await assertAdmin(context.userId);
    const { setOrderStatus } = await import("@/lib/orders.server");
    return setOrderStatus(data.reference.trim(), data.status);
  });

export const adminFulfilItem = createServerFn({ method: "POST" })
  .inputValidator((data: { itemId: string }) => data)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/admin.server");
    await assertAdmin(context.userId);
    const { fulfilOrderItem } = await import("@/lib/orders.server");
    return fulfilOrderItem(data.itemId.trim());
  });

export const startOrderPayment = createServerFn({ method: "POST" })
  .inputValidator((data: { reference: string; token: string; origin: string }) => {
    if (!data.reference?.trim() || !data.token?.trim()) throw new Error("Missing order reference");
    return data;
  })
  .handler(async ({ data }) => {
    const { startPayment } = await import("@/lib/orders.server");
    return startPayment(data.reference, data.token, data.origin);
  });

export const startStripeOrderPayment = createServerFn({ method: "POST" })
  .inputValidator((data: { reference: string; token: string }) => {
    if (!data.reference?.trim() || !data.token?.trim()) throw new Error("Missing order reference");
    return data;
  })
  .handler(async ({ data }) => {
    const { readOrder } = await import("@/lib/orders.server");
    const order = await readOrder(data.reference, data.token);
    if (!order) throw new Error("Order not found");
    if (order.order.status === "paid" || order.order.status === "delivered") {
      throw new Error("Order is already paid");
    }
    return { ok: true as const, reference: order.order.reference, token: data.token };
  });

export const syncOrderPayment = createServerFn({ method: "POST" })
  .inputValidator((data: { reference: string; token: string }) => {
    if (!data.reference?.trim() || !data.token?.trim()) throw new Error("Missing order reference");
    return data;
  })
  .handler(async ({ data }) => {
    const { syncPayment } = await import("@/lib/orders.server");
    return syncPayment(data.reference, data.token);
  });

/** Orders belonging to the signed-in customer (matched by user id or account email). */
export const listMyOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ email: string; orders: OrderListItem[] }> => {
    const email = typeof context.claims["email"] === "string" ? (context.claims["email"] as string) : "";
    if (!context.userId || !email) return { email: email || "", orders: [] };
    const { listOrdersForUser } = await import("@/lib/orders.server");
    return { email, orders: (await listOrdersForUser(context.userId, email)) as OrderListItem[] };
  });

/** Place an order while signed in. The user id is taken from the verified session. */
export const submitOrderAsUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: PlaceOrderPayload) => {
    if (!data.fullName?.trim()) throw new Error("Full name is required");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(data.email?.trim() ?? "")) throw new Error("A valid email is required");
    if (!Array.isArray(data.items) || data.items.length === 0) throw new Error("Your basket is empty");
    if (data.items.length > 30) throw new Error("Too many items in one order");
    return data;
  })
  .handler(async ({ data, context }) => {
    const { placeOrder } = await import("@/lib/orders.server");
    return placeOrder({ ...data, userId: context.userId });
  });
