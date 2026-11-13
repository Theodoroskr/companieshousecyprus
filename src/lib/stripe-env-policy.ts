/**
 * Which Stripe environment may be used, decided on the server only.
 * The browser never chooses: the published site always uses live Stripe,
 * and test-mode (sandbox) payments can never mark an order as paid.
 */
export type PaymentEnv = 'sandbox' | 'live';

const PRODUCTION_HOSTS = new Set([
  'companieshousecyprus.com',
  'www.companieshousecyprus.com',
  'companieshousecyprus.lovable.app',
]);

export function isProductionHost(host: string | null | undefined): boolean {
  const h = (host ?? '').toLowerCase().split(':')[0] ?? '';
  return PRODUCTION_HOSTS.has(h);
}

/** Published domains always get live checkout; only previews/localhost get sandbox. */
export function checkoutEnvForHost(host: string | null | undefined): PaymentEnv {
  return isProductionHost(host) ? 'live' : 'sandbox';
}

/** Only real (live) payments may complete an order. */
export function paymentEnvMayFulfil(env: PaymentEnv): boolean {
  return env === 'live';
}
