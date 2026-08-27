# Add a "Support agent" access level

Today there are only two effective rights: full **admin** (everything, including user management, registry imports, sanctions ingestion and API settings) and **client** (customer portal only). This adds a middle tier so support staff can help customers without touching the sensitive areas.

## Access levels after this change

| Area | Admin | Support agent | Client |
| --- | --- | --- | --- |
| Orders list, order detail, documents | Yes | Yes | Own orders only |
| Deliver/resend documents, customer emails log | Yes | Yes | No |
| Admin dashboard KPIs | Yes | Yes (order/delivery metrics) | No |
| Users & role assignment | Yes | No | No |
| Registry imports, sitemap/IndexNow, usage | Yes | No | No |
| Sanctions data ingestion & screening workbench | Yes | No | No |
| API4ALL settings | Yes | No | No |

## Rules

- Only full admins can grant or revoke roles.
- The last remaining admin cannot have their admin right removed (self-demotion guard, enforced server-side).
- New sign-ups keep becoming clients automatically; support agent is granted manually.

## Technical outline

1. **Database migration**
   - Add `support` to the `app_role` enum.
   - Add `public.is_support_or_admin(_user_id uuid)` security-definer helper alongside the existing `is_admin`.
   - Update the RLS policies that currently key off `is_admin` for order/order item/order document/email log reads so support agents are included; leave imports, sanctions, screening and job-state policies admin-only.

2. **Server guards** (`src/lib/admin.server.ts`)
   - Add `assertSupport(userId)` (passes for admin or support) and keep `assertAdmin` for privileged areas.
   - Order/email/document server functions switch to `assertSupport`; import, sanctions, screening, API4ALL, users stay on `assertAdmin`.
   - `updateUserRole` gains: admin-only check, support role support, and a guard rejecting removal of the last admin.

3. **Client-side navigation and gating**
   - Extend the current role hook/context to expose `isAdmin` and `isSupport`.
   - `src/routes/_authenticated/admin.tsx` shell: hide nav entries the role cannot use; admin-only routes render an "insufficient access" panel instead of the page.
   - `admin.users.tsx`: add a "Make support / Revoke support" action, a `support` badge, and disable admin toggle on the last admin.

4. **Verification** — typecheck, then sign in as a support-role account in the preview and confirm orders load while `/admin/users` and `/admin/sanctions-data` are blocked.
