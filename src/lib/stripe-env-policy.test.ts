import { describe, expect, it } from 'vitest';
import { checkoutEnvForHost, paymentEnvMayFulfil } from './stripe-env-policy';

describe('stripe environment policy', () => {
  it('always uses live Stripe on the published domains', () => {
    expect(checkoutEnvForHost('companieshousecyprus.com')).toBe('live');
    expect(checkoutEnvForHost('www.companieshousecyprus.com')).toBe('live');
    expect(checkoutEnvForHost('companieshousecyprus.lovable.app')).toBe('live');
  });
  it('only allows test mode off the published domains', () => {
    expect(checkoutEnvForHost('localhost:8080')).toBe('sandbox');
  });
  it('never lets a test-mode payment complete an order', () => {
    expect(paymentEnvMayFulfil('sandbox')).toBe(false);
    expect(paymentEnvMayFulfil('live')).toBe(true);
  });
});
