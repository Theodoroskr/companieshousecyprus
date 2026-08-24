import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { CheckCircle2, Loader2, Lock, Receipt, UserPlus, Mail, AlertCircle } from 'lucide-react';
import { useCart } from '@/lib/cart';
import { PRODUCTS_BY_SLUG, formatPrice } from '@/lib/products';
import { priceBreakdown, VAT_RATE, CERTIFICATE_SERVICE_FEE } from '@/lib/pricing';
import { submitOrder, submitOrderAsUser, startStripeOrderPayment, listMyOrders } from '@/lib/orders.functions';
import { useStripeCheckout } from '@/hooks/useStripeCheckout';
import { useAccount } from '@/hooks/useAccount';
import { supabase } from '@/integrations/supabase/client';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';




const TITLE = 'Checkout — Companies House Cyprus';
const DESCRIPTION = 'Confirm your order details for Cyprus Registrar certificates and company reports.';

export const Route = createFileRoute('/checkout/')({
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
  { name: 'phone', label: 'Phone', type: 'tel', placeholder: '+357 22 398241', required: false },
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
  const loadMyOrders = useServerFn(listMyOrders);
  const [profile, setProfile] = useState<Record<string, string>>({});

  // Prefill the delivery details from the signed-in customer's most recent order.
  useEffect(() => {
    if (!account.ready || !account.signedIn) {
      setProfile({});
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await loadMyOrders();
        const latest = res?.orders?.[0];
        if (cancelled) return;
        const next: Record<string, string> = {};
        if (account.email) next['email'] = account.email;
        if (latest?.full_name) next['fullName'] = latest.full_name;
        if (latest?.firm) next['company'] = latest.firm;
        if (latest?.vat_number) next['vat'] = latest.vat_number;
        if (latest?.phone) next['phone'] = latest.phone;
        setProfile(next);
      } catch {
        if (!cancelled) setProfile(account.email ? { email: account.email } : {});
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [account.ready, account.signedIn, account.email, loadMyOrders]);

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

  const [companyInputs, setCompanyInputs] = useState<Record<number, { companyName: string; companyNumber: string }>>({});
  const [companyInputErrors, setCompanyInputErrors] = useState<Record<number, { companyName?: string | undefined; companyNumber?: string | undefined }>>({});
  const [companySummaryErrors, setCompanySummaryErrors] = useState<string[]>([]);


  const itemsNeedingCompany = items
    .map((item, index) => ({ item, index, product: PRODUCTS_BY_SLUG[item.productSlug] }))
    .filter(({ item }) => !item.companyName || !item.companyNumber);

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

                const nextCompanyErrors: Record<number, { companyName?: string; companyNumber?: string }> = {};
                const missingSummary: string[] = [];
                let firstInvalidField: string | null = null;
                for (const { index, product } of itemsNeedingCompany) {
                  const input = companyInputs[index] ?? { companyName: '', companyNumber: '' };
                  const label = product?.name ?? 'this item';
                  const errors: { companyName?: string; companyNumber?: string } = {};
                  const name = input.companyName.trim();
                  const number = input.companyNumber.trim();

                  if (!name) {
                    errors.companyName = `Enter the company name for “${label}”, exactly as it appears on the Cyprus register.`;
                  } else if (name.length < 3) {
                    errors.companyName = `“${name}” looks too short — enter the full registered company name for “${label}”.`;
                  }

                  if (!number) {
                    errors.companyNumber = `Enter the registration number for “${label}” (for example HE 252407 or C 409882).`;
                  } else if (!/\d/.test(number)) {
                    errors.companyNumber = `“${number}” has no digits — a Cyprus registration number looks like HE 252407 or C 409882.`;
                  }

                  if (errors.companyName) {
                    missingSummary.push(`${label}: ${errors.companyName}`);
                    firstInvalidField ??= `company-name-${index}`;
                  }
                  if (errors.companyNumber) {
                    missingSummary.push(`${label}: ${errors.companyNumber}`);
                    firstInvalidField ??= `company-number-${index}`;
                  }
                  nextCompanyErrors[index] = errors;
                }
                if (missingSummary.length > 0) {
                  setCompanyInputErrors(nextCompanyErrors);
                  setCompanySummaryErrors(missingSummary);
                  if (firstInvalidField) {
                    const el = document.getElementById(firstInvalidField);
                    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    (el as HTMLInputElement | null)?.focus({ preventScroll: true });
                  }
                  throw new Error('validation');
                }
                setCompanySummaryErrors([]);


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
                  items: items.map((item, index) => {
                    const input = companyInputs[index];
                    return {
                      productSlug: item.productSlug,
                      companySlug: item.companySlug,
                      companyName: input?.companyName.trim() || item.companyName,
                      companyNumber: input?.companyNumber.trim() || item.companyNumber,
                      quantity: item.quantity,
                    };
                  }),
                };
                const result = useAuthenticated
                  ? await placeOrderAsUser({ data: orderPayload })
                  : await placeOrder({ data: orderPayload });
                clear();
                setPlaced(result);
                // Open Stripe embedded checkout immediately.
                try {
                  await startStripe({ data: { reference: result.reference, token: result.token } });
                  openCheckout(result);
                } catch (paymentError) {
                  setError({
                    message:
                      paymentError instanceof Error
                        ? `Your order ${result.reference} was saved, but we could not open the payment form: ${paymentError.message}`
                        : `Your order ${result.reference} was saved, but we could not open the payment form.`,
                  });
                }
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


            {itemsNeedingCompany.length > 0 && (
              <div className='mb-8 space-y-4'>
                <h2 className='font-display text-lg font-semibold'>Company details</h2>
                <p className='text-sm text-muted-foreground'>
                  These items are company-specific. Please tell us which Cyprus company each certificate or report is for.
                </p>

                {companySummaryErrors.length > 0 && (
                  <Alert variant='destructive' role='alert' aria-live='assertive'>
                    <AlertCircle className='size-4' />
                    <AlertTitle>
                      {companySummaryErrors.length === 1
                        ? 'One company detail still needs your attention'
                        : `${companySummaryErrors.length} company details still need your attention`}
                    </AlertTitle>
                    <AlertDescription>
                      <ul className='mt-1 list-disc space-y-1 pl-4'>
                        {companySummaryErrors.map((message) => (
                          <li key={message}>{message}</li>
                        ))}
                      </ul>
                      <p className='mt-2'>
                        Fix the highlighted fields below, then continue to secure payment. Nothing is charged until the
                        details are complete.
                      </p>
                    </AlertDescription>
                  </Alert>
                )}

                <div className='space-y-4'>
                  {itemsNeedingCompany.map(({ item, index, product }) => (
                    <div key={`${item.productSlug}-${index}`} className='rounded-lg border bg-muted/30 p-4'>
                      <h3 className='text-sm font-medium'>{product?.name ?? 'Product'}</h3>
                      <div className='mt-3 grid gap-4 sm:grid-cols-2'>
                        <label htmlFor={`company-name-${index}`}>
                          <span className='text-sm font-medium'>
                            Company name <span className='text-destructive'>*</span>
                          </span>
                          <input
                            id={`company-name-${index}`}
                            type='text'
                            value={companyInputs[index]?.companyName ?? ''}
                            onChange={(e) => {
                              setCompanyInputs((prev) => {
                                const existing = prev[index] ?? { companyName: '', companyNumber: '' };
                                return { ...prev, [index]: { ...existing, companyName: e.target.value } };
                              });
                              setCompanyInputErrors((prev) => {
                                const existing = prev[index] ?? {};
                                return { ...prev, [index]: { ...existing, companyName: undefined } };
                              });
                              setCompanySummaryErrors([]);
                            }}
                            placeholder='e.g. ABC Holdings Ltd'
                            aria-required='true'
                            aria-invalid={!!companyInputErrors[index]?.companyName}
                            aria-describedby={
                              companyInputErrors[index]?.companyName
                                ? `company-name-error-${index}`
                                : `company-name-hint-${index}`
                            }
                            className={cn(
                              'mt-1.5 h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-ring',
                              companyInputErrors[index]?.companyName && 'border-destructive focus:border-destructive',
                            )}
                          />
                          {companyInputErrors[index]?.companyName ? (
                            <span
                              id={`company-name-error-${index}`}
                              className='mt-1 flex items-start gap-1 text-xs text-destructive'
                            >
                              <AlertCircle className='mt-0.5 size-3 shrink-0' />
                              {companyInputErrors[index]?.companyName}
                            </span>
                          ) : (
                            <span id={`company-name-hint-${index}`} className='mt-1 block text-xs text-muted-foreground'>
                              Use the full registered name, including Ltd or Limited.
                            </span>
                          )}
                        </label>
                        <label htmlFor={`company-number-${index}`}>
                          <span className='text-sm font-medium'>
                            Registration number <span className='text-destructive'>*</span>
                          </span>
                          <input
                            id={`company-number-${index}`}
                            type='text'
                            value={companyInputs[index]?.companyNumber ?? ''}
                            onChange={(e) => {
                              setCompanyInputs((prev) => {
                                const existing = prev[index] ?? { companyName: '', companyNumber: '' };
                                return { ...prev, [index]: { ...existing, companyNumber: e.target.value } };
                              });
                              setCompanyInputErrors((prev) => {
                                const existing = prev[index] ?? {};
                                return { ...prev, [index]: { ...existing, companyNumber: undefined } };
                              });
                              setCompanySummaryErrors([]);
                            }}
                            placeholder='e.g. HE 252407'
                            aria-required='true'
                            aria-invalid={!!companyInputErrors[index]?.companyNumber}
                            aria-describedby={
                              companyInputErrors[index]?.companyNumber
                                ? `company-number-error-${index}`
                                : `company-number-hint-${index}`
                            }
                            className={cn(
                              'mt-1.5 h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-ring',
                              companyInputErrors[index]?.companyNumber && 'border-destructive focus:border-destructive',
                            )}
                          />
                          {companyInputErrors[index]?.companyNumber ? (
                            <span
                              id={`company-number-error-${index}`}
                              className='mt-1 flex items-start gap-1 text-xs text-destructive'
                            >
                              <AlertCircle className='mt-0.5 size-3 shrink-0' />
                              {companyInputErrors[index]?.companyNumber}
                            </span>
                          ) : (
                            <span
                              id={`company-number-hint-${index}`}
                              className='mt-1 block text-xs text-muted-foreground'
                            >
                              Registrar number such as HE 252407, C 409882 or EE 1234.{' '}
                              <Link to='/search' search={{ q: '', page: 1 }} className='underline'>
                                Look it up
                              </Link>
                            </span>
                          )}
                        </label>
                      </div>
                    </div>
                  ))}
                </div>

              </div>
            )}

            <h2 className='font-display text-lg font-semibold'>Your details</h2>
            <div className='mt-6 grid gap-4 sm:grid-cols-2'>
              {FIELDS.map((field) => {
                const errorText = field.name === 'email' ? fieldErrors.email : undefined;
                const prefill = profile[field.name];
                const locked = field.name === 'email' && !!prefill;
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
                      {...(prefill ? { key: prefill, defaultValue: prefill } : {})}
                      {...(locked ? { readOnly: true } : {})}
                      onChange={() => {
                        if (errorText) {
                          setFieldErrors((prev) => ({ ...prev, email: undefined }));
                        }
                      }}
                      className={cn(
                        'mt-1.5 h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-ring',
                        locked && 'bg-muted/40 text-muted-foreground',
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
                <p className='mt-3 border-t border-copper/20 pt-3 text-xs text-muted-foreground'>
                  Already have an account?{' '}
                  <Link
                    to='/auth'
                    search={{ redirect: '/checkout' }}
                    className='font-semibold text-copper underline underline-offset-2'
                  >
                    Sign in
                  </Link>{' '}
                  to link this order to your client portal.
                </p>

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
                      {password && (
                        <div className='mt-2'>
                          <div className='flex items-center gap-2'>
                            <div className='flex h-1.5 flex-1 gap-1'>
                              {[1, 2, 3, 4].map((i) => (
                                <span
                                  key={i}
                                  className={cn(
                                    'h-full flex-1 rounded-full',
                                    i <= passwordStrength(password).score ? passwordStrength(password).tone : 'bg-muted',
                                  )}
                                />
                              ))}
                            </div>
                            <span className='text-xs font-medium text-muted-foreground'>
                              {passwordStrength(password).label}
                            </span>
                          </div>
                          <ul className='mt-2 space-y-1'>
                            {PASSWORD_RULES.map((rule) => {
                              const ok = rule.test(password);
                              return (
                                <li
                                  key={rule.label}
                                  className={cn('flex items-center gap-1.5 text-xs', ok ? 'text-emerald-600' : 'text-muted-foreground')}
                                >
                                  <span aria-hidden>{ok ? '✓' : '•'}</span>
                                  {rule.label}
                                </li>
                              );
                            })}
                          </ul>
                        </div>
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
                        aria-invalid={!!fieldErrors.confirmPassword || (!!confirmPassword && confirmPassword !== password)}
                        className={cn(
                          'mt-1.5 h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-ring',
                          (fieldErrors.confirmPassword || (!!confirmPassword && confirmPassword !== password)) &&
                            'border-destructive focus:border-destructive',
                        )}
                      />
                      {fieldErrors.confirmPassword ? (
                        <span className='mt-1 block text-xs text-destructive'>{fieldErrors.confirmPassword}</span>
                      ) : confirmPassword && confirmPassword !== password ? (
                        <span className='mt-1 block text-xs text-destructive'>Passwords do not match.</span>
                      ) : confirmPassword && confirmPassword === password ? (
                        <span className='mt-1 block text-xs text-emerald-600'>Passwords match.</span>
                      ) : null}
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
              {submitting ? 'Opening secure payment…' : 'Continue to secure payment'}
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
              {items.map((item, index) => {
                const product = PRODUCTS_BY_SLUG[item.productSlug];
                if (!product) return null;
                const breakdown = priceBreakdown(product, item.quantity);
                const effectiveName = item.companyName ?? companyInputs[index]?.companyName;
                const effectiveNumber = item.companyNumber ?? companyInputs[index]?.companyNumber;
                return (
                  <li key={`${item.productSlug}-${index}`} className='flex justify-between gap-4'>
                    <span>
                      {product.name}
                      {item.quantity > 1 ? ` × ${item.quantity}` : ''}
                      <span className='block text-xs text-muted-foreground'>
                        {effectiveName ?? 'Company confirmed at checkout'}
                        {effectiveNumber && (
                          <span className='ml-1 text-muted-foreground/70'>· {effectiveNumber}</span>
                        )}
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
                <dt className='text-muted-foreground'>VAT ({Math.round(VAT_RATE * 100)}%) — reports &amp; service fee</dt>
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
