import { createFileRoute, Link } from '@tanstack/react-router';
import { useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { CheckCircle2, Loader2, Lock, Receipt, UserPlus, Mail } from 'lucide-react';
import { useCart } from '@/lib/cart';
import { PRODUCTS_BY_SLUG, formatPrice } from '@/lib/products';
import { priceBreakdown, VAT_RATE, CERTIFICATE_SERVICE_FEE } from '@/lib/pricing';
import { submitOrder, submitOrderAsUser, startStripeOrderPayment } from '@/lib/orders.functions';
import { useStripeCheckout } from '@/hooks/useStripeCheckout';
import { useAccount } from '@/hooks/useAccount';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';


const TITLE = 'Checkout — Companies House Cyprus';
const DESCRIPTION = 'Confirm your order details for Cyprus Registrar certificates and company reports.';

export const Route = createFileRoute('/checkout')({
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
  component: CheckoutPage,
});

const FIELDS = [
  { name: 'fullName', label: 'Full name', type: 'text', placeholder: 'Andreas Georgiou', required: true },
  { name: 'email', label: 'Email for delivery', type: 'email', placeholder: 'you@firm.com.cy', required: true },
  { name: 'company', label: 'Your company / firm', type: 'text', placeholder: 'Georgiou & Partners LLC', required: false },
  { name: 'vat', label: 'VAT number (optional)', type: 'text', placeholder: 'CY10123456X', required: false },
  { name: 'phone', label: 'Phone', type: 'tel', placeholder: '+357 22 000 000', required: false },
] as const;

function CheckoutPage() {
  const { items, subtotal, serviceFee, vat, total, clear } = useCart();
  const account = useAccount();
  const placeOrder = useServerFn(submitOrder);
  const placeOrderAsUser = useServerFn(submitOrderAsUser);
  const startStripe = useServerFn(startStripeOrderPayment);
  const [placed, setPlaced] = useState<{ reference: string; token: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createAccount, setCreateAccount] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const { openCheckout, checkoutElement, isOpen } = useStripeCheckout();

  if (placed && !isOpen) {
    return (
      <div className='mx-auto max-w-2xl px-4 py-24 text-center'>
        <CheckCircle2 className='mx-auto size-12 text-olive' />
        <h1 className='mt-6 text-3xl font-bold'>Order request received</h1>
        <p className='mt-3 text-muted-foreground'>
          Reference <span className='font-mono font-semibold text-foreground'>{placed.reference}</span>. Complete the secure payment below to start production.
        </p>
        <div className='mt-8 flex flex-wrap justify-center gap-3'>
          <Button onClick={() => openCheckout(placed)}>
            <Lock className='size-4' /> Pay securely now
          </Button>
          <Button asChild variant='outline'>
            <Link to='/order/$reference' params={{ reference: placed.reference }} search={{ token: placed.token }}>
              Track this order
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  if (placed && isOpen) {
    return (
      <div className='mx-auto max-w-4xl px-4 py-14'>
        <h1 className='text-2xl font-bold'>Secure payment</h1>
        <p className='mt-2 text-sm text-muted-foreground'>
          Order <span className='font-mono font-semibold text-foreground'>{placed.reference}</span>. Enter your card details below.
        </p>
        <div className='mt-8'>{checkoutElement}</div>
      </div>
    );
  }

  return (
    <div className='mx-auto max-w-7xl px-4 py-14'>
      <h1 className='text-3xl font-bold'>Checkout</h1>
      <p className='mt-2 text-sm text-muted-foreground'>
        Card payments are processed securely by Stripe. Tax and handling fees are calculated at checkout.
      </p>

      {items.length === 0 ? (
        <div className='mt-10 rounded-xl border bg-card p-12 text-center shadow-panel'>
          <h2 className='text-lg font-semibold'>Nothing to check out</h2>
          <Button asChild className='mt-5'>
            <Link to='/pricing'>Browse products</Link>
          </Button>
        </div>
      ) : (
        <div className='mt-10 grid gap-8 lg:grid-cols-[1.4fr_1fr]'>
          <form
            className='rounded-xl border bg-card p-6 shadow-panel'
            onSubmit={async (event) => {
              event.preventDefault();
              if (submitting) return;
              const form = new FormData(event.currentTarget);
              const fullName = String(form.get('fullName') ?? '');
              const email = String(form.get('email') ?? '');
              setSubmitting(true);
              setError(null);
              try {
                if (createAccount) {
                  if (!password || password.length < 8) throw new Error('Choose a password of at least 8 characters');
                  if (password !== confirmPassword) throw new Error('Passwords do not match');
                  const { error: signUpError } = await supabase.auth.signUp({
                    email,
                    password,
                    options: { data: { full_name: fullName } },
                  });
                  if (signUpError) throw new Error(signUpError.message);
                }
                const orderPayload = {
                  fullName,
                  email,
                  firm: String(form.get('company') ?? ''),
                  vatNumber: String(form.get('vat') ?? ''),
                  phone: String(form.get('phone') ?? ''),
                  notes: String(form.get('notes') ?? ''),
                  items: items.map((item) => ({
                    productSlug: item.productSlug,
                    companySlug: item.companySlug,
                    companyName: item.companyName,
                    companyNumber: item.companyNumber,
                    quantity: item.quantity,
                  })),
                };
                const result = account.signedIn
                  ? await placeOrderAsUser({ data: orderPayload })
                  : await placeOrder({ data: orderPayload });
                clear();
                setPlaced(result);
                // Open Stripe embedded checkout immediately.
                await startStripe({ data: { reference: result.reference, token: result.token } });
                openCheckout(result);
              } catch (submitError) {
                setError(submitError instanceof Error ? submitError.message : 'Could not submit your order');
              } finally {
                setSubmitting(false);
              }
            }}
          >

            <h2 className='font-display text-lg font-semibold'>Your details</h2>
            <div className='mt-6 grid gap-4 sm:grid-cols-2'>
              {FIELDS.map((field) => (
                <label key={field.name} className={field.name === 'fullName' || field.name === 'email' ? 'sm:col-span-2' : ''}>
                  <span className='text-sm font-medium'>{field.label}</span>
                  <input
                    name={field.name}
                    type={field.type}
                    required={field.required}
                    placeholder={field.placeholder}
                    className='mt-1.5 h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-ring'
                  />
                </label>
              ))}
              <label className='sm:col-span-2'>
                <span className='text-sm font-medium'>Notes for our team (optional)</span>
                <textarea
                  name='notes'
                  rows={3}
                  placeholder='Apostille required, certified translation, urgency…'
                  className='mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring'
                />
              </label>
            </div>

            {!account.signedIn && (
              <div className='mt-6 rounded-xl border border-copper/20 bg-copper/5 p-4'>
                <label className='flex cursor-pointer items-start gap-3'>
                  <Checkbox
                    checked={createAccount}
                    onCheckedChange={(checked) => setCreateAccount(checked === true)}
                    className='mt-0.5'
                  />
                  <div>
                    <span className='flex items-center gap-2 text-sm font-semibold text-foreground'>
                      <UserPlus className='size-4 text-copper' />
                      Create an account to track this order
                    </span>
                    <p className='mt-1 text-xs text-muted-foreground'>
                      Optional. Save your orders and download completed documents from the client portal.
                    </p>
                  </div>
                </label>
                {createAccount && (
                  <div className='mt-4 grid gap-4 sm:grid-cols-2'>
                    <label>
                      <span className='text-sm font-medium'>Password</span>
                      <input
                        type='password'
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder='Create a secure password'
                        minLength={8}
                        required={createAccount}
                        className='mt-1.5 h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-ring'
                      />
                    </label>
                    <label>
                      <span className='text-sm font-medium'>Confirm password</span>
                      <input
                        type='password'
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder='Re-enter password'
                        minLength={8}
                        required={createAccount}
                        className='mt-1.5 h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-ring'
                      />
                    </label>
                  </div>
                )}
              </div>
            )}

            {account.signedIn && account.ready && (
              <div className='mt-6 flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm'>
                <Mail className='size-4 text-primary' />
                <span>
                  Signed in as <span className='font-semibold text-foreground'>{account.email}</span>. This order will be linked to your account.
                </span>
              </div>
            )}
            {error && (
              <p className='mt-4 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive'>
                {error}
              </p>
            )}
            <Button type='submit' size='lg' className='mt-6 w-full' disabled={submitting}>
              {submitting ? <Loader2 className='size-4 animate-spin' /> : <Lock className='size-4' />}
              {submitting ? 'Submitting…' : 'Submit order request'}
            </Button>

            <p className='mt-3 text-xs text-muted-foreground'>
              By submitting you agree to our{' '}
              <Link to='/terms' className='underline'>terms of service</Link> and{' '}
              <Link to='/privacy' className='underline'>privacy policy</Link>.
            </p>
          </form>

          <aside className='h-fit rounded-xl border bg-card p-6 shadow-panel'>
            <h2 className='font-display text-lg font-semibold'>Order summary</h2>
            <ul className='mt-5 space-y-3 text-sm'>
              {items.map((item) => {
                const product = PRODUCTS_BY_SLUG[item.productSlug];
                if (!product) return null;
                const breakdown = priceBreakdown(product, item.quantity);
                return (
                  <li key={`${item.productSlug}-${item.companySlug ?? 'none'}`} className='flex justify-between gap-4'>
                    <span>
                      {product.name}
                      {item.quantity > 1 ? ` × ${item.quantity}` : ''}
                      <span className='block text-xs text-muted-foreground'>
                        {item.companyName ?? 'Company confirmed at checkout'}
                      </span>
                      <span className='mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground'>
                        <Receipt className='size-3' />
                        <span>{formatPrice(breakdown.documentPrice)}</span>
                        {breakdown.serviceFee > 0 && (
                          <>
                            <span className='text-border'>|</span>
                            <span>{formatPrice(breakdown.serviceFee)} fee</span>
                          </>
                        )}
                        <span className='text-border'>|</span>
                        <span>{formatPrice(breakdown.vat)} VAT</span>
                      </span>
                    </span>
                    <span className='shrink-0 text-right'>
                      <span className='block font-medium'>{formatPrice(breakdown.total)}</span>
                      <span className='block text-xs text-muted-foreground'>incl. VAT</span>
                    </span>
                  </li>
                );
              })}
            </ul>
            <dl className='mt-5 space-y-2 border-t pt-4 text-sm'>
              <div className='flex justify-between'>
                <dt className='text-muted-foreground'>Subtotal</dt>
                <dd>{formatPrice(subtotal)}</dd>
              </div>
              {serviceFee > 0 && (
                <div className='flex justify-between'>
                  <dt className='text-muted-foreground'>Service fee ({formatPrice(CERTIFICATE_SERVICE_FEE)} per certificate)</dt>
                  <dd>{formatPrice(serviceFee)}</dd>
                </div>
              )}
              <div className='flex justify-between'>
                <dt className='text-muted-foreground'>VAT ({Math.round(VAT_RATE * 100)}%)</dt>
                <dd>{formatPrice(vat)}</dd>
              </div>
              <div className='flex justify-between border-t pt-2 text-base font-semibold'>
                <dt>Total</dt>
                <dd>{formatPrice(total)}</dd>
              </div>
            </dl>
          </aside>
        </div>
      )}
    </div>
  );
}
