import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Clock, Loader2, RefreshCw, Users, Wallet } from "lucide-react";
import { getUserUsage } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/usage")({
  head: () => ({
    meta: [
      { title: "Usage dashboard — Admin" },
      {
        name: "description",
        content: "Per-account usage: orders, failed fulfilments, awaiting payment and last activity.",
      },
      { property: "og:title", content: "Usage dashboard — Admin" },
      { property: "og:description", content: "Per-account order and fulfilment activity." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminUsagePage,
});

function euro(cents: number) {
  return `€${(cents / 100).toLocaleString("en-IE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function AdminUsagePage() {
  const fetchUsage = useServerFn(getUserUsage);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [company, setCompany] = useState("");
  const [applied, setApplied] = useState<{ from: string; to: string; company: string }>({
    from: "",
    to: "",
    company: "",
  });

  const query = useQuery({
    queryKey: ["admin", "usage", applied],
    queryFn: () =>
      fetchUsage({
        data: {
          from: applied.from || null,
          to: applied.to || null,
          company: applied.company || null,
        },
      }),
  });

  const rows = query.data?.rows ?? [];
  const totals = query.data?.totals;
  const companyOptions = useMemo(() => query.data?.companyOptions ?? [], [query.data]);

  const apply = () => setApplied({ from, to, company });
  const reset = () => {
    setFrom("");
    setTo("");
    setCompany("");
    setApplied({ from: "", to: "", company: "" });
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Usage dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Orders, fulfilment health and last activity per account. Filter by company or date range.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/admin/users">Users</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/admin/orders">Orders</Link>
          </Button>
          <Button variant="outline" size="sm" onClick={() => void query.refetch()}>
            <RefreshCw className="size-4" /> Refresh
          </Button>
        </div>
      </div>

      <div className="mt-6 grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-sm">
          <span className="mb-1 block text-muted-foreground">From</span>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-muted-foreground">To</span>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
        <label className="text-sm lg:col-span-1">
          <span className="mb-1 block text-muted-foreground">Company</span>
          <Input
            list="usage-company-options"
            placeholder="Name or registration number"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
          />
          <datalist id="usage-company-options">
            {companyOptions.map((option) => (
              <option key={option} value={option} />
            ))}
          </datalist>
        </label>
        <div className="flex items-end gap-2">
          <Button className="flex-1" onClick={apply}>
            Apply filters
          </Button>
          <Button variant="outline" onClick={reset}>
            Reset
          </Button>
        </div>
      </div>

      {totals && (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Stat icon={<Users className="size-4" />} label="Accounts" value={totals.users.toLocaleString()} />
          <Stat icon={<Wallet className="size-4" />} label="Paid orders" value={totals.paid.toLocaleString()} />
          <Stat
            icon={<Clock className="size-4" />}
            label="Awaiting payment"
            value={totals.awaitingPayment.toLocaleString()}
          />
          <Stat
            icon={<AlertTriangle className="size-4" />}
            label="Failed items"
            value={totals.failedItems.toLocaleString()}
          />
          <Stat icon={<Wallet className="size-4" />} label="Revenue" value={euro(totals.revenueCents)} />
        </div>
      )}

      {query.isLoading && (
        <p className="mt-8 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading usage…
        </p>
      )}
      {query.error && (
        <p className="mt-8 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {query.error instanceof Error ? query.error.message : "Could not load usage"}
        </p>
      )}

      {!query.isLoading && !query.error && (
        <div className="mt-6 overflow-x-auto rounded-xl border bg-card">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Account</th>
                <th className="px-4 py-3">Orders</th>
                <th className="px-4 py-3">Paid</th>
                <th className="px-4 py-3">Awaiting payment</th>
                <th className="px-4 py-3">Failed</th>
                <th className="px-4 py-3">Delivered</th>
                <th className="px-4 py-3">Revenue</th>
                <th className="px-4 py-3">Last activity</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                    No activity matches these filters.
                  </td>
                </tr>
              )}
              {rows.map((row) => (
                <tr key={row.email} className="border-b last:border-0 align-top">
                  <td className="px-4 py-3">
                    <div className="font-medium">{row.email}</div>
                    {row.companies.length > 0 && (
                      <div className="mt-1 text-xs text-muted-foreground">
                        {row.companies.slice(0, 3).join(", ")}
                        {row.companies.length > 3 ? ` +${row.companies.length - 3} more` : ""}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">{row.orders}</td>
                  <td className="px-4 py-3">{row.paid}</td>
                  <td className="px-4 py-3">
                    {row.awaitingPayment > 0 ? (
                      <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                        {row.awaitingPayment}
                      </span>
                    ) : (
                      0
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {row.failedItems > 0 ? (
                      <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-xs font-medium text-destructive">
                        {row.failedItems}
                      </span>
                    ) : (
                      0
                    )}
                  </td>
                  <td className="px-4 py-3">{row.deliveredItems}</td>
                  <td className="px-4 py-3">{euro(row.revenueCents)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {row.lastActivity ? formatDate(row.lastActivity) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-2 font-display text-2xl font-bold">{value}</div>
    </div>
  );
}
