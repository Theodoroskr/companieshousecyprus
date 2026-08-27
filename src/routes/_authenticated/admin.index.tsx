import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock, Inbox, Loader2, RefreshCw, Timer } from "lucide-react";
import { adminListOrders } from "@/lib/orders.functions";
import { formatPrice } from "@/lib/products";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/admin/status-badge";
import { AuthTrafficWidget } from "@/components/admin/auth-traffic-widget";


export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({
    meta: [
      { title: "Support dashboard — Admin" },
      { name: "description", content: "Track new orders, due dates and deliveries across the registry service desk." },
      { property: "og:title", content: "Support dashboard — Admin" },
      { property: "og:description", content: "Track new orders, due dates and deliveries across the registry service desk." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminDashboardPage,
});

const euros = (cents: number) => formatPrice(cents / 100);
const showDate = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString("en-GB", { timeZone: "Asia/Nicosia" }) : "—";

const todayISO = () => new Date().toISOString().slice(0, 10);

function isOpen(order: { status: string }) {
  return order.status !== "delivered" && order.status !== "cancelled";
}

const shiftDays = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
};

const PRESETS = [
  { key: "7", label: "Last 7 days", days: 6 },
  { key: "30", label: "Last 30 days", days: 29 },
  { key: "90", label: "Last 90 days", days: 89 },
  { key: "all", label: "All time", days: null as number | null },
] as const;

function AdminDashboardPage() {
  const list = useServerFn(adminListOrders);
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: () => list(),
  });

  const allOrders = data?.orders ?? [];
  const today = todayISO();

  const [preset, setPreset] = useState<string>("30");
  const [from, setFrom] = useState<string>(shiftDays(29));
  const [to, setTo] = useState<string>(today);

  const applyPreset = (key: string) => {
    setPreset(key);
    const found = PRESETS.find((p) => p.key === key);
    if (!found) return;
    setTo(todayISO());
    setFrom(found.days === null ? "" : shiftDays(found.days));
  };

  const orders = useMemo(
    () =>
      allOrders.filter((o) => {
        const day = (o.created_at ?? "").slice(0, 10);
        if (!day) return true;
        if (from && day < from) return false;
        if (to && day > to) return false;
        return true;
      }),
    [allOrders, from, to],
  );

  const open = orders.filter(isOpen);
  const newOrders = orders.filter((o) => o.status === "paid" || o.status === "awaiting_payment");
  const processing = orders.filter((o) => o.status === "processing");
  const overdue = open.filter((o) => o.due_date && o.due_date < today);
  const dueToday = open.filter((o) => o.due_date === today);
  const delivered = orders.filter((o) => o.status === "delivered");
  const openValue = open.reduce((sum, o) => sum + (o.total_cents ?? 0), 0);
  const paidValue = orders
    .filter((o) => o.status !== "awaiting_payment" && o.status !== "cancelled")
    .reduce((sum, o) => sum + (o.total_cents ?? 0), 0);
  const missingDue = open.filter((o) => !o.due_date);

  const stats = useMemo(() => {
    const items = orders.flatMap((o) => o.order_items ?? []);
    const requests = items.reduce((sum, i) => sum + (i.quantity ?? 1), 0);
    const byProduct = new Map<string, { count: number; value: number }>();
    for (const i of items) {
      const key = i.product_name ?? "Unknown";
      const entry = byProduct.get(key) ?? { count: 0, value: 0 };
      entry.count += i.quantity ?? 1;
      entry.value += i.total_cents ?? 0;
      byProduct.set(key, entry);
    }
    const topProducts = [...byProduct.entries()]
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    const turnarounds = orders
      .filter((o) => o.status === "delivered" && o.delivered_at && o.created_at)
      .map(
        (o) =>
          (new Date(o.delivered_at as string).getTime() - new Date(o.created_at as string).getTime()) /
          86_400_000,
      );
    const avgTurnaround = turnarounds.length
      ? turnarounds.reduce((a, b) => a + b, 0) / turnarounds.length
      : null;

    const statusCounts = orders.reduce<Record<string, number>>((acc, o) => {
      acc[o.status] = (acc[o.status] ?? 0) + 1;
      return acc;
    }, {});

    const paidOrders = orders.filter((o) => o.status !== "awaiting_payment" && o.status !== "cancelled");
    const avgOrderValue = paidOrders.length
      ? paidOrders.reduce((s, o) => s + (o.total_cents ?? 0), 0) / paidOrders.length
      : 0;

    const deliveredCount = delivered.length;
    const completionRate = orders.length ? Math.round((deliveredCount / orders.length) * 100) : 0;

    return { requests, topProducts, avgTurnaround, statusCounts, avgOrderValue, completionRate, items: items.length };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders]);

  const attention = [...overdue, ...dueToday, ...newOrders.filter((o) => o.status === "paid")]
    .filter((o, i, arr) => arr.findIndex((x) => x.id === o.id) === i)
    .slice(0, 12);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Support dashboard</h1>
          <p className="text-sm text-muted-foreground">
            {orders.length} orders in the selected period ({allOrders.length} loaded).
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          {isFetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Refresh
        </Button>
      </div>

      <section className="mt-5 flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4">
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => applyPreset(p.key)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                preset === p.key
                  ? "border-copper bg-copper/10 text-copper"
                  : "text-muted-foreground hover:border-copper/50 hover:text-foreground"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="grid gap-1">
            <Label htmlFor="from" className="text-xs text-muted-foreground">From</Label>
            <Input
              id="from"
              type="date"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                setPreset("custom");
              }}
              className="h-9 w-[150px]"
            />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="to" className="text-xs text-muted-foreground">To</Label>
            <Input
              id="to"
              type="date"
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                setPreset("custom");
              }}
              className="h-9 w-[150px]"
            />
          </div>
        </div>
      </section>


      {isLoading ? (
        <div className="mt-10 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading dashboard…
        </div>
      ) : (
        <>
          <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Kpi
              icon={<Inbox className="h-4 w-4" />}
              label="New requests"
              value={newOrders.length}
              hint={`${newOrders.filter((o) => o.status === "paid").length} paid and ready to work`}
              tone="default"
              view="new"
            />
            <Kpi
              icon={<Timer className="h-4 w-4" />}
              label="In progress"
              value={processing.length}
              hint={`${open.length} open orders in total`}
              tone="default"
              view="processing"
            />
            <Kpi
              icon={<AlertTriangle className="h-4 w-4" />}
              label="Overdue"
              value={overdue.length}
              hint={overdue.length ? "Past their due date" : "Nothing past due"}
              tone={overdue.length ? "danger" : "default"}
              view="overdue"
            />
            <Kpi
              icon={<Clock className="h-4 w-4" />}
              label="Due today"
              value={dueToday.length}
              hint={missingDue.length ? `${missingDue.length} open orders have no due date` : "All open orders dated"}
              tone={dueToday.length ? "warning" : "default"}
              view="due_today"
            />
            <Kpi
              icon={<CheckCircle2 className="h-4 w-4" />}
              label="Delivered"
              value={delivered.length}
              hint="Completed in this window"
              tone="success"
              view="delivered"
            />
            <Kpi
              icon={<Inbox className="h-4 w-4" />}
              label="Open value"
              value={euros(openValue)}
              hint={`${euros(paidValue)} collected`}
              tone="default"
              view="open"
            />
          </section>

          <section className="mt-8 grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border bg-card p-4">
              <h2 className="font-display text-base font-semibold">Request stats</h2>
              <p className="text-xs text-muted-foreground">
                {from || "beginning"} → {to || "today"}
              </p>
              <dl className="mt-4 grid grid-cols-2 gap-3">
                <Stat label="Requested items" value={stats.requests} />
                <Stat label="Orders" value={orders.length} />
                <Stat
                  label="Avg turnaround"
                  value={stats.avgTurnaround === null ? "—" : `${stats.avgTurnaround.toFixed(1)} d`}
                />
                <Stat label="Avg order value" value={euros(stats.avgOrderValue)} />
                <Stat label="Completion rate" value={`${stats.completionRate}%`} />
                <Stat label="Collected" value={euros(paidValue)} />
              </dl>
              <div className="mt-4 flex flex-wrap gap-2">
                {Object.entries(stats.statusCounts).map(([status, count]) => (
                  <span key={status} className="flex items-center gap-1.5 text-xs">
                    <StatusBadge status={status} />
                    <span className="font-semibold">{count}</span>
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-xl border bg-card p-4">
              <h2 className="font-display text-base font-semibold">Top requested products</h2>
              <p className="text-xs text-muted-foreground">{stats.items} line items in this period</p>
              {stats.topProducts.length === 0 ? (
                <p className="mt-4 text-sm text-muted-foreground">No requests in this period.</p>
              ) : (
                <ul className="mt-4 space-y-2.5">
                  {stats.topProducts.map((p) => {
                    const max = stats.topProducts[0]?.count || 1;
                    return (
                      <li key={p.name}>
                        <div className="flex items-baseline justify-between gap-3 text-sm">
                          <span className="truncate">{p.name}</span>
                          <span className="whitespace-nowrap font-semibold">
                            {p.count} · {euros(p.value)}
                          </span>
                        </div>
                        <div className="mt-1 h-1.5 rounded-full bg-muted">
                          <div
                            className="h-1.5 rounded-full bg-copper"
                            style={{ width: `${Math.max(6, (p.count / max) * 100)}%` }}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>


          <section className="mt-8 rounded-xl border bg-card">
            <header className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
              <h2 className="font-display text-base font-semibold">Needs attention</h2>
              <Link to="/admin/orders" className="text-sm font-medium text-copper hover:underline">
                Open all orders →
              </Link>
            </header>

            {attention.length === 0 ? (
              <p className="px-4 py-6 text-sm text-muted-foreground">
                Nothing is overdue or waiting — the queue is clear.
              </p>
            ) : (
              <ul className="divide-y">
                {attention.map((order) => {
                  const late = Boolean(order.due_date && order.due_date < today);
                  const due = order.due_date === today;
                  return (
                    <li key={order.id}>
                      <Link
                        to="/admin/orders"
                        search={{ ref: order.reference }}
                        className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-muted/40"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">
                            {order.reference} · {order.full_name ?? order.email ?? "—"}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {order.order_items?.map((i) => i.product_name).join(", ") || "No items"}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <StatusBadge status={order.status} />
                          <span
                            className={
                              late
                                ? "rounded-full bg-destructive/10 px-2 py-0.5 font-semibold text-destructive"
                                : due
                                  ? "rounded-full bg-amber-500/15 px-2 py-0.5 font-semibold text-amber-700 dark:text-amber-400"
                                  : "text-muted-foreground"
                            }
                          >
                            Due {showDate(order.due_date)}
                          </span>
                          <span className="font-semibold">{euros(order.total_cents ?? 0)}</span>
                        </div>
                      </Link>
                    </li>

                  );
                })}
              </ul>
            )}
          </section>

          <div className="mt-8">
            <AuthTrafficWidget />
          </div>

          <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <QuickLink to="/admin/orders" title="Manage orders" body="Set status, due dates and upload documents." />
            <QuickLink to="/admin/products" title="Products & tax codes" body="Review catalogue and sync Stripe tax codes." />
            <QuickLink to="/admin/api4all" title="API4ALL lookups" body="Check registry codes and pull reports." />
            <QuickLink to="/admin/users" title="Users & roles" body="Review client accounts and admin access." />
          </section>
        </>
      )}
    </main>
  );
}

function Kpi({
  icon,
  label,
  value,
  hint,
  tone,
  view,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  hint: string;
  tone: "default" | "danger" | "warning" | "success";
  view: "new" | "processing" | "overdue" | "due_today" | "delivered" | "open";
}) {
  const toneClass =
    tone === "danger"
      ? "text-destructive"
      : tone === "warning"
        ? "text-amber-600 dark:text-amber-400"
        : tone === "success"
          ? "text-emerald-600 dark:text-emerald-400"
          : "text-copper";
  return (
    <Link
      to="/admin/orders"
      search={{ view }}
      className="rounded-xl border bg-card p-4 transition-colors hover:border-copper/60 hover:bg-muted/40"
    >
      <div className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-wide ${toneClass}`}>
        {icon}
        {label}
      </div>
      <p className="mt-2 font-display text-2xl font-semibold tracking-tight">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </Link>
  );
}


function QuickLink({ to, title, body }: { to: string; title: string; body: string }) {
  return (
    <Link
      to={to}
      className="rounded-xl border bg-card p-4 transition-colors hover:border-copper/60 hover:bg-muted/40"
    >
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{body}</p>
    </Link>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border bg-background/60 p-3">
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-display text-lg font-semibold tracking-tight">{value}</dd>
    </div>
  );
}
