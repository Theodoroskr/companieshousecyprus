import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/revolut-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.text();
        const { verifyWebhookSignature } = await import("@/lib/revolut.server");
        const valid = await verifyWebhookSignature({
          body,
          signatureHeader: request.headers.get("revolut-signature"),
          timestampHeader: request.headers.get("revolut-request-timestamp"),
        });
        if (!valid) return new Response("Invalid signature", { status: 401 });

        let payload: { event?: string; order_id?: string } = {};
        try {
          payload = JSON.parse(body);
        } catch {
          return new Response("Invalid payload", { status: 400 });
        }
        const paymentOrderId = payload.order_id;
        if (!paymentOrderId) return new Response("ok");

        const { markPaidByPaymentId, markPaymentState } = await import("@/lib/orders.server");
        switch (payload.event) {
          case "ORDER_COMPLETED":
          case "ORDER_AUTHORISED":
            await markPaidByPaymentId(paymentOrderId);
            break;
          case "ORDER_PAYMENT_FAILED":
            await markPaymentState(paymentOrderId, "failed");
            break;
          case "ORDER_CANCELLED":
            await markPaymentState(paymentOrderId, "cancelled");
            break;
          default:
            break;
        }
        return new Response("ok");
      },
    },
  },
});
