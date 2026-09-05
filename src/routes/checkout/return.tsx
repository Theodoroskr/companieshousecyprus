import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { trackEvent } from '@/lib/analytics';
import { useCart } from '@/lib/cart';

const TITLE = 'Payment status — Companies House Cyprus';
const DESCRIPTION = 'Confirm your payment and view your order.';

export const Route = createFileRoute('/checkout/return')({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: 'description', content: DESCRIPTION },
      { property: 'og:title', content: TITLE },
      { property: 'og:description', content: DESCRIPTION },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary' },
      { name: 'robots', content: 'noindex' },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): { session_id?: string | undefined; order_reference?: string | undefined; order_token?: string | undefined } => {
    const sessionId = typeof search['session_id'] === 'string' ? search['session_id'] : undefined;
    const reference = typeof search['order_reference'] === 'string' ? search['order_reference'] : undefined;
    const token = typeof search['order_token'] === 'string' ? search['order_token'] : undefined;
    return { session_id: sessionId, order_reference: reference, order_token: token };
  },
  component: CheckoutReturnPage,
});

function CheckoutReturnPage() {
  const { session_id: sessionId, order_reference: reference, order_token: token } = Route.useSearch();
  const navigate = useNavigate();
  const { clear } = useCart();
  const cartCleared = useRef(false);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<'paid' | 'open' | 'unpaid' | 'no_payment_required' | 'error' | null>(null);
  const [error, setError] = useState<string | null>(null);

  // After a successful payment, empty the basket and take the client straight
  // to their orders page. Clearing only happens once payment is confirmed.
  useEffect(() => {
    if (status === 'paid' || status === 'no_payment_required') {
      if (!cartCleared.current) {
        cartCleared.current = true;
        clear();
      }
      const timer = setTimeout(() => {
        void navigate({ to: '/account/orders', replace: true });
      }, 1500);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [status, navigate, clear]);

  useEffect(() => {
    if (!sessionId) {
      setLoading(false);
      return;
    }
    // Stripe has already redirected the customer; we rely on the webhook to mark the order paid.
    // The session_id is confirmed here only for UX; we give the webhook a moment to land.
    let cancelled = false;
    const check = async () => {
      try {
        const res = await fetch(`/checkout/session-status?session_id=${encodeURIComponent(sessionId)}`);
        if (!res.ok) throw new Error('Could not verify payment status');
        const data = await res.json() as {
          status?: 'paid' | 'open' | 'unpaid' | 'no_payment_required' | null;
          amount_total?: number | null;
          currency?: string | null;
          order_reference?: string | null;
        };
        if (!cancelled) {
          const nextStatus = data.status ?? 'paid';
          setStatus(nextStatus);
          if (nextStatus === 'paid' || nextStatus === 'no_payment_required') {
            const key = `purchase_tracked:${sessionId}`;
            if (!sessionStorage.getItem(key)) {
              sessionStorage.setItem(key, '1');
              trackEvent('purchase_completed', {
                transaction_id: data.order_reference ?? reference ?? sessionId,
                value: (data.amount_total ?? 0) / 100,
                currency: (data.currency ?? 'eur').toUpperCase(),
              });
            }
          }
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Could not verify payment status');
          setStatus('error');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void check();
    return () => { cancelled = true; };
  }, [sessionId, reference]);

  if (loading) {
    return (
      <div className="mx-auto flex max-w-xl items-center justify-center gap-3 px-4 py-24 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" /> Verifying payment…
      </div>
    );
  }

  const isPaid = status === 'paid' || status === 'no_payment_required';

  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      {isPaid ? (
        <>
          <CheckCircle2 className="mx-auto size-12 text-olive" />
          <h1 className="mt-6 text-2xl font-bold">Payment successful</h1>
          <p className="mt-3 text-muted-foreground">
            Your order has been paid and is now in production. Use the link below to track progress.
          </p>
        </>
      ) : status === 'open' ? (
        <>
          <Loader2 className="mx-auto size-12 text-copper" />
          <h1 className="mt-6 text-2xl font-bold">Payment in progress</h1>
          <p className="mt-3 text-muted-foreground">
            Your payment is still being processed. Refresh your order page in a few minutes or contact us.
          </p>
        </>
      ) : (
        <>
          <XCircle className="mx-auto size-12 text-destructive" />
          <h1 className="mt-6 text-2xl font-bold">Payment not completed</h1>
          <p className="mt-3 text-muted-foreground">
            {error || 'We could not confirm the payment. You can retry from your order page.'}
          </p>
        </>
      )}

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button asChild>
          <Link to="/account/orders">View my orders</Link>
        </Button>
        {reference && token && (
          <Button asChild variant="outline">
            <Link to="/order/$reference" params={{ reference }} search={{ token }}>
              Track this order
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
