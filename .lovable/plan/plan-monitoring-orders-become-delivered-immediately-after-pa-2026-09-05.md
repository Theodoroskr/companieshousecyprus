# Plan: Monitoring orders become "delivered" immediately after payment

## What happens today
- When a payment completes, `markOrderPaid()` sets the order to **paid**, sends the confirmation/receipt emails, and fulfils each item.
- Monitoring items are already fulfilled instantly: `createEntitlementsForOrder()` / `renewEntitlementsForOrder()` create the active plan, auto-watch the company (when bought from a company page) and mark the **item** as delivered.
- The gap: the **order** status never advances to **delivered**. The "all items delivered → order delivered" roll-up only exists in the API4ALL report path, so a monitoring-only order sits at "paid" forever in the client portal and admin.

## What we'll build
1. **Auto-deliver monitoring orders on payment** (`src/lib/orders.server.ts`)
   - After the monitoring entitlement/renewal step inside `markOrderPaid()`, re-read the order's items.
   - If every item's fulfilment status is `delivered`, update the order: `status = "delivered"`, set `delivered_at` (once), and send the existing delivery notification email (`notifyOrderDelivered`) so the customer gets the "your order is complete" message with their monitoring active.
   - Mixed baskets (monitoring + a certificate) stay `paid` until the remaining items are delivered by the normal flows — nothing premature.

2. **Edge cases covered**
   - Entitlement creation failure: item is already marked `failed`, so the order is not auto-delivered (existing behaviour kept).
   - Renewal orders: same roll-up applies after `renewEntitlementsForOrder()`.
   - Revolut + Stripe payment paths both call `markOrderPaid()`, so this works for every payment method without touching the webhooks.

3. **Verification**
   - Typecheck, then a code-path review that a paid monitoring order ends `delivered` with `delivered_at` set and the delivery email sent.

No database changes needed.
