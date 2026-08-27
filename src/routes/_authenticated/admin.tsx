import { createFileRoute, Link, Outlet, redirect, useRouterState } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

/** `support: true` marks areas support agents may use; everything else is admin-only. */
const ADMIN_LINKS = [
  { to: "/admin", label: "Dashboard", support: true },
  { to: "/admin/orders", label: "Orders", support: true },

  { to: "/admin/import", label: "Imports", support: false },
  { to: "/admin/sanctions-data", label: "Sanctions data", support: false },
  { to: "/admin/screening", label: "Screening test", support: false },
  { to: "/admin/api4all", label: "API4ALL", support: false },
  { to: "/admin/users", label: "Users", support: false },
  { to: "/admin/usage", label: "Usage", support: false },
  { to: "/admin/emails", label: "Emails", support: true },
  { to: "/admin/sitemap", label: "Sitemap", support: false },
] as const;

const SUPPORT_ALLOWED_PREFIXES = ["/admin/orders", "/admin/emails", "/admin/reports"];

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async ({ context }) => {
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.user.id)
      .in("role", ["admin", "support"]);

    const roles = (data ?? []).map((r) => String(r.role));
    if (error || roles.length === 0) {
      throw redirect({ to: "/account/orders", replace: true });
    }
    return { isAdmin: roles.includes("admin"), isSupportOnly: !roles.includes("admin") };
  },
  component: AdminLayout,
});

function AdminLayout() {
  const { isAdmin, isSupportOnly } = Route.useRouteContext();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const links = ADMIN_LINKS.filter((link) => isAdmin || link.support);
  const blocked =
    isSupportOnly &&
    pathname !== "/admin" &&
    !SUPPORT_ALLOWED_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  return (
    <div>
      <nav className="border-b bg-muted/40">
        <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 py-2">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="shrink-0 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
              activeProps={{ className: "shrink-0 rounded-md px-3 py-1.5 text-sm font-semibold bg-background text-copper shadow-sm" }}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </nav>
      {blocked ? (
        <div className="mx-auto max-w-2xl px-4 py-20 text-center">
          <ShieldAlert className="mx-auto size-8 text-muted-foreground" />
          <h1 className="mt-4 font-display text-xl font-bold">Insufficient access</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This area is restricted to administrators. Support agents can work on orders, deliveries and customer
            emails.
          </p>
          <Link
            to="/admin/orders"
            className="mt-6 inline-flex rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            Go to orders
          </Link>
        </div>
      ) : (
        <Outlet />
      )}
    </div>
  );
}
