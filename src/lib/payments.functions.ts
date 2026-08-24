import { createServerFn } from '@tanstack/react-start';
import Stripe from 'stripe';
import { type StripeEnv, createStripeClient, getStripeErrorMessage } from '@/lib/stripe.server';

export type StripeCheckoutResult =
  | { clientSecret: string }
  | { error: string };

type OrderItemRow = {
  product_slug: string;
  product_name: string;
  company_name: string | null;
  company_number: string | null;
  quantity: number;
};

const cents = (value: number) => Math.round(value * 100);

function lookupKeyForProductSlug(slug: string): string {
  return slug;
}

async function resolvePriceId(stripe: ReturnType<typeof createStripeClient>, lookupKey: string): Promise<string> {
  const prices = await stripe.prices.list({ lookup_keys: [lookupKey] });
  const price = prices.data[0];
  if (!price) throw new Error(`Price not found for ${lookupKey}`);
  return price.id;
}

export const createOrderCheckoutSession = createServerFn({ method: 'POST' })
  .inputValidator((data: { reference: string; token: string; environment: StripeEnv }) => {
    if (!data.reference?.trim() || !data.token?.trim()) throw new Error('Missing order reference');
    return data;
  })
  .handler(async ({ data }): Promise<StripeCheckoutResult> => {
    try {
      const supabaseModule = await import('@/integrations/supabase/client.server');
      const supabase = supabaseModule.supabaseAdmin;

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('id, reference, status, email, full_name, total_cents')
        .eq('reference', data.reference.trim().toUpperCase())
        .eq('access_token', data.token.trim())
        .maybeSingle();

      if (orderError || !order) {
        return { error: 'Order not found' };
      }
      if (order.status === 'paid' || order.status === 'delivered') {
        return { error: 'Order is already paid' };
      }

      const { data: items, error: itemsError } = await supabase
        .from('order_items')
        .select('product_slug, product_name, company_name, company_number, quantity')
        .eq('order_id', order.id);
      if (itemsError || !items || items.length === 0) {
        return { error: 'Order has no items' };
      }

      const stripe = createStripeClient(data.environment);
      const lineItems: any[] = [];

      for (const item of items as OrderItemRow[]) {
        const productPriceId = await resolvePriceId(stripe, lookupKeyForProductSlug(item.product_slug));
        lineItems.push({
          price: productPriceId,
          quantity: item.quantity,
        });

        if (item.product_slug.startsWith('certificate-') && item.product_slug !== 'certificate-service-fee') {
          const feePriceId = await resolvePriceId(stripe, 'certificate-service-fee');
          lineItems.push({
            price: feePriceId,
            quantity: item.quantity,
          });
        }
      }

      const safeOrigin = /^https?:\/\//.test(process.env['BASE_URL'] ?? '')
        ? (process.env['BASE_URL'] ?? '').replace(/\/+$/, '')
        : '';
      const returnUrl = safeOrigin
        ? `${safeOrigin}/checkout/return?order_reference=${encodeURIComponent(order.reference)}&order_token=${encodeURIComponent(data.token)}&session_id={CHECKOUT_SESSION_ID}`
        : `https://smart-analyse-tool.lovable.app/checkout/return?order_reference=${encodeURIComponent(order.reference)}&order_token=${encodeURIComponent(data.token)}&session_id={CHECKOUT_SESSION_ID}`;

      const session = await stripe.checkout.sessions.create({
        line_items: lineItems,
        mode: 'payment',
        ui_mode: 'embedded_page',
        return_url: returnUrl,
        customer_email: order.email,
        metadata: {
          order_reference: order.reference,
        },
        payment_intent_data: {
          description: `Companies House Cyprus order ${order.reference}`,
          metadata: {
            order_reference: order.reference,
          },
        },
        managed_payments: { enabled: true },
      } as any);

      return { clientSecret: session.client_secret ?? '' };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });
