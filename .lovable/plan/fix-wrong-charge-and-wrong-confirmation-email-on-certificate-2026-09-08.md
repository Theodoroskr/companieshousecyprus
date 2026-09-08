# Fix wrong charge and wrong confirmation email on certificate orders

## What went wrong on order CHC-S6BS4C-9F81

Two Certificates at €40 + €50 service fee + €9.50 VAT = €99.50 each, so the order should be €199.00.

- The order record stored €214.20 — VAT was applied to the certificate price as well, which is wrong: certificates are outside VAT, only the service fee, apostille and report content are taxable.
- The card payment took €180.00 with no VAT at all — the payment only carried the document and fee amounts, and no VAT was ever added.
- The email then mixed the two sources: it showed the amount actually charged as "Documents", our own €100 service fee underneath it, VAT €0 and a total lower than the parts. Hence the nonsense figures.

Per the decision taken: this customer's order is left as it is (no extra billing, no corrective email). The work below prevents it happening again.

## Fixes

1. **One source of truth for order totals**
   Order totals are summed from the per-item breakdown (which already applies VAT only to the taxable parts) instead of re-applying a flat 19% over everything. The order total will then always equal the sum of the line items — €199.00 in this example.

2. **VAT actually charged on the card**
   The payment will carry a separate 19% VAT line covering only the taxable components (service fee, apostille, report content). Certificate amounts stay VAT-free. The amount charged will match the order total and the email exactly.

3. **Consistent emails and order page**
   Confirmation and receipt figures will come from one consistent set of numbers. If the amount charged ever differs from the calculated order, the email shows the amount actually charged as the total and never blends the two, so the lines always add up.

4. **A guard against silent mismatches**
   Before a payment is created, the order total is checked against the sum of its lines; a mismatch is logged and blocked rather than charged. A test covers the certificate case (2 × €99.50 = €199.00, VAT €19.00) and a mixed basket with a report and an apostille.

## Technical notes

- `src/lib/orders.server.ts`: replace the flat `vat = (subtotal + serviceFee + apostilleFee) * 0.19` with sums of `row.breakdown.vat` / `.total`; same for the follow-up payment-request path if it repeats the pattern.
- `src/lib/payments.functions.ts`: line items currently resolve only product and fee prices, and `managed_payments` is producing a zero-tax session for these prices. Build the session from the order's own breakdown: product price, `certificate-service-fee`, apostille where set, plus an explicit VAT line (`price_data`, tax code `txcd_10103001`) equal to the order's stored VAT. Drop `managed_payments`/automatic tax for these sessions so Stripe does not double-handle VAT; the charged total then equals `orders.total_cents`.
- `src/lib/order-emails.server.ts`: `totals()` currently mixes `charged_*` values with locally stored `service_fee_cents`. Use either the full charged set or the full local set, never a mix.
- Verify with `tsgo`, the order pricing tests, and a preview checkout that ends at the correct total.

## Out of scope

- Any refund, extra charge or corrected email to Youval Rasin.
- Changing prices, the €50 service fee or the 19% VAT rate.
