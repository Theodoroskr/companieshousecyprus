import { EmbeddedCheckoutProvider, EmbeddedCheckout } from '@stripe/react-stripe-js';
import { getStripe, getStripeEnvironment } from '@/lib/stripe';
import { createOrderCheckoutSession } from '@/lib/payments.functions';

interface StripeEmbeddedCheckoutProps {
  reference: string;
  token: string;
}

export function StripeEmbeddedCheckout({ reference, token }: StripeEmbeddedCheckoutProps) {
  const fetchClientSecret = async (): Promise<string> => {
    const result = await createOrderCheckoutSession({
      data: {
        reference,
        token,
        environment: getStripeEnvironment(),
        origin: typeof window !== 'undefined' ? window.location.origin : '',
      },
    });
    if ('error' in result) throw new Error(result.error);
    if (!result.clientSecret) throw new Error('Stripe did not return a client secret');
    return result.clientSecret;
  };

  const checkoutOptions = { fetchClientSecret };

  return (
    <div id="checkout">
      <EmbeddedCheckoutProvider stripe={getStripe()} options={checkoutOptions}>
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}
