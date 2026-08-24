import { sendTemplateEmail } from "@/lib/email-templates/send-email";

const SITE_URL = "https://smart-analyse-tool.lovable.app";

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
  return {
    subtotal: euro(order.subtotal_cents),
    serviceFee: euro(order.service_fee_cents),
    vat: euro(order.vat_cents),
    total: euro(order.total_cents),
  };
}

/** Sent right after an order is created. Never throws — email must not break checkout. */
export async function sendOrderConfirmationEmail(order: OrderEmailOrder, items: OrderEmailItem[]) {
  if (!order.email) return;
  try {
    await sendTemplateEmail("order-confirmation", order.email, {
      idempotencyKey: `order-confirmation-${order.reference}`,
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
