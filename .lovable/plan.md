# Apostille follow-up order + payment link

Eduard Vojtek (vojtek@themisas.cz) confirmed he wants the Apostille for order **CHC-9Y00LG-F749** (Certificate of Shareholders, ADRANUS INVESTMENTS LIMITED · HE327816). That order is already paid and delivered with `apostille = false`, so the add-on must be billed as a new, separate order.

## What gets built

1. **Apostille add-on product**
   A standalone catalogue item "Apostille certification" at EUR 100 + 19% VAT (EUR 119 total), no extra service fee. It is used only for follow-up orders, not shown in the public product grid.

2. **Admin action: raise a follow-up apostille order**
   On `/admin/orders`, each delivered/paid order gets a "Bill apostille" action. It:
   - creates a new order for the same customer (name, email, firm, VAT number) referencing the original order and its certificate/company,
   - status `awaiting_payment`, with its own reference and access token,
   - one line item: Apostille certification x N (default 1, editable),
   - shows the new reference and the payment link back in the admin UI.

3. **Payment-request email**
   A new app-email template ("Payment request") sent to the customer with: what it covers, the amount breakdown (EUR 100 + EUR 19 VAT = EUR 119), the original order reference, and a button to the order/pay page. Sent automatically when the follow-up order is created; a "resend" action is available.

4. **Payment**
   The customer pays through the existing Stripe embedded checkout on the order page — no new payment path. When paid, the order flips to paid exactly like any other order, and the team completes the apostille and delivers the document against that order.

## Immediate action for this customer

After the above ships, raise the apostille order for CHC-9Y00LG-F749 and send Eduard the payment link and reference; the emailed invoice/receipt comes from the existing payment receipt email once he pays.

## Technical notes

- `src/lib/products.ts`: add `apostille-certification` (category `service`, price 100, `vatablePrice` 100, hidden from public listings).
- `src/lib/orders.server.ts`: add `createFollowUpApostilleOrder({ sourceReference, quantity })` reusing `placeOrder`'s pricing/insert path, copying customer fields from the source order and storing the source reference in `notes`.
- `src/lib/orders.functions.ts`: admin-only server fns (`assertSupport`) `adminCreateApostilleOrder` and `adminResendPaymentRequest`.
- `src/lib/email-templates/payment-request.tsx` + registry entry; sent via `sendTemplateEmail` with an idempotency key derived from the new order id.
- `src/routes/_authenticated/admin.orders.tsx`: action button, quantity prompt, and display of the resulting reference/payment link.
- Roadmap: add "apostille follow-up billing" as a task in `roadmap.md` when implementation starts.
