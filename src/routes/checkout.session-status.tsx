import { createFileRoute } from '@tanstack/react-router';
import { type StripeEnv, createStripeClient, getStripeErrorMessage } from '@/lib/stripe.server';

export const Route = createFileRoute('/checkout/session-status')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const sessionId = url.searchParams.get('session_id');
        if (!sessionId) {
          return Response.json({ error: 'Missing session_id' }, { status: 400 });
        }

        // Derive environment from the session id prefix: cs_test_ or cs_live_
        const env: StripeEnv = sessionId.startsWith('cs_live_') ? 'live' : 'sandbox';

        try {
          const stripe = createStripeClient(env);
          const session = await stripe.checkout.sessions.retrieve(sessionId);

          // Belt-and-braces with the webhook: record the charged amounts as soon
          // as the customer lands back on the return page.
          const reference = session.metadata?.['order_reference'];
          if (reference && session.payment_status !== 'unpaid') {
            const { recordChargedTotalsByReference } = await import('@/lib/orders.server');
            await recordChargedTotalsByReference(reference, {
              subtotalCents: session.amount_subtotal ?? null,
              taxCents: session.total_details?.amount_tax ?? null,
              totalCents: session.amount_total ?? null,
              currency: session.currency ?? null,
            });
          }

          return Response.json({
            status: session.payment_status,
            amount_total: session.amount_total ?? null,
            currency: session.currency ?? null,
            order_reference: reference ?? null,
          });
        } catch (error) {
          return Response.json({ error: getStripeErrorMessage(error) }, { status: 500 });
        }
      },
    },
  },
});
