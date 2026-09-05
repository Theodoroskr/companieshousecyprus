import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Activity,
  BellRing,
  Building2,
  CalendarClock,
  Eye,
  Loader2,
  MailWarning,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  adminCancelPlan,
  adminExtendPlan,
  adminGetMonitoring,
  adminResendAlert,
  adminStopCompanyWatch,
  adminTriggerWatchCheck,
} from "@/lib/monitoring.functions";

export const Route = createFileRoute("/_authenticated/admin/monitoring")({
  head: () => ({
    meta: [
      { title: "Monitoring control — Admin" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminMonitoringPage,
});

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";

const fmtDateTime = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString("en-GB", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

function StatusChip({ status }: { status: string }) {
  const tone =
    status === "active"
      ? "bg-emerald-100 text-emerald-800"
      : status === "expired"
        ? "bg-amber-100 text-amber-800"
        : "bg-muted text-muted-foreground";
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${tone}`}>{status}</span>;
}

function AdminMonitoringPage() {
  const load = useServerFn(adminGetMonitoring);
  const extend = useServerFn(adminExtendPlan);
  const cancelPlan = useServerFn(adminCancelPlan);
  const stopWatch = useServerFn(adminStopCompanyWatch);
  const triggerCheck = useServerFn(adminTriggerWatchCheck);
  const resendAlert = useServerFn(adminResendAlert);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({ queryKey: ["admin-monitoring"], queryFn: () => load() });
  const [customerFilter, setCustomerFilter] = useState("");
  const [deliveryFilter, setDeliveryFilter] = useState<"all" | "delivered" | "undelivered">("all");
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["admin-monitoring"] });

  const stats = useMemo(() => {
    const entitlements = data?.entitlements ?? [];
    const watches = data?.watches ?? [];
    const alerts = data?.alerts ?? [];
    const in30 = Date.now() + 30 * 24 * 60 * 60 * 1000;
    const month30 = Date.now() - 30 * 24 * 60 * 60 * 1000;
    return {
      activePlans: entitlements.filter((e) => e.status === "active").length,
      expiringSoon: entitlements.filter(
        (e) => e.status === "active" && new Date(e.expires_at).getTime() < in30,
      ).length,
      activeWatches: watches.filter((w) => w.status === "active").length,
      freeSlots: entitlements
        .filter((e) => e.status === "active")
        .reduce((sum, e) => sum + Math.max(0, e.watch_limit - e.watches_used), 0),
      alerts30d: alerts.filter((a) => new Date(a.detected_at).getTime() > month30).length,
      undelivered: alerts.filter((a) => !a.emailed_at).length,
    };
  }, [data]);

  const filteredWatches = useMemo(() => {
    const q = customerFilter.trim().toLowerCase();
    const watches = data?.watches ?? [];
    if (!q) return watches;
    return watches.filter(
      (w) =>
        w.email.toLowerCase().includes(q) ||
        w.company_name.toLowerCase().includes(q) ||
        (w.company_number ?? "").toLowerCase().includes(q),
    );
  }, [data, customerFilter]);

  const filteredAlerts = useMemo(() => {
    const alerts = data?.alerts ?? [];
    if (deliveryFilter === "delivered") return alerts.filter((a) => a.emailed_at);
    if (deliveryFilter === "undelivered") return alerts.filter((a) => !a.emailed_at);
    return alerts;
  }, [data, deliveryFilter]);

  const run = async (id: string, fn: () => Promise<unknown>, success: string) => {
    setBusyId(id);
    try {
      const result = (await fn()) as { ok?: boolean; reason?: string | null } | undefined;
      if (result && result.ok === false) {
        toast.error(result.reason ?? "Action failed");
      } else {
        toast.success(success);
        await refresh();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusyId(null);
    }
  };

  if (isLoading || !data) {
    return (
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-20 text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Loading monitoring data…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="font-display text-2xl font-bold">Monitoring control</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Every customer monitoring plan, watched company and alert — across all accounts.
      </p>

      {/* Overview cards */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { icon: Activity, label: "Active plans", value: stats.activePlans },
          { icon: CalendarClock, label: "Expiring ≤30 days", value: stats.expiringSoon },
          { icon: Eye, label: "Watched companies", value: stats.activeWatches },
          { icon: Building2, label: "Free slots", value: stats.freeSlots },
          { icon: BellRing, label: "Alerts (30 days)", value: stats.alerts30d },
          { icon: MailWarning, label: "Undelivered", value: stats.undelivered },
        ].map((card) => (
          <div key={card.label} className="rounded-lg border bg-card p-4">
            <card.icon className="size-4 text-muted-foreground" />
            <p className="mt-2 text-2xl font-bold tabular-nums">{card.value}</p>
            <p className="text-xs text-muted-foreground">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Plans */}
      <h2 className="mt-10 font-display text-lg font-semibold">Plans</h2>
      <div className="mt-3 overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Customer</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Cover ends</th>
              <th className="px-3 py-2">Watches</th>
              <th className="px-3 py-2">Alerts sent</th>
              <th className="px-3 py-2">Order</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {data.entitlements.map((e) => (
              <tr key={e.id}>
                <td className="px-3 py-2">{e.email}</td>
                <td className="px-3 py-2"><StatusChip status={e.status} /></td>
                <td className="px-3 py-2 tabular-nums">{fmtDate(e.expires_at)}</td>
                <td className="px-3 py-2 tabular-nums">{e.watches_used} / {e.watch_limit}</td>
                <td className="px-3 py-2 tabular-nums">{e.alerts_sent}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{e.order_reference ?? "—"}</td>
                <td className="px-3 py-2">
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      disabled={busyId === e.id}
                      onClick={() => run(e.id, () => extend({ data: { entitlementId: e.id, months: 12 } }), "Plan extended by 12 months")}
                      className="rounded-md border px-2.5 py-1 text-xs font-medium hover:bg-muted disabled:opacity-50"
                    >
                      {busyId === e.id ? <Loader2 className="size-3 animate-spin" /> : "+12 months"}
                    </button>
                    {e.status === "active" && (
                      <button
                        type="button"
                        disabled={busyId === `cancel-${e.id}`}
                        onClick={() => {
                          if (window.confirm(`Cancel the plan for ${e.email}? Its watches will stop.`)) {
                            run(`cancel-${e.id}`, () => cancelPlan({ data: { entitlementId: e.id } }), "Plan cancelled");
                          }
                        }}
                        className="rounded-md border border-destructive/40 px-2.5 py-1 text-xs font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {data.entitlements.length === 0 && (
              <tr><td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">No monitoring plans yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Watched companies */}
      <div className="mt-10 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold">Watched companies</h2>
        <input
          value={customerFilter}
          onChange={(ev) => setCustomerFilter(ev.target.value)}
          placeholder="Filter by customer, company or number…"
          className="w-full max-w-xs rounded-md border bg-background px-3 py-1.5 text-sm"
        />
      </div>
      <div className="mt-3 overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Company</th>
              <th className="px-3 py-2">Customer</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Registry status</th>
              <th className="px-3 py-2">Last check</th>
              <th className="px-3 py-2">Alerts</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredWatches.map((w) => (
              <tr key={w.id}>
                <td className="px-3 py-2">
                  <Link to="/company/$slug" params={{ slug: w.company_slug }} className="font-medium text-copper hover:underline">
                    {w.company_name}
                  </Link>
                  {w.company_number && <span className="ml-1 text-xs text-muted-foreground">· {w.company_number}</span>}
                </td>
                <td className="px-3 py-2 text-xs">{w.email}</td>
                <td className="px-3 py-2"><StatusChip status={w.status} /></td>
                <td className="px-3 py-2 text-xs">{w.registry_status ?? "—"}</td>
                <td className="px-3 py-2 tabular-nums text-xs">{fmtDateTime(w.last_checked_at)}</td>
                <td className="px-3 py-2 tabular-nums text-xs">
                  {w.alert_count}
                  {w.undelivered_count > 0 && (
                    <span className="ml-1 text-amber-600">({w.undelivered_count} undelivered)</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  <div className="flex justify-end gap-2">
                    {w.status === "active" && (
                      <button
                        type="button"
                        disabled={busyId === `check-${w.id}`}
                        onClick={() => run(`check-${w.id}`, () => triggerCheck({ data: { watchId: w.id } }), "Registry check completed")}
                        className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium hover:bg-muted disabled:opacity-50"
                      >
                        {busyId === `check-${w.id}` ? <Loader2 className="size-3 animate-spin" /> : <RefreshCw className="size-3" />}
                        Re-check
                      </button>
                    )}
                    {w.undelivered_count > 0 && (
                      <button
                        type="button"
                        disabled={busyId === `resend-${w.id}`}
                        onClick={() => run(`resend-${w.id}`, () => resendAlert({ data: { watchId: w.id } }), "Alert email re-sent")}
                        className="rounded-md border px-2.5 py-1 text-xs font-medium hover:bg-muted disabled:opacity-50"
                      >
                        Resend alert
                      </button>
                    )}
                    {w.status === "active" && (
                      <button
                        type="button"
                        disabled={busyId === `stop-${w.id}`}
                        onClick={() => {
                          if (window.confirm(`Stop watching ${w.company_name} for ${w.email}?`)) {
                            run(`stop-${w.id}`, () => stopWatch({ data: { watchId: w.id } }), "Watch stopped");
                          }
                        }}
                        className="rounded-md border border-destructive/40 px-2.5 py-1 text-xs font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50"
                      >
                        <XCircle className="size-3" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filteredWatches.length === 0 && (
              <tr><td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">No watches match.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Alerts log */}
      <div className="mt-10 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold">Alerts log</h2>
        <div className="flex gap-1 rounded-md border p-0.5 text-xs">
          {(["all", "delivered", "undelivered"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setDeliveryFilter(f)}
              className={`rounded px-2.5 py-1 font-medium capitalize ${deliveryFilter === f ? "bg-copper text-white" : "text-muted-foreground hover:bg-muted"}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-3 overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Detected</th>
              <th className="px-3 py-2">Company</th>
              <th className="px-3 py-2">Customer</th>
              <th className="px-3 py-2">Change</th>
              <th className="px-3 py-2">Delivery</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredAlerts.map((a) => (
              <tr key={a.id}>
                <td className="px-3 py-2 tabular-nums text-xs">{fmtDateTime(a.detected_at)}</td>
                <td className="px-3 py-2 text-xs font-medium">{a.company_name}</td>
                <td className="px-3 py-2 text-xs">{a.customer_email}</td>
                <td className="px-3 py-2 text-xs">
                  <span className="font-medium">{a.field_label}</span>
                  <span className="text-muted-foreground">
                    : {a.previous_value || "—"} → {a.new_value || "—"}
                  </span>
                </td>
                <td className="px-3 py-2 text-xs">
                  {a.emailed_at ? (
                    <span className="text-emerald-700">Sent {fmtDateTime(a.emailed_at)}</span>
                  ) : (
                    <span className="text-amber-600">Not delivered</span>
                  )}
                </td>
              </tr>
            ))}
            {filteredAlerts.length === 0 && (
              <tr><td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">No alerts in this view.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
