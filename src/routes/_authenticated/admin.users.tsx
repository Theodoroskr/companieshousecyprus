import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, RefreshCw, ShieldCheck, UserRound } from "lucide-react";
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

function AdminUsersPage() {
  const list = useServerFn(listUsers);
  const setRole = useServerFn(updateUserRole);
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const query = useQuery({ queryKey: ["admin", "users"], queryFn: () => list() });

  const mutation = useMutation({
    mutationFn: (input: { userId: string; role: "admin" | "client"; grant: boolean }) => setRole({ data: input }),
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

  const users = (query.data ?? []).filter((u) =>
    search.trim() ? u.email.toLowerCase().includes(search.trim().toLowerCase()) : true,
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Users</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Grant or revoke administrator and client access. New sign-ups become clients automatically.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/admin/orders">Orders</Link>
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

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Filter by email…"
        className="mt-6 w-full max-w-sm rounded-md border bg-background px-3 py-2 text-sm"
      />

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
              const busy = mutation.isPending && mutation.variables?.userId === user.id;
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
                        disabled={busy}
                        onClick={() => mutation.mutate({ userId: user.id, role: "admin", grant: !isAdmin })}
                      >
                        {busy && <Loader2 className="size-3.5 animate-spin" />}
                        {isAdmin ? "Revoke admin" : "Make admin"}
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
