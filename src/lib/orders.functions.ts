import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type OrderListItem = {
  id: string;
  reference: string;
  access_token: string;
  status: string;
  created_at: string;
  total_cents: number;
  charged_total_cents?: number | null;
  charged_currency?: string | null;
  full_name?: string | null;
  email?: string | null;
  firm?: string | null;
  vat_number?: string | null;
  phone?: string | null;
  paid_at?: string | null;
  due_date?: string | null;
  delivered_at?: string | null;
  order_items: {
    id: string;
    product_name: string;
    product_slug?: string | null;
    company_name: string | null;
    company_number: string | null;
    fulfilment_status: string;
    screening_outcome?: string | null;
    a4a_kind?: string | null;
    delivered_at?: string | null;
    due_date?: string | null;
    document_name?: string | null;
    document_path?: string | null;
    download_url?: string | null;
    order_documents?: {
      id: string;
      name: string;
      size_bytes: number;
      content_type?: string | null;
      created_at: string;
      path: string;
    }[];
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
    apostille?: boolean;
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
    const { assertSupport } = await import("@/lib/admin.server");
    await assertSupport(context.userId);
    const { listOrders } = await import("@/lib/orders.server");
    return { orders: await listOrders() };
  });

export const adminSetOrderStatus = createServerFn({ method: "POST" })
  .inputValidator((data: { reference: string; status: string }) => data)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { assertSupport } = await import("@/lib/admin.server");
    await assertSupport(context.userId);
    const { setOrderStatus } = await import("@/lib/orders.server");
    return setOrderStatus(data.reference.trim(), data.status);
  });

export const adminFulfilItem = createServerFn({ method: "POST" })
  .inputValidator((data: { itemId: string }) => data)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { assertSupport } = await import("@/lib/admin.server");
    await assertSupport(context.userId);
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
    return { email, orders: (await listOrdersForUser(context.userId, email)) as unknown as OrderListItem[] };
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

/** Admin: order-level due date / delivery date for monitoring. */
export const adminSetOrderDates = createServerFn({ method: "POST" })
  .inputValidator((data: { reference: string; dueDate?: string | null; deliveredAt?: string | null }) => {
    if (!data.reference?.trim()) throw new Error("Missing order reference");
    return data;
  })
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { assertSupport } = await import("@/lib/admin.server");
    await assertSupport(context.userId);
    const { setOrderDates } = await import("@/lib/orders.server");
    return setOrderDates(data);
  });

/** Admin: per-line due date. */
export const adminSetItemDueDate = createServerFn({ method: "POST" })
  .inputValidator((data: { itemId: string; dueDate?: string | null }) => {
    if (!data.itemId?.trim()) throw new Error("Missing order item");
    return data;
  })
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { assertSupport } = await import("@/lib/admin.server");
    await assertSupport(context.userId);
    const { setOrderItemDueDate } = await import("@/lib/orders.server");
    return setOrderItemDueDate(data.itemId.trim(), data.dueDate ?? null);
  });

/** Admin: upload one or more completed certificates/reports and optionally email the client. */
export const adminUploadItemDocument = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      itemId: string;
      files: { fileName: string; contentType: string; base64: string }[];
      notify?: boolean;
    }) => {
      if (!data.itemId?.trim()) throw new Error("Missing order item");
      if (!Array.isArray(data.files) || data.files.length === 0) throw new Error("Missing file contents");
      if (data.files.length > 10) throw new Error("Upload up to 10 files at a time");
      const total = data.files.reduce((sum, file) => sum + (file.base64?.length ?? 0), 0);
      if (total > 36_000_000) throw new Error("Files must total 25 MB or less per upload");
      return data;
    },
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { assertSupport } = await import("@/lib/admin.server");
    await assertSupport(context.userId);
    const { uploadOrderItemDocuments } = await import("@/lib/orders.server");
    return uploadOrderItemDocuments({
      itemId: data.itemId.trim(),
      files: data.files.map((file) => ({
        fileName: file.fileName || "document.pdf",
        contentType: file.contentType || "application/octet-stream",
        base64: file.base64,
      })),
      notify: data.notify !== false,
    });
  });

/** Admin: delete one uploaded document. */
export const adminDeleteItemDocument = createServerFn({ method: "POST" })
  .inputValidator((data: { documentId: string }) => {
    if (!data.documentId?.trim()) throw new Error("Missing document");
    return data;
  })
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { assertSupport } = await import("@/lib/admin.server");
    await assertSupport(context.userId);
    const { deleteOrderDocument } = await import("@/lib/orders.server");
    return deleteOrderDocument(data.documentId.trim());
  });

/** Admin: short-lived download link for any uploaded document. */
export const adminDocumentUrl = createServerFn({ method: "POST" })
  .inputValidator((data: { path: string }) => {
    if (!data.path?.trim()) throw new Error("Missing document");
    return data;
  })
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { assertSupport } = await import("@/lib/admin.server");
    await assertSupport(context.userId);
    const { signOrderDocument } = await import("@/lib/orders.server");
    return { url: await signOrderDocument(data.path.trim()) };
  });

/** Client portal: short-lived download link for one of my documents. */
export const myDocumentUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { itemId: string; documentId?: string }) => {
    if (!data.itemId?.trim()) throw new Error("Missing order item");
    return data;
  })
  .handler(async ({ data, context }) => {
    const email = typeof context.claims["email"] === "string" ? (context.claims["email"] as string) : "";
    const { documentUrlForUser } = await import("@/lib/orders.server");
    return {
      url: await documentUrlForUser(data.itemId.trim(), context.userId, email, data.documentId?.trim() || undefined),
    };
  });

/** Guest order page: download link via order reference + access token. */
export const orderDocumentUrl = createServerFn({ method: "POST" })
  .inputValidator((data: { itemId: string; reference: string; token: string; documentId?: string }) => {
    if (!data.itemId?.trim() || !data.reference?.trim() || !data.token?.trim()) {
      throw new Error("Missing order details");
    }
    return data;
  })
  .handler(async ({ data }) => {
    const { documentUrlForToken } = await import("@/lib/orders.server");
    return {
      url: await documentUrlForToken(data.itemId.trim(), data.reference, data.token, data.documentId?.trim() || undefined),
    };
  });

/* ------------------------------------------------------------------ */
/* API4ALL reports: admin review + client viewing                      */
/* ------------------------------------------------------------------ */

/** Admin: parsed report for review before release. */
export const adminReviewReport = createServerFn({ method: "POST" })
  .inputValidator((data: { itemId: string }) => {
    if (!data.itemId?.trim()) throw new Error("Missing order item");
    return data;
  })
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { assertSupport } = await import("@/lib/admin.server");
    await assertSupport(context.userId);
    const { reportForReview } = await import("@/lib/orders.server");
    return reportForReview(data.itemId.trim());
  });

/** Admin: release a reviewed report to the client. */
export const adminReleaseReport = createServerFn({ method: "POST" })
  .inputValidator((data: { itemId: string; notify?: boolean }) => {
    if (!data.itemId?.trim()) throw new Error("Missing order item");
    return data;
  })
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { assertSupport } = await import("@/lib/admin.server");
    await assertSupport(context.userId);
    const { releaseOrderItemReport } = await import("@/lib/orders.server");
    return releaseOrderItemReport(data.itemId.trim(), data.notify !== false);
  });

/** Client portal: parsed report for one of my delivered order lines. */
export const myReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { itemId: string }) => {
    if (!data.itemId?.trim()) throw new Error("Missing order item");
    return data;
  })
  .handler(async ({ data, context }) => {
    const email = typeof context.claims["email"] === "string" ? (context.claims["email"] as string) : "";
    const { reportForOwner } = await import("@/lib/orders.server");
    return reportForOwner(data.itemId.trim(), context.userId, email);
  });

/* ------------------------------------------------------------------ */
/* Sanctions Risk Snapshot (entity-only screening product)             */
/* ------------------------------------------------------------------ */

/** Admin: stored snapshot for review before release. */
export const adminReviewSnapshot = createServerFn({ method: "POST" })
  .inputValidator((data: { itemId: string }) => {
    if (!data.itemId?.trim()) throw new Error("Missing order item");
    return data;
  })
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { assertSupport } = await import("@/lib/admin.server");
    await assertSupport(context.userId);
    const { snapshotForReview } = await import("@/lib/orders.server");
    return snapshotForReview(data.itemId.trim());
  });

/** Admin: rerun the entity-only screening for a snapshot line. */
export const adminRerunSnapshot = createServerFn({ method: "POST" })
  .inputValidator((data: { itemId: string }) => {
    if (!data.itemId?.trim()) throw new Error("Missing order item");
    return data;
  })
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { assertSupport } = await import("@/lib/admin.server");
    await assertSupport(context.userId);
    const { fulfilSanctionsSnapshotItem } = await import("@/lib/orders.server");
    return fulfilSanctionsSnapshotItem(data.itemId.trim());
  });

/** Client portal: my released sanctions snapshot. */
export const mySnapshot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { itemId: string }) => {
    if (!data.itemId?.trim()) throw new Error("Missing order item");
    return data;
  })
  .handler(async ({ data, context }) => {
    const email = typeof context.claims["email"] === "string" ? (context.claims["email"] as string) : "";
    const { snapshotForOwner } = await import("@/lib/orders.server");
    return snapshotForOwner(data.itemId.trim(), context.userId, email);
  });

/** Admin/support: raise a separate payable apostille order for an existing order. */
export const adminCreateApostilleOrder = createServerFn({ method: "POST" })
  .inputValidator((data: { reference: string; itemId?: string | null; quantity?: number; notify?: boolean }) => {
    if (!data.reference?.trim()) throw new Error("Missing order reference");
    return data;
  })
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { assertSupport } = await import("@/lib/admin.server");
    await assertSupport(context.userId);
    const { createApostilleFollowUpOrder } = await import("@/lib/orders.server");
    return createApostilleFollowUpOrder({
      sourceReference: data.reference.trim(),
      itemId: data.itemId ?? null,
      quantity: data.quantity ?? 1,
      notify: data.notify !== false,
    });
  });

/** Admin/support: resend the payment-request email for a follow-up order. */
export const adminResendPaymentRequest = createServerFn({ method: "POST" })
  .inputValidator((data: { reference: string }) => {
    if (!data.reference?.trim()) throw new Error("Missing order reference");
    return data;
  })
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { assertSupport } = await import("@/lib/admin.server");
    await assertSupport(context.userId);
    const { sendApostillePaymentRequest } = await import("@/lib/orders.server");
    return { emailed: await sendApostillePaymentRequest(data.reference.trim()) };
  });
