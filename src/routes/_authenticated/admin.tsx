import { createFileRoute, Link, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

const ADMIN_LINKS = [
  { to: "/admin", label: "Dashboard" },
  { to: "/admin/orders", label: "Orders" },

  { to: "/admin/import", label: "Imports" },
  { to: "/admin/sanctions-data", label: "Sanctions data" },
  { to: "/admin/screening", label: "Screening test" },
  { to: "/admin/api4all", label: "API4ALL" },
  { to: "/admin/users", label: "Users" },
  { to: "/admin/usage", label: "Usage" },
  { to: "/admin/emails", label: "Emails" },
  { to: "/admin/sitemap", label: "Sitemap" },
] as const;

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async ({ context }) => {
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (error || !data) {
      throw redirect({ to: "/account/orders", replace: true });
    }
  },
  component: AdminLayout,
});

function AdminLayout() {
  return (
    <div>
      <nav className="border-b bg-muted/40">
        <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 py-2">
          {ADMIN_LINKS.map((link) => (
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
      <Outlet />
    </div>
  );
}
