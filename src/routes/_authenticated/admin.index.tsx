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

function AdminDashboardPage() {
  const list = useServerFn(adminListOrders);
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: () => list(),
  });

  const orders = data?.orders ?? [];
  const today = todayISO();

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

  const attention = [...overdue, ...dueToday, ...newOrders.filter((o) => o.status === "paid")]
    .filter((o, i, arr) => arr.findIndex((x) => x.id === o.id) === i)
    .slice(0, 12);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Support dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Live view of requests, due dates and deliveries — newest {orders.length} orders.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          {isFetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Refresh
        </Button>
      </div>

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

          <section className="mt-6 grid gap-3 sm:grid-cols-3">
            <QuickLink to="/admin/orders" title="Manage orders" body="Set status, due dates and upload documents." />
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
