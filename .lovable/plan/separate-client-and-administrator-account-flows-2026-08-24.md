# Separate client and administrator account flows

## Confirmed cause

The shared sign-in page currently sends every existing session and every successful sign-in to `/admin/import`, regardless of role. The `/admin/import` page then checks the role and shows “Admin access required” to client accounts. Other admin pages rely on protected server functions but do not share one route-level administrator gate.

## Changes

1. **Route users to the correct destination after sign-in**
   - Resolve the signed-in user’s role after authentication.
   - Send administrators to `/admin/orders` and client-only accounts to `/account/orders`.
   - Apply the same role-aware redirect when an already signed-in user opens `/auth`.
   - Change account-confirmation/signup return handling so new client accounts do not land on an admin URL.

2. **Add one shared administrator route gate**
   - Add a parent layout for all `/admin/*` pages that checks the authenticated user’s administrator role before rendering child content.
   - Redirect signed-in non-admin users directly to `/account/orders` instead of rendering an admin error screen.
   - Keep every existing server-side `assertAdmin` check in place so admin data and actions remain protected even when called directly.

3. **Keep navigation role-specific**
   - Clients continue to see “My orders” and never see admin navigation.
   - Administrators keep the Admin entry point and may also access their own orders.
   - Replace the import page’s local role/error gate with the shared parent gate, while preserving the one-time first-admin bootstrap only if it is still required.

4. **Validate both flows**
   - Add focused tests for destination selection: admin → admin dashboard, client → client portal, guest → sign-in.
   - Verify direct client access to every `/admin/*` route redirects to `/account/orders` without flashing admin content or issuing admin data requests.
   - Verify administrators can still open Orders, Users, Usage, Import, and API4ALL pages.

## Technical notes

- The existing `_authenticated` layout remains responsible for requiring a valid session.
- The new nested admin layout handles role authorization before child admin pages render.
- Role checks remain database-backed; no role decision will be stored in local or session storage.
