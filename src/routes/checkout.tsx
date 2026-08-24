import { createFileRoute, Link } from '@tanstack/react-router';
import { useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { CheckCircle2, Loader2, Lock, Receipt, UserPlus, Mail, AlertCircle } from 'lucide-react';
import { useCart } from '@/lib/cart';
import { PRODUCTS_BY_SLUG, formatPrice } from '@/lib/products';
import { priceBreakdown, VAT_RATE, CERTIFICATE_SERVICE_FEE } from '@/lib/pricing';
import { submitOrder, submitOrderAsUser, startStripeOrderPayment } from '@/lib/orders.functions';
import { useStripeCheckout } from '@/hooks/useStripeCheckout';
import { useAccount } from '@/hooks/useAccount';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';




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

function friendlyAuthError(error: unknown, context: 'signup' | 'checkout' = 'checkout') {
  const msg = error instanceof Error ? error.message : String(error ?? '');
  const code =
    error && typeof error === 'object' && 'code' in error && typeof error.code === 'string'
      ? error.code
      : undefined;
  const lower = msg.toLowerCase();
  if (code === 'weak_password' || lower.includes('weak_password')) {
    return 'Password is too weak. Use at least 8 characters including a mix of letters and numbers.';
  }
  if (code === 'user_already_exists' || lower.includes('user already registered') || lower.includes('already exists')) {
    return 'An account with this email already exists. Sign in to your account before checkout, or use a different email.';
  }
  if (code === 'over_email_send_rate_limit' || lower.includes('rate limit')) {
    return 'Too many attempts. Please wait a moment and try again.';
  }
  if (code === 'validation_failed' || lower.includes('invalid email')) {
    return 'Please enter a valid email address.';
  }
  if (lower.includes('password') && lower.includes('invalid')) {
    return 'Invalid password. Make sure it is at least 8 characters.';
  }
  if (lower.includes('anonymous_provider_disabled') || lower.includes('signup disabled')) {
    return 'Account creation is temporarily unavailable. Continue as a guest or try again later.';
  }
  return context === 'signup' ? 'Could not create your account. Please check your details and try again.' : 'Could not submit your order. Please check your details and try again.';
}

function validatePassword(password: string, confirmPassword: string) {
  if (!password || password.length < 8) {
    return 'Password must be at least 8 characters long.';
  }
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return 'Password must include at least one letter and one number.';
  }
  if (password !== confirmPassword) {
    return 'Passwords do not match. Please re-enter the same password.';
  }
  return null;
}

const PASSWORD_RULES = [
  { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { label: 'A letter', test: (p: string) => /[A-Za-z]/.test(p) },
  { label: 'A number', test: (p: string) => /[0-9]/.test(p) },
  { label: 'A symbol or 12+ characters (recommended)', test: (p: string) => /[^A-Za-z0-9]/.test(p) || p.length >= 12 },
];

function passwordStrength(password: string) {
  const passed = PASSWORD_RULES.filter((r) => r.test(password)).length;
  if (!password) return { score: 0, label: '', tone: 'bg-muted' };
  if (passed <= 1) return { score: 1, label: 'Weak', tone: 'bg-destructive' };
  if (passed === 2) return { score: 2, label: 'Fair', tone: 'bg-amber-500' };
  if (passed === 3) return { score: 3, label: 'Good', tone: 'bg-copper' };
  return { score: 4, label: 'Strong', tone: 'bg-emerald-500' };
}




function CheckoutPage() {
  const { items, subtotal, serviceFee, vat, total, clear } = useCart();
  const account = useAccount();
  const placeOrder = useServerFn(submitOrder);
  const placeOrderAsUser = useServerFn(submitOrderAsUser);
  const startStripe = useServerFn(startStripeOrderPayment);
  const [placed, setPlaced] = useState<{ reference: string; token: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<{ message: string; code?: string | undefined } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string | undefined;
    password?: string | undefined;
    confirmPassword?: string | undefined;
  }>({});

  const [createAccount, setCreateAccount] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [accountCreated, setAccountCreated] = useState(false);

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
              setFieldErrors({});
              let useAuthenticated = account.signedIn;
              try {
                if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                  setFieldErrors((prev) => ({ ...prev, email: 'Please enter a valid email address.' }));
                  throw new Error('validation');
                }
                if (createAccount) {
                  const passwordError = validatePassword(password, confirmPassword);
                  if (passwordError) {
                    setFieldErrors((prev) => ({
                      ...prev,
                      password: passwordError.includes('match') ? passwordError : passwordError,
                      confirmPassword: passwordError.includes('match') ? passwordError : undefined,
                    }));
                    throw new Error('validation');
                  }
                  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
                    email,
                    password,
                    options: { data: { full_name: fullName } },
                  });
                  if (signUpError) {
                    const friendly = friendlyAuthError(signUpError, 'signup');
                    const code = (signUpError as { code?: string }).code;
                    setError({ message: friendly, code });
                    throw new Error('signup');
                  }
                  if (signUpData.user) {
                    setAccountCreated(true);
                    useAuthenticated = true;
                  }
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
                const result = useAuthenticated
                  ? await placeOrderAsUser({ data: orderPayload })
                  : await placeOrder({ data: orderPayload });
                clear();
                setPlaced(result);
                // Open Stripe embedded checkout immediately.
                await startStripe({ data: { reference: result.reference, token: result.token } });
                openCheckout(result);
              } catch (submitError) {
                if (submitError instanceof Error && submitError.message === 'validation') return;
                if (submitError instanceof Error && submitError.message === 'signup') return;
                if (!error) {
                  setError({
                    message:
                      submitError instanceof Error
                        ? submitError.message
                        : 'Could not submit your order. Please check your details and try again.',
                  });
                }
              } finally {
                setSubmitting(false);
              }
            }}
          >


            <h2 className='font-display text-lg font-semibold'>Your details</h2>
            <div className='mt-6 grid gap-4 sm:grid-cols-2'>
              {FIELDS.map((field) => {
                const errorText = field.name === 'email' ? fieldErrors.email : undefined;
                return (
                  <label
                    key={field.name}
                    className={field.name === 'fullName' || field.name === 'email' ? 'sm:col-span-2' : ''}
                  >
                    <span className='text-sm font-medium'>{field.label}</span>
                    <input
                      name={field.name}
                      type={field.type}
                      required={field.required}
                      placeholder={field.placeholder}
                      aria-invalid={!!errorText}
                      onChange={() => {
                        if (errorText) {
                          setFieldErrors((prev) => ({ ...prev, email: undefined }));
                        }
                      }}
                      className={cn(
                        'mt-1.5 h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-ring',
                        errorText && 'border-destructive focus:border-destructive',
                      )}
                    />

                    {errorText && (
                      <span className='mt-1 block text-xs text-destructive'>{errorText}</span>
                    )}
                  </label>
                );
              })}

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

            {!account.signedIn && !accountCreated && (

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
                        onChange={(e) => {
                          setPassword(e.target.value);
                          if (fieldErrors.password) {
                            setFieldErrors((prev) => ({ ...prev, password: undefined, confirmPassword: undefined }));
                          }
                        }}
                        placeholder='Create a secure password'
                        minLength={8}
                        required={createAccount}
                        aria-invalid={!!fieldErrors.password}
                        className={cn(
                          'mt-1.5 h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-ring',
                          fieldErrors.password && 'border-destructive focus:border-destructive',
                        )}
                      />
                      {fieldErrors.password && (
                        <span className='mt-1 block text-xs text-destructive'>{fieldErrors.password}</span>
                      )}
                    </label>
                    <label>
                      <span className='text-sm font-medium'>Confirm password</span>
                      <input
                        type='password'
                        value={confirmPassword}
                        onChange={(e) => {
                          setConfirmPassword(e.target.value);
                          if (fieldErrors.confirmPassword) {
                            setFieldErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                          }
                        }}
                        placeholder='Re-enter password'
                        minLength={8}
                        required={createAccount}
                        aria-invalid={!!fieldErrors.confirmPassword}
                        className={cn(
                          'mt-1.5 h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-ring',
                          fieldErrors.confirmPassword && 'border-destructive focus:border-destructive',
                        )}
                      />
                      {fieldErrors.confirmPassword && (
                        <span className='mt-1 block text-xs text-destructive'>{fieldErrors.confirmPassword}</span>
                      )}
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
            {accountCreated && !account.signedIn && (
              <div className='mt-6 flex items-center gap-3 rounded-xl border border-emerald-600/20 bg-emerald-50 p-4 text-sm text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100'>
                <CheckCircle2 className='size-4 text-emerald-600' />
                <span>Account created successfully. Continuing as a signed-in user.</span>
              </div>
            )}


            {error && (
              <Alert variant='destructive' className='mt-4'>
                <AlertCircle className='size-4' />
                <AlertTitle>There was a problem</AlertTitle>
                <AlertDescription className='space-y-2'>
                  <p>{error.message}</p>
                  {error.code === 'user_already_exists' && (
                    <p>
                      <Link to='/auth' search={{ redirect: '/checkout' }} className='font-semibold underline'>
                        Sign in to your existing account
                      </Link>{' '}
                      or use a different email address.
                    </p>
                  )}
                </AlertDescription>
              </Alert>
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
