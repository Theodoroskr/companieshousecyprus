import { createServerFn } from '@tanstack/react-start';
import Stripe from 'stripe';
import { type StripeEnv, createStripeClient, getStripeErrorMessage } from '@/lib/stripe.server';

export type StripeCheckoutResult =
  | { clientSecret: string }
  | { error: string };

type OrderItemRow = {
  apostille?: boolean | null;
  product_slug: string;
  product_name: string;
  company_name: string | null;
  company_number: string | null;
  quantity: number;
  total_cents?: number | null;
};

const cents = (value: number) => Math.round(value * 100);

function lookupKeyForProductSlug(slug: string): string {
  // The apostille add-on is billed through the existing apostille Stripe price.
  if (slug === 'apostille-certification') return 'apostille-service';
  return slug;
}

async function resolvePriceId(stripe: ReturnType<typeof createStripeClient>, lookupKey: string): Promise<string> {
  const prices = await stripe.prices.list({ lookup_keys: [lookupKey] });
  const price = prices.data[0];
  if (!price) throw new Error(`Price not found for ${lookupKey}`);
  return price.id;
}

export const createOrderCheckoutSession = createServerFn({ method: 'POST' })
  .inputValidator((data: { reference: string; token: string; environment: StripeEnv; origin?: string }) => {
    if (!data.reference?.trim() || !data.token?.trim()) throw new Error('Missing order reference');
    return data;
  })
  .handler(async ({ data }): Promise<StripeCheckoutResult> => {
    try {
      const supabaseModule = await import('@/integrations/supabase/client.server');
      const supabase = supabaseModule.supabaseAdmin;

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select(
          'id, reference, status, email, full_name, subtotal_cents, service_fee_cents, apostille_fee_cents, vat_cents, total_cents',
        )
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
        .select(
          'product_slug, product_name, company_name, company_number, quantity, apostille, document_price_cents, service_fee_cents, apostille_fee_cents, vat_cents, total_cents',
        )
        .eq('order_id', order.id);
      if (itemsError || !items || items.length === 0) {
        return { error: 'Order has no items' };
      }

      // Guard: the amount we are about to charge must equal the sum of the
      // order lines. A mismatch means the stored totals are stale/wrong — block
      // rather than charge the customer the wrong amount.
      const lineTotal = (items as OrderItemRow[]).reduce((sum, item) => sum + (item.total_cents ?? 0), 0);
      if ((order.total_cents ?? 0) !== lineTotal) {
        console.error('Order total mismatch', order.reference, order.total_cents, lineTotal);
        return { error: 'This order needs to be re-checked before payment. Please contact us.' };
      }

      const stripe = createStripeClient(data.environment);
      const lineItems: any[] = [];

      for (const item of items as OrderItemRow[]) {
        const product = PRODUCTS.find((candidate) => candidate.slug === item.product_slug);
        const certificates = product ? certificateUnits(product) : 0;

        const productPriceId = await resolvePriceId(stripe, lookupKeyForProductSlug(item.product_slug));
        lineItems.push({
          price: productPriceId,
          quantity: item.quantity,
        });

        if (item.apostille && product && supportsApostille(product)) {
          const apostillePriceId = await resolvePriceId(stripe, 'apostille-service');
          lineItems.push({
            price: apostillePriceId,
            quantity: Math.max(1, certificates) * item.quantity,
          });
        }

        if (certificates > 0) {
          const feePriceId = await resolvePriceId(stripe, 'certificate-service-fee');
          lineItems.push({
            price: feePriceId,
            quantity: certificates * item.quantity,
          });
        }
      }

      // VAT is charged as its own line: 19% of the taxable components only
      // (service fee, apostille, report content). Registrar certificate fees
      // are outside VAT, so the amount comes from our own breakdown.
      const vatCents = order.vat_cents ?? 0;
      if (vatCents > 0) {
        lineItems.push({
          quantity: 1,
          price_data: {
            currency: 'eur',
            unit_amount: vatCents,
            product_data: {
              name: 'VAT (19%) — service fee and reports',
              tax_code: 'txcd_10103001',
            },
          },
        });
      }


      const clientOrigin = /^https?:\/\//.test(data.origin ?? '')
        ? (data.origin ?? '').replace(/\/+$/, '')
        : '';
      const safeOrigin = clientOrigin || (/^https?:\/\//.test(process.env['BASE_URL'] ?? '')
        ? (process.env['BASE_URL'] ?? '').replace(/\/+$/, '')
        : '');
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
          expected_total_cents: String(order.total_cents ?? 0),
        },
        payment_intent_data: {
          description: `Companies House Cyprus order ${order.reference}`,
          metadata: {
            order_reference: order.reference,
          },
        },
        // We calculate and charge Cyprus VAT ourselves on the taxable lines, so
        // no additional tax handling is applied on top of the session.
      } as any);

      return { clientSecret: session.client_secret ?? '' };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });
