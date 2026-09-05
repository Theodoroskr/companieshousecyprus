import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { BellRing, Building2, Eye, Loader2, PackageSearch, Search, XCircle } from "lucide-react";
import { toast } from "sonner";
import {
  addCompanyWatch,
  cancelCompanyWatch,
  getMonitoringOverview,
  searchCompaniesForWatch,
} from "@/lib/monitoring.functions";
import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SignOutButton } from "@/components/sign-out-button";

const TITLE = "Company monitoring — Companies House Cyprus";
const DESCRIPTION = "Manage the Cyprus companies you monitor and review registry change alerts.";

export const Route = createFileRoute("/_authenticated/account/monitoring")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MonitoringPage,
});

type CompanyHit = { slug: string; name: string; number: string | null; status: string | null };

function MonitoringPage() {
  const load = useServerFn(getMonitoringOverview);
  const search = useServerFn(searchCompaniesForWatch);
  const addWatch = useServerFn(addCompanyWatch);
  const cancelWatch = useServerFn(cancelCompanyWatch);
  const queryClient = useQueryClient();

  const overview = useQuery({ queryKey: ["my-monitoring"], queryFn: () => load() });

  const [term, setTerm] = useState("");
  const [hits, setHits] = useState<CompanyHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    const q = term.trim();
    if (q.length < 2) {
      setHits([]);
      return;
    }
    setSearching(true);
    const handle = setTimeout(async () => {
      try {
        setHits(await search({ data: { query: q } }));
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => clearTimeout(handle);
  }, [term, search]);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["my-monitoring"] });

  const onAdd = async (slug: string) => {
    setBusy(slug);
    try {
      await addWatch({ data: { slug } });
      toast.success("Company added to monitoring.");
      setTerm("");
      setHits([]);
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add the company.");
    } finally {
      setBusy(null);
    }
  };

  const onCancel = async (watchId: string) => {
    setBusy(watchId);
    try {
      await cancelWatch({ data: { watchId } });
      toast.success("Watch cancelled — the slot is free again.");
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not cancel the watch.");
    } finally {
      setBusy(null);
    }
  };

  const entitlements = overview.data?.entitlements ?? [];
  const watches = overview.data?.watches ?? [];
  const alerts = overview.data?.alerts ?? [];
  const activeEntitlements = entitlements.filter((e) => e.status === "active");
  const activeWatches = watches.filter((w) => w.status === "active");
  const freeSlots = activeEntitlements.reduce(
    (sum, e) => sum + Math.max(0, e.watch_limit - e.watches_used),
    0,
  );
  const watchName = (id: string) => watches.find((w) => w.id === id)?.company_name ?? "Company";

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:py-16">
      <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-copper">Client portal</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Company monitoring</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Choose up to five companies per plan. We check them against the registry every day and email you when the
            status, officers, address or name changes.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/account/orders">My orders</Link>
          </Button>
          <SignOutButton />
        </div>
      </header>

      {overview.isLoading ? (
        <div className="flex items-center gap-3 rounded-xl border bg-card p-8 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" /> Loading your monitoring…
        </div>
      ) : overview.isError ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-sm text-destructive">
          We could not load your monitoring. Please refresh the page or contact info@companieshousecyprus.com.
        </div>
      ) : (
        <div className="space-y-8">
          <section className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border bg-card px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Active plans</p>
              <p className="mt-1 text-2xl font-bold tracking-tight">{activeEntitlements.length}</p>
            </div>
            <div className="rounded-xl border bg-card px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Watched companies</p>
              <p className="mt-1 text-2xl font-bold tracking-tight">{activeWatches.length}</p>
            </div>
            <div className="rounded-xl border bg-card px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Free slots</p>
              <p className="mt-1 text-2xl font-bold tracking-tight">{freeSlots}</p>
            </div>
          </section>

          {activeEntitlements.length === 0 ? (
            <div className="rounded-xl border bg-card p-10 text-center">
              <PackageSearch className="mx-auto size-8 text-muted-foreground" />
              <h2 className="mt-4 text-lg font-semibold">No monitoring plan yet</h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                Company Monitoring covers up to five companies for twelve months, with daily registry checks and email
                alerts.
              </p>
              <Button asChild className="mt-5">
                <Link to="/pricing">See Company Monitoring — €99/year</Link>
              </Button>
            </div>
          ) : (
            <section className="rounded-xl border bg-card p-5">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Add a company</h2>
              <div className="relative mt-3">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={term}
                  onChange={(e) => setTerm(e.target.value)}
                  placeholder={freeSlots > 0 ? "Search by company name…" : "No free slots — cancel a watch first"}
                  disabled={freeSlots === 0}
                  className="pl-9"
                />
              </div>
              {searching && <p className="mt-2 text-xs text-muted-foreground">Searching…</p>}
              {hits.length > 0 && (
                <ul className="mt-2 divide-y rounded-lg border">
                  {hits.map((hit) => (
                    <li key={hit.slug} className="flex items-center justify-between gap-3 px-3 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{hit.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {[hit.number, hit.status].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                      <Button size="sm" variant="outline" disabled={busy === hit.slug} onClick={() => onAdd(hit.slug)}>
                        {busy === hit.slug ? <Loader2 className="size-4 animate-spin" /> : "Monitor"}
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {watches.length > 0 && (
            <section className="rounded-xl border bg-card p-5">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Your watched companies
              </h2>
              <ul className="divide-y">
                {watches.map((watch) => (
                  <li key={watch.id} className="flex flex-wrap items-start justify-between gap-3 py-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          to="/company/$slug"
                          params={{ slug: watch.company_slug }}
                          className="truncate text-sm font-medium underline-offset-2 hover:underline"
                        >
                          {watch.company_name}
                        </Link>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                            watch.status === "active"
                              ? "border-copper/40 bg-copper/10 text-copper"
                              : "border-border bg-muted text-muted-foreground"
                          }`}
                        >
                          {watch.status === "active" ? "Watching" : watch.status}
                        </span>
                        {watch.registry_status && (
                          <span className="rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground">
                            Registry: {watch.registry_status}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {[
                          watch.company_number,
                          watch.registry_type,
                          `cover until ${formatDate(watch.expires_at)}`,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                      {watch.registry_address && (
                        <p className="mt-1 truncate text-xs text-muted-foreground">{watch.registry_address}</p>
                      )}
                      <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="size-3.5" />
                          Last checked: {watch.last_checked_at ? formatDate(watch.last_checked_at) : "awaiting first check"}
                        </span>
                        <span>
                          {watch.alert_count > 0
                            ? `${watch.alert_count} change${watch.alert_count === 1 ? "" : "s"} · last ${formatDate(
                                watch.last_change_at as string,
                              )}`
                            : "No changes recorded"}
                        </span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {watch.alert_count > 0 && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setLogFilter(logFilter === watch.id ? "all" : watch.id)}
                        >
                          {logFilter === watch.id ? "Show all changes" : "View changelog"}
                        </Button>
                      )}
                      {watch.status === "active" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-muted-foreground"
                          disabled={busy === watch.id}
                          onClick={() => onCancel(watch.id)}
                        >
                          {busy === watch.id ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <>
                              <XCircle className="mr-1 size-4" /> Stop watching
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {watches.length > 0 && (
            <section className="rounded-xl border bg-card p-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  <BellRing className="size-4" /> Changelog
                </h2>
                {logFilter !== "all" && (
                  <Button size="sm" variant="ghost" onClick={() => setLogFilter("all")}>
                    Clear filter: {watchName(logFilter)}
                  </Button>
                )}
              </div>
              {visibleAlerts.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No registry changes recorded yet. We check every watched company daily and log anything that moves.
                </p>
              ) : (
                <ol className="relative space-y-4 border-l pl-5">
                  {visibleAlerts.map((alert) => (
                    <li key={alert.id} className="relative text-sm">
                      <span className="absolute -left-[1.4rem] top-1.5 size-2 rounded-full bg-copper" />
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{watchName(alert.watch_id)}</p>
                        <span className="rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground">
                          {alert.field_label}
                        </span>
                        <span className="text-xs text-muted-foreground">{formatDate(alert.detected_at)}</span>
                      </div>
                      <p className="mt-1 text-muted-foreground">
                        {alert.previous_value || "—"} →{" "}
                        <span className="font-medium text-foreground">{alert.new_value || "—"}</span>
                      </p>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          )}

          {watches.length === 0 && alerts.length === 0 && activeEntitlements.length > 0 && (
            <div className="flex items-center gap-3 rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
              <Building2 className="size-5 shrink-0" />
              No companies watched yet — use the search above to add your first company.
            </div>
          )}


          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Eye className="size-4" /> Alerts reflect the public registry; names of officers are shown as filed.
          </p>
        </div>
      )}
    </div>
  );
}
