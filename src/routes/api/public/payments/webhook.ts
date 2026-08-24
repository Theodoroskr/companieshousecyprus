import { createFileRoute } from '@tanstack/react-router';
import { createClient } from '@supabase/supabase-js';
import { type StripeEnv, verifyWebhook } from '@/lib/stripe.server';

let _supabase: ReturnType<typeof createClient> | null = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(
      process.env['SUPABASE_URL']!,
      process.env['SUPABASE_SERVICE_ROLE_KEY']!,
    );
  }
  return _supabase;
}

async function handleCheckoutSessionCompleted(session: any, env: StripeEnv) {
  const reference = session.metadata?.order_reference;
  if (!reference) {
    console.error('No order_reference in session metadata');
    return;
  }

  const supabase = getSupabase();
  const { data: order } = await supabase
    .from('orders')
    .select('id, reference, status')
    .eq('reference', reference)
    .maybeSingle();
  if (!order) return;

  // Delayed-notification methods (SEPA, Bacs, boleto, OXXO) fire this when the
  // payment is SUBMITTED, not when money arrives. Only fulfill when paid or no
  // payment required (free trials, 100% promo, zero-total).
  if (session.payment_status !== 'unpaid' && order.status !== 'paid' && order.status !== 'delivered') {
    const { markOrderPaid } = await import('@/lib/orders.server');
    await markOrderPaid(order.id);
  }
}

async function handleAsyncPaymentSucceeded(session: any) {
  const reference = session.metadata?.order_reference;
  if (!reference) return;

  const supabase = getSupabase();
  const { data: order } = await supabase
    .from('orders')
    .select('id, status')
    .eq('reference', reference)
    .maybeSingle();
  if (!order || order.status === 'paid' || order.status === 'delivered') return;

  const { markOrderPaid } = await import('@/lib/orders.server');
  await markOrderPaid(order.id);
}

async function handleAsyncPaymentFailed(session: any) {
  const reference = session.metadata?.order_reference;
  if (!reference) return;

  const supabase = getSupabase();
  await supabase
    .from('orders')
    .update({ payment_state: 'failed' })
    .eq('reference', reference);
}

async function handleWebhook(req: Request, env: StripeEnv) {
  const event = await verifyWebhook(req, env);

  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutSessionCompleted(event.data.object, env);
      break;
    case 'checkout.session.async_payment_succeeded':
      await handleAsyncPaymentSucceeded(event.data.object);
      break;
    case 'checkout.session.async_payment_failed':
      await handleAsyncPaymentFailed(event.data.object);
      break;
    default:
      console.log('Unhandled Stripe event:', event.type);
  }
}

export const Route = createFileRoute('/api/public/payments/webhook')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawEnv = new URL(request.url).searchParams.get('env');
        if (rawEnv !== 'sandbox' && rawEnv !== 'live') {
          console.error('Webhook received with invalid or missing env query parameter:', rawEnv);
          return Response.json({ received: true, ignored: 'invalid env' });
        }
        const env: StripeEnv = rawEnv;
        try {
          await handleWebhook(request, env);
          return Response.json({ received: true });
        } catch (e) {
          console.error('Webhook error:', e);
          return new Response('Webhook error', { status: 400 });
        }
      },
    },
  },
});
