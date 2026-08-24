# Start collecting payments with built-in Stripe

## Context
- Built-in Stripe payments have been enabled for this project (sandbox/test mode ready; live requires go-live).
- The project already has a full order system (`orders` and `order_items` tables, admin dashboard, API4ALL fulfillment) wired to a custom Revolut flow.
- This plan replaces the Revolut payment path with Lovable's built-in Stripe Embedded Checkout while preserving the existing order, fulfillment, and tracking flow.

## What we will build

1. **Stripe product catalog**
   - Create one Stripe product + price for every item in `PRODUCTS` (`src/lib/products.ts`).
   - Use the existing slugs as human-readable price IDs (e.g. `certificate-of-good-standing`).
   - Add a separate service-fee product (`certificate-service-fee`, €50) for per-certificate handling fees.
   - Set tax codes on every product for digital goods / electronic services so Stripe handles tax correctly.

2. **Shared Stripe utilities**
   - `src/lib/stripe.server.ts`: gateway-aware Stripe client, error helper, and webhook signature verifier.
   - `src/lib/stripe.ts`: client-side `loadStripe` and environment derivation from `VITE_PAYMENTS_CLIENT_TOKEN`.

3. **Checkout server function**
   - `src/lib/payments.functions.ts`: `createStripeCheckoutSession`.
   - Accepts `orderId` and `environment`, loads the order and its items, creates line items for products + service fees, and returns a `clientSecret`.
   - Uses Embedded Checkout (`ui_mode: "embedded_page"`), `return_url` for post-payment, and `managed_payments: { enabled: true }` because Cyprus is a supported seller country and the catalog is digital-only.

4. **Stripe webhook handler**
   - `src/routes/api/public/payments/webhook.ts`.
   - Verifies Stripe signature, reads `?env=sandbox|live`.
   - On `checkout.session.completed` with `payment_status` in `paid`/`no_payment_required`, finds the order by session metadata and calls `markOrderPaid`, which auto-fulfills API4ALL items.
   - Handles `checkout.session.async_payment_succeeded` and `checkout.session.async_payment_failed` for delayed payment methods.

5. **Checkout UI update**
   - Update `src/routes/checkout.tsx` to create the order, then render the Stripe Embedded Checkout inline instead of redirecting to Revolut.
   - Keep the existing order summary panel.
   - Add `PaymentTestModeBanner` to the layout.

6. **Return page**
   - Create `src/routes/checkout/return.tsx` for the `return_url` Stripe redirects to after payment.
   - Shows payment status and links to the order tracking page.

7. **Order payment bridge**
   - Add `startStripePayment` to `src/lib/orders.functions.ts` and keep the existing order-fetch functions intact.
   - Update `src/routes/order.$reference.tsx` so the "Pay now" path uses Stripe embedded checkout for `awaiting_payment` orders.

8. **Verification**
   - Typecheck with `tsgo`.
   - Smoke-test the checkout page in the preview.
   - Verify the webhook handler responds 200 to valid test events.

## Out of scope
- Removing the legacy Revolut files (`src/lib/revolut.server.ts`, `src/routes/api/public/revolut-webhook.ts`) — they are kept as fallback/manual option and can be deleted later.
- Live go-live onboarding; this plan focuses on the test integration.
- Refactoring the product catalog itself; prices and names stay as defined in `src/lib/products.ts`.

## Risks and notes
- The existing cart computes a 19% VAT and a €50 per-certificate service fee client-side. Stripe will now calculate and collect tax (including VAT) automatically. We will still store the pre-Stripe breakdown in the order for internal accounting, but the actual charge will be Stripe's total.
- `managed_payments` adds +3.5% per transaction and makes the bank-statement descriptor `LINK.COM* ...`. This is the simplest path for a Cyprus-based seller of digital products and can be changed per transaction later.
