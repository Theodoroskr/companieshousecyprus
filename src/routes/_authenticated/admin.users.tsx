import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LifeBuoy, Loader2, RefreshCw, ShieldCheck, UserRound } from "lucide-react";
import { listUsers, updateUserRole } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/admin/users")({
  head: () => ({
    meta: [
      { title: "Users — Admin" },
      { name: "description", content: "Manage administrator and client access for Companies House Cyprus accounts." },
      { property: "og:title", content: "Users — Admin" },
      { property: "og:description", content: "Manage administrator and client access for accounts." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminUsersPage,
});

type RoleFilter = "all" | "admin" | "support" | "client" | "none";

const ROLE_FILTERS: { key: RoleFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "admin", label: "Admins" },
  { key: "support", label: "Support" },
  { key: "client", label: "Clients" },
  { key: "none", label: "No role" },
];

function AdminUsersPage() {
  const list = useServerFn(listUsers);
  const setRole = useServerFn(updateUserRole);
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");

  const query = useQuery({ queryKey: ["admin", "users"], queryFn: () => list() });

  const mutation = useMutation({
    mutationFn: (input: { userId: string; role: "admin" | "client" | "support"; grant: boolean }) =>
      setRole({ data: input }),
    onSuccess: (_r, input) => {
      setError(null);
      setMessage(`${input.grant ? "Granted" : "Revoked"} ${input.role} access.`);
      void queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
    onError: (err) => {
      setMessage(null);
      setError(err instanceof Error ? err.message : "Could not update the role");
    },
  });

  const allUsers = query.data ?? [];
  const adminCount = allUsers.filter((u) => u.roles.includes("admin")).length;
  const roleCounts: Record<RoleFilter, number> = {
    all: allUsers.length,
    admin: adminCount,
    support: allUsers.filter((u) => u.roles.includes("support")).length,
    client: allUsers.filter((u) => u.roles.includes("client")).length,
    none: allUsers.filter((u) => u.roles.length === 0).length,
  };
  const term = search.trim().toLowerCase();
  const users = allUsers.filter((u) => {
    if (roleFilter === "none" ? u.roles.length > 0 : roleFilter !== "all" && !u.roles.includes(roleFilter)) {
      return false;
    }
    return term ? u.email.toLowerCase().includes(term) : true;
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Users</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Grant or revoke access. <strong>Admin</strong> sees everything; <strong>support</strong> can work on
            orders, deliveries and customer emails only; <strong>client</strong> is portal access. New sign-ups become
            clients automatically.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/admin/orders">Orders</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/admin/usage">Usage</Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void queryClient.invalidateQueries({ queryKey: ["admin", "users"] })}
          >
            <RefreshCw className="size-4" /> Refresh
          </Button>
        </div>
      </div>

      {message && <p className="mt-4 rounded-md border bg-card p-3 text-sm">{message}</p>}
      {error && (
        <p className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter by email…"
          className="w-full max-w-sm rounded-md border bg-background px-3 py-2 text-sm"
        />
        <div className="flex flex-wrap gap-1.5">
          {ROLE_FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setRoleFilter(f.key)}
              className={
                roleFilter === f.key
                  ? "rounded-full border border-copper/50 bg-copper/10 px-3 py-1 text-xs font-semibold text-copper"
                  : "rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted"
              }
            >
              {f.label}
              <span className="ml-1 tabular-nums opacity-70">{roleCounts[f.key]}</span>
            </button>
          ))}
        </div>
        {(roleFilter !== "all" || term) && (
          <p className="text-xs text-muted-foreground">
            {users.length} of {allUsers.length} accounts
          </p>
        )}
      </div>

      {query.isLoading && (
        <p className="mt-10 flex items-center gap-2 text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading accounts…
        </p>
      )}

      {query.isError && (
        <p className="mt-10 text-sm text-destructive">
          {query.error instanceof Error ? query.error.message : "Could not load accounts"}
        </p>
      )}

      <div className="mt-6 overflow-x-auto rounded-xl border bg-card shadow-panel">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Account</th>
              <th className="px-4 py-3">Roles</th>
              <th className="px-4 py-3">Orders</th>
              <th className="px-4 py-3">Last sign-in</th>
              <th className="px-4 py-3 text-right">Access</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const isAdmin = user.roles.includes("admin");
              const isClient = user.roles.includes("client");
              const isSupport = user.roles.includes("support");
              const busy = mutation.isPending && mutation.variables?.userId === user.id;
              const lastAdmin = isAdmin && adminCount <= 1;
              return (
                <tr key={user.id} className="border-t align-middle">
                  <td className="px-4 py-3">
                    <p className="font-medium">{user.email || "—"}</p>
                    <p className="text-xs text-muted-foreground">
                      Joined {new Date(user.createdAt).toLocaleDateString("en-GB")}
                      {user.confirmed ? "" : " · unconfirmed"}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {isAdmin && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-copper/40 bg-copper/10 px-2 py-0.5 text-xs font-semibold text-copper">
                          <ShieldCheck className="size-3" /> admin
                        </span>
                      )}
                      {isSupport && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                          <LifeBuoy className="size-3" /> support
                        </span>
                      )}
                      {isClient && (
                        <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
                          <UserRound className="size-3" /> client
                        </span>
                      )}
                      {user.roles.length === 0 && <span className="text-xs text-muted-foreground">none</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 tabular-nums">{user.orders}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {user.lastSignInAt ? new Date(user.lastSignInAt).toLocaleString("en-GB") : "never"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button
                        size="sm"
                        variant={isAdmin ? "outline" : "default"}
                        disabled={busy || lastAdmin}
                        title={lastAdmin ? "At least one administrator must remain." : undefined}
                        onClick={() => mutation.mutate({ userId: user.id, role: "admin", grant: !isAdmin })}
                      >
                        {busy && <Loader2 className="size-3.5 animate-spin" />}
                        {isAdmin ? "Revoke admin" : "Make admin"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() => mutation.mutate({ userId: user.id, role: "support", grant: !isSupport })}
                      >
                        {isSupport ? "Revoke support" : "Make support"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() => mutation.mutate({ userId: user.id, role: "client", grant: !isClient })}
                      >
                        {isClient ? "Revoke client" : "Make client"}
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {!query.isLoading && users.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  No accounts found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
