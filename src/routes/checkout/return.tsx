import { createFileRoute, Link } from '@tanstack/react-router';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';

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
  validateSearch: (search: Record<string, unknown>): { session_id?: string; order_reference?: string; order_token?: string } => ({
    session_id: typeof search.session_id === 'string' ? search.session_id : undefined,
    order_reference: typeof search.order_reference === 'string' ? search.order_reference : undefined,
    order_token: typeof search.order_token === 'string' ? search.order_token : undefined,
  }),
  component: CheckoutReturnPage,
});

function CheckoutReturnPage() {
  const { session_id: sessionId, order_reference: reference, order_token: token } = Route.useSearch();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<'paid' | 'open' | 'unpaid' | 'error' | null>(null);
  const [error, setError] = useState<string | null>(null);

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
        const data = await res.json() as { status?: 'paid' | 'open' | 'unpaid' | null };
        if (!cancelled) {
          setStatus(data.status ?? 'paid');
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
  }, [sessionId]);

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
        {reference && token ? (
          <Button asChild>
            <Link to="/order/$reference" params={{ reference }} search={{ token }}>
              Track your order
            </Link>
          </Button>
        ) : (
          <Button asChild variant="outline">
            <Link to="/search" search={{ q: '', page: 1 }}>Search another company</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
