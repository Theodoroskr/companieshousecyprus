import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, RefreshCw, ShieldAlert, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAuthTrafficBreakdown } from "@/lib/auth-guard.functions";

type TrafficRow = { key: string; total: number; passed: number };

const RANGES = [
  { key: 1, label: "24h" },
  { key: 7, label: "7 days" },
  { key: 30, label: "30 days" },
] as const;

const pct = (part: number, total: number) => (total > 0 ? Math.round((part / total) * 100) : 0);

const MODE_LABELS: Record<string, string> = {
  signin: "Sign in",
  signup: "Sign up",
  forgot: "Password reset",
};

function Breakdown({
  title,
  rows,
  labels,
  emptyLabel,
}: {
  title: string;
  rows: TrafficRow[];
  labels?: Record<string, string>;
  emptyLabel: string;
}) {
  const max = rows.reduce((m, r) => Math.max(m, r.total), 0);
  return (
    <div className="rounded-lg border bg-card p-4">
      <h4 className="text-sm font-semibold">{title}</h4>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">{emptyLabel}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {rows.slice(0, 8).map((row) => {
            const success = pct(row.passed, row.total);
            const suspicious = row.total >= 20 && success < 50;
            return (
              <li key={row.key} className="space-y-1">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate font-medium">{labels?.[row.key] ?? row.key}</span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">
                    {row.total.toLocaleString("en-GB")} · {success}% passed
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={suspicious ? "h-full bg-destructive" : "h-full bg-primary"}
                    style={{ width: `${max > 0 ? Math.max(4, (row.total / max) * 100) : 0}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function AuthTrafficWidget() {
  const [days, setDays] = useState<number>(7);
  const fetchBreakdown = useServerFn(getAuthTrafficBreakdown);
  const { data, isLoading, isFetching, refetch, error } = useQuery({
    queryKey: ["auth-traffic", days],
    queryFn: () => fetchBreakdown({ data: { days } }),
  });

  const total = data?.total ?? 0;
  const passed = data?.passed ?? 0;
  const blocked = data?.blocked ?? 0;
  const successRate = pct(passed, total);
  const peakDay = (data?.by_day ?? []).reduce<TrafficRow | null>(
    (best, row) => (best === null || row.total > best.total ? row : best),
    null,
  );

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Auth endpoint traffic</h2>
          <p className="text-sm text-muted-foreground">
            Sign-in, sign-up and reset attempts by country, referral source and bot-check success rate.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {RANGES.map((r) => (
            <Button
              key={r.key}
              size="sm"
              variant={days === r.key ? "default" : "outline"}
              onClick={() => setDays(r.key)}
            >
              {r.label}
            </Button>
          ))}
          <Button size="sm" variant="ghost" onClick={() => void refetch()} disabled={isFetching}>
            <RefreshCw className={isFetching ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
          </Button>
        </div>
      </div>

      {error ? (
        <p className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm">
          Could not load auth traffic: {error instanceof Error ? error.message : "unknown error"}
        </p>
      ) : isLoading ? (
        <div className="flex items-center gap-2 rounded-lg border bg-card p-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading auth traffic…
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border bg-card p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Attempts</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{total.toLocaleString("en-GB")}</p>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Passed bot check</p>
              <p className="mt-1 flex items-center gap-2 text-2xl font-semibold tabular-nums">
                <ShieldCheck className="h-5 w-5 text-primary" />
                {successRate}%
              </p>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Blocked / failed</p>
              <p className="mt-1 flex items-center gap-2 text-2xl font-semibold tabular-nums">
                <ShieldAlert className={blocked > 0 ? "h-5 w-5 text-destructive" : "h-5 w-5 text-muted-foreground"} />
                {blocked.toLocaleString("en-GB")}
              </p>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Busiest day</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">
                {peakDay ? peakDay.total.toLocaleString("en-GB") : "—"}
              </p>
              <p className="text-xs text-muted-foreground">{peakDay ? peakDay.key : "No attempts yet"}</p>
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-3">
            <Breakdown
              title="By country"
              rows={data?.by_country ?? []}
              emptyLabel="No attempts recorded in this period."
            />
            <Breakdown
              title="By referral source"
              rows={data?.by_referrer ?? []}
              emptyLabel="No attempts recorded in this period."
            />
            <Breakdown
              title="By action"
              rows={data?.by_mode ?? []}
              labels={MODE_LABELS}
              emptyLabel="No attempts recorded in this period."
            />
          </div>
          <p className="text-xs text-muted-foreground">
            A country or referrer with high volume and a low pass rate (shown in red) is a likely bot spike.
          </p>
        </>
      )}
    </section>
  );
}
