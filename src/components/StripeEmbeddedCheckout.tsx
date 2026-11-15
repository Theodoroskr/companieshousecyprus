import { useCallback, useEffect, useRef, useState } from 'react';
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from '@stripe/react-stripe-js';
import { Loader2 } from 'lucide-react';
import { getStripe } from '@/lib/stripe';
import { createOrderCheckoutSession } from '@/lib/payments.functions';
import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';

interface StripeEmbeddedCheckoutProps {
  reference: string;
  token: string;
}

export function StripeEmbeddedCheckout({ reference, token }: StripeEmbeddedCheckoutProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [needsSignIn, setNeedsSignIn] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    setNeedsSignIn(false);
    setClientSecret(null);
    try {
      const result = await createOrderCheckoutSession({
        data: {
          reference,
          token,
          origin: typeof window !== 'undefined' ? window.location.origin : '',
        },
      });
      if ('error' in result) throw new Error(result.error);
      if (!result.clientSecret) throw new Error('The payment page could not be opened.');
      setClientSecret(result.clientSecret);
    } catch (err) {
      console.error('Could not start Stripe checkout', err);
      const message = err instanceof Error ? err.message : '';
      if (/unauthori[sz]ed|sign in with a verified account/i.test(message)) {
        // Session missing or expired: never show the raw server message.
        setNeedsSignIn(true);
        setError('Please sign in with the email this order was placed with, then press Pay again.');
        return;
      }
      setError(
        err instanceof Error && err.message
          ? err.message
          : 'We could not open the payment page. Please try again.',
      );
    }
  }, [reference, token]);

  useEffect(() => {
    void load();
  }, [load, attempt]);

  useEffect(() => {
    if (clientSecret) containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [clientSecret]);

  if (error) {
    return (
      <div ref={containerRef} className="rounded-lg border border-destructive/40 bg-destructive/5 p-5">
        <p className="font-semibold">We could not open the payment page</p>
        <p className="mt-1 text-sm text-muted-foreground">{error}</p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {needsSignIn ? (
            <Button asChild>
              <Link
                to="/auth"
                search={{
                  redirect: `/order/${encodeURIComponent(reference)}?token=${encodeURIComponent(token)}`,
                }}
              >
                Sign in to pay
              </Link>
            </Button>
          ) : (
            <Button onClick={() => setAttempt((value) => value + 1)}>Try again</Button>
          )}
          <span className="text-sm text-muted-foreground">
            Still stuck? Email info@companieshousecyprus.com and we will send you a payment link.
          </span>
        </div>
      </div>
    );
  }

  if (!clientSecret) {
    return (
      <div ref={containerRef} className="flex items-center gap-3 rounded-lg border p-5 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Opening secure payment…
      </div>
    );
  }

  return (
    <div id="checkout" ref={containerRef}>
      <EmbeddedCheckoutProvider stripe={getStripe()} options={{ clientSecret }}>
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}
