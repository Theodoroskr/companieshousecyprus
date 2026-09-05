# Admin Monitoring Control Module

A new back-office page where admin and support staff can oversee all customer monitoring plans — not just their own.

## New page: `/admin/monitoring`

Linked from the admin navigation, gated by the existing admin layout (support and admin roles).

**Overview cards**
- Active plans, total watched companies, free slots across all plans
- Plans expiring within 30 days (renewal opportunities)
- Watches stopped or expired, alerts sent in the last 30 days, failed alert sends

**Plans table**
- Customer email, status, cover end date, companies watched / limit
- Alerts sent, last change detected
- Actions: extend plan manually, cancel plan, view customer detail

**Watched companies table (filterable by plan/customer)**
- Company name + number, owner, status, last check result, last change date
- Actions: force a re-check, stop watching on behalf of the customer

**Alerts log**
- Date, customer, company, what changed (status/officers/address/name), delivery status
- Filter by delivery state; resend a failed alert

## Backend

- New admin-scoped server functions in `src/lib/monitoring.functions.ts` guarded by `requireSupabaseAuth` + the existing `is_support_or_admin` role check:
  - `adminMonitoringOverview` — counts and expiring plans
  - `adminListEntitlements` — all plans with watch usage
  - `adminListWatches` — all watches with company + customer info
  - `adminListAlerts` — recent alerts with delivery status
  - `adminExtendEntitlement` / `adminCancelEntitlement` / `adminStopWatch` / `adminTriggerCheck` — support actions, each writing to `monitoring_alerts` or an audit note where applicable
- All mutations reuse the service-role admin client only after role verification, per project conventions.

## Technical notes

- Read-only queries go through the authenticated Supabase client with existing RLS (support/admin policies already cover monitoring tables).
- No database schema changes expected — all data already exists in `monitoring_entitlements`, `company_watches`, `monitoring_alerts`.
- Manual "trigger check" calls the same per-company diff logic used by the daily cron (`src/lib/monitoring.server.ts`), so results are identical.
- Typecheck + a quick preview sign-in check on the new page before handover.
