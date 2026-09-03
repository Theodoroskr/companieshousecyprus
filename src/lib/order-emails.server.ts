import { sendTemplateEmail } from "@/lib/email-templates/send-email";

const SITE_URL = "https://companieshousecyprus.com";

const euro = (cents: number | null | undefined) =>
  typeof cents === "number" ? `€${(cents / 100).toFixed(2)}` : undefined;

export type OrderEmailOrder = {
  reference: string;
  access_token?: string | null;
  full_name?: string | null;
  email?: string | null;
  firm?: string | null;
  vat_number?: string | null;
  subtotal_cents?: number | null;
  service_fee_cents?: number | null;
  vat_cents?: number | null;
  total_cents?: number | null;
  charged_subtotal_cents?: number | null;
  charged_tax_cents?: number | null;
  charged_total_cents?: number | null;
  paid_at?: string | null;
};

export type OrderEmailItem = {
  product_name: string;
  company_name?: string | null;
  company_number?: string | null;
  quantity?: number | null;
  total_cents?: number | null;
};

function totals(order: OrderEmailOrder) {
  // Once the payment clears, Stripe's figures are authoritative: they are what
  // the customer was actually charged.
  const charged = typeof order.charged_total_cents === "number";
  return {
    subtotal: euro(charged ? order.charged_subtotal_cents : order.subtotal_cents),
    serviceFee: euro(order.service_fee_cents),
    vat: euro(charged ? order.charged_tax_cents : order.vat_cents),
    total: euro(charged ? order.charged_total_cents : order.total_cents),
  };
}

/** Sent right after an order is created. Never throws — email must not break checkout. */
export async function sendOrderConfirmationEmail(order: OrderEmailOrder, items: OrderEmailItem[]) {
  if (!order.email) return;
  try {
    await sendTemplateEmail("order-confirmation", order.email, {
      idempotencyKey: `order-confirmation-${order.reference}`,
      sendOfficeCopy: true,
      extraCopies: ["accounts@infocreditgroup.com"],
      templateData: {
        fullName: order.full_name ?? undefined,
        reference: order.reference,
        items: items.map((item) => ({
          name: item.product_name,
          company: [item.company_name, item.company_number].filter(Boolean).join(" · ") || null,
          quantity: item.quantity ?? 1,
          total: euro(item.total_cents),
        })),
        ...totals(order),
        trackUrl: order.access_token
          ? `${SITE_URL}/order/${order.reference}?token=${order.access_token}`
          : `${SITE_URL}/account/orders`,
      },
    });
  } catch (error) {
    console.error("Order confirmation email failed", order.reference, error);
  }
}

/** Sent once a payment is confirmed. Never throws — email must not break fulfilment. */
export async function sendPaymentReceiptEmail(order: OrderEmailOrder) {
  if (!order.email) return;
  try {
    const paid = order.paid_at ? new Date(order.paid_at) : new Date();
    await sendTemplateEmail("payment-receipt", order.email, {
      idempotencyKey: `payment-receipt-${order.reference}`,
      sendOfficeCopy: true,
      templateData: {
        fullName: order.full_name ?? undefined,
        reference: order.reference,
        paidAt: paid.toLocaleDateString("en-GB", { timeZone: "Asia/Nicosia" }),
        firm: order.firm ?? null,
        vatNumber: order.vat_number ?? null,
        ...totals(order),
        portalUrl: `${SITE_URL}/account/orders`,
      },
    });
  } catch (error) {
    console.error("Payment receipt email failed", order.reference, error);
  }
}

/** Exact send timestamp shown in the document-ready email footer (Cyprus time). */
function exactSendStamp(now = new Date()) {
  const formatted = now.toLocaleString("en-GB", {
    timeZone: "Asia/Nicosia",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  return `${formatted} (Cyprus time)`;
}

/** Sent when an admin uploads a completed document for one order line. */
export async function sendDocumentReadyEmail(
  order: OrderEmailOrder,
  item: OrderEmailItem & { document_name?: string | null },
) {
  if (!order.email) return;
  try {
    await sendTemplateEmail("document-ready", order.email, {
      idempotencyKey: `document-ready-${order.reference}-${item.document_name ?? item.product_name}`,
      sendOfficeCopy: true,
      templateData: {
        fullName: order.full_name ?? undefined,
        reference: order.reference,
        productName: item.product_name,
        companyName: item.company_name ?? null,
        companyNumber: item.company_number ?? null,
        documentName: item.document_name ?? null,
        deliveredAt: new Date().toLocaleDateString("en-GB", { timeZone: "Asia/Nicosia" }),
        sentAt: exactSendStamp(),
        portalUrl: `${SITE_URL}/account/orders`,
      },
    });
  } catch (error) {
    console.error("Document ready email failed", order.reference, error);
  }
}

/** Sent when an order is marked delivered — lists every document with a secure link. */
export async function sendOrderDeliveredEmail(
  order: OrderEmailOrder,
  documents: { name: string; url?: string | null }[],
  items: OrderEmailItem[],
) {
  if (!order.email) return;
  try {
    const first = items[0];
    await sendTemplateEmail("document-ready", order.email, {
      idempotencyKey: `order-delivered-${order.reference}-${documents.length}`,
      sendOfficeCopy: true,
      templateData: {
        fullName: order.full_name ?? undefined,
        reference: order.reference,
        productName: items.map((item) => item.product_name).join(", ") || undefined,
        companyName: first?.company_name ?? null,
        companyNumber: first?.company_number ?? null,
        documentName: documents.map((doc) => doc.name).join(", ") || null,
        documents,
        deliveredAt: new Date().toLocaleDateString("en-GB", { timeZone: "Asia/Nicosia" }),
        sentAt: exactSendStamp(),
        portalUrl: order.access_token
          ? `${SITE_URL}/order/${order.reference}?token=${order.access_token}`
          : `${SITE_URL}/account/orders`,
      },
    });
  } catch (error) {
    console.error("Order delivered email failed", order.reference, error);
  }
}

/** Sent when the office raises a follow-up charge (e.g. an apostille) and asks the client to pay. */
export async function sendPaymentRequestEmail(input: {
  reference: string;
  accessToken: string;
  email: string;
  fullName?: string | null;
  sourceReference?: string | null;
  description: string;
  company?: string | null;
  subtotalCents: number;
  vatCents: number;
  totalCents: number;
}) {
  await sendTemplateEmail("payment-request", input.email, {
    idempotencyKey: `payment-request-${input.reference}`,
    sendOfficeCopy: true,
    templateData: {
      fullName: input.fullName ?? undefined,
      reference: input.reference,
      sourceReference: input.sourceReference ?? null,
      description: input.description,
      company: input.company ?? null,
      subtotal: euro(input.subtotalCents),
      vat: euro(input.vatCents),
      total: euro(input.totalCents),
      payUrl: `${SITE_URL}/order/${input.reference}?token=${input.accessToken}`,
    },
  });
}
