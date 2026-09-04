# New product ideas for Companies House Cyprus

## Goal
Expand the product catalogue with offerings that reuse existing registry data and order infrastructure, prioritised by revenue potential and effort.

## Proposed products (prioritised)

### Phase 1 — build now
1. **Company Monitoring subscription (€99/year)**
   - Watch a company; email alert on status change, director/secretary change, address change, strike-off.
   - Reuses the existing change-feed data and email system.
   - Recurring revenue; strongest differentiator vs competitors.
2. **Certified translation add-on (€90)**
   - Hidden/internal product like the apostille add-on: admin bills it from an order, customer pays online.
   - Already offered "on request" — just makes it orderable.

### Phase 2 — next
3. **Charges & Mortgages Certificate (€40)** — Registrar-certified list of registered charges; frequently requested by banks.
4. **Complete Certificate Pack (€260)** — all 8 Registrar certificates in one indexed bundle for notaries/M&A.
5. **Historical Company Report (€95)** — previous names, officers, addresses and filings over time.

### Phase 3 — later / lead generation
6. **Free name-availability check** — public tool, feeds the company-formation enquiry form (SEO + leads).
7. **Bulk new-registrations data feed (B2B, priced on enquiry)** — monthly export for CRM/lead-gen firms.

## Technical notes
- Phase 1 monitoring needs: `company_watchers` table (with GRANTs + RLS), a checker job on the existing cron worker comparing the change feed, alert email template, account page section to manage watched companies, and a Stripe subscription/one-off product via the existing payments sync.
- Translation add-on follows the exact pattern of the existing internal `apostille-certification` product (hidden product, admin "Bill translation" action, payment-request email).
- Each product entry goes in `src/lib/products.ts` with tax code `txcd_10103001`, then synced via /admin/products.

## Step for this change
Confirm which products to build. Recommendation: Phase 1 (Monitoring + translation add-on).
