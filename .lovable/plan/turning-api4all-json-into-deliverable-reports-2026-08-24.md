# Turning API4ALL JSON into deliverable reports

The reports API4ALL returns are structured JSON already stored against each order item. Today the client can only download that raw JSON file. This plan turns each report into a branded, readable report page plus a PDF download, released to the client only after an admin reviews it.

## What the reports contain

Confirmed from the delivered reports in the database:

- Both kinds: `GeneralInfo`, `Identifiers`, `Names`, `Activities`, `Administrators`, `Shareholders`, `Capitals`, `MortgagesCharges`, `Representations`, `Branches` / `BranchParent`, `ChamberInfo`, `MoreInfo`
- Credit report adds: `ICGScoring`, `KeyRatios`, `StatementOfFinancialPosition`, `StatementOfProfitAndLoss`, `Negatives`, `ParentCompany`, `Subsidiaries`, `Affiliates`, `UltimateBeneficialOwner`, `CorporateStructureDetrimental`
- Envelope: `ICGId`, `Company` (array), `GeneratedAt`

## What gets built

**1. Report renderer (shared)**
A typed parser that normalises the API4ALL envelope into a section model, plus presentation components: company header (name, registry number, status, incorporation), then sections for identifiers, activities, officers, shareholders and UBO, capital, charges, group structure. Credit reports additionally render the ICG score band, key ratios, and the financial statements as year-over-year tables. Empty sections are hidden, values formatted with the existing date/number helpers, Greek/Latin names handled the same way as company pages.

**2. Client report page**
`/account/reports/$itemId` — server-side loaded, access limited to the order owner (and the guest order token for the guest tracking page). Shows the rendered report with a "Download PDF" action. The portal and guest order page link here instead of offering the raw JSON. Raw JSON stays available to admins only.

**3. PDF**
A print-optimised layout of the same renderer (A4 page rules, page-break control, logo header, order reference and generation timestamp footer) so "Download PDF" uses the browser print-to-PDF path — no server rendering engine, consistent with the styling we already have.

**4. Admin review and release**
- Fetched reports land as `awaiting_review` instead of `delivered`; the client sees "In preparation" and no email goes out yet.
- Admin order page gains a "Review report" link opening the same rendered report with a raw-JSON toggle, plus **Release to client** and **Reject / refetch** actions.
- Release sets the item delivered, stamps the delivery date, and sends the existing document-ready email (which will link to the report page).
- The dashboard gets an "Awaiting review" count linking to that filtered view.

## Technical notes

- Migration: extend the fulfilment status vocabulary with `awaiting_review`; add `released_at` and `released_by` to `order_items`. No change to `report_json` — the raw payload stays as the source of truth so renderers can improve without refetching.
- Parser and components live in `src/lib/reports/` (pure, unit-tested against the two stored samples: one structure, one credit) and `src/components/report/`.
- Auto-delivery in `src/lib/orders.server.ts` and `src/lib/a4a-jobs.server.ts` (`deliverReport`) switches to storing + `awaiting_review`; the delivery email moves behind a new `releaseOrderItemReport` server function guarded by the admin check.
- Client access goes through a server function that verifies ownership (`user_id`/`email`) or the order access token, so report JSON is never exposed to unauthorised callers.
- SEO/head: report routes are private, `noindex`.

## Out of scope

Rewriting certificate (upload-based) fulfilment, or changing pricing/checkout.
