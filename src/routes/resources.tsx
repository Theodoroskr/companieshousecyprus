import { createFileRoute } from "@tanstack/react-router";
import { BarChart3, TrendingUp, Building2, Users, Store, Globe2 } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

const TITLE = "Registry statistics & resources — Companies House Cyprus";
const DESCRIPTION =
  "Monthly registration statistics for companies, partnerships, business names, overseas companies and SE/EEIG with the Cyprus Registrar of Companies, January–July 2026.";

export const Route = createFileRoute("/resources")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "/resources" }],
  }),
  component: ResourcesPage,
});

import {
  REGISTRY_STATISTICS as DATA,
  STATISTIC_SERIES,
  statisticTotal as total,
  type StatisticSeriesKey,
} from "@/lib/registry-statistics";

const SERIES_ICONS: Record<StatisticSeriesKey, typeof Building2> = {
  companies: Building2,
  partnerships: Users,
  businessNames: Store,
  overseas: Globe2,
  seEeig: Globe2,
};

const SERIES = STATISTIC_SERIES.map((s) => ({ ...s, icon: SERIES_ICONS[s.key] }));

function ResourcesPage() {
  const grandTotal = SERIES.reduce((sum, s) => sum + total(s.key), 0);

  return (
    <div className="relative overflow-hidden">
      {/* Hero */}
      <div className="relative bg-primary py-14 text-primary-foreground">
        <div className="absolute inset-0 grid-dots opacity-20" />
        <div className="absolute -right-20 -top-20 size-80 rounded-full bg-copper/25 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 size-72 rounded-full bg-primary-glow/20 blur-3xl" />
        <div className="relative mx-auto max-w-5xl px-4">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-copper">
            <BarChart3 className="size-4" />
            <span>Resources</span>
          </div>
          <h1 className="mt-3 font-display text-3xl font-bold sm:text-4xl">
            Registry statistics
          </h1>
          <p className="mt-3 max-w-2xl text-sm/6 text-primary-foreground/80">
            Registration of business entities until 31/07/2026. The figures below show the
            number of newly registered business entities with the Registrar of Companies
            between 1 January and 31 July 2026, in total and on a monthly basis.
          </p>
          <p className="mt-4 text-xs uppercase tracking-[0.14em] text-primary-foreground/60">
            Published 10 August 2026
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-12">
        {/* Totals */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SERIES.map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.key}
                className="rounded-xl border border-border bg-card p-5 shadow-sm"
              >
                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  <Icon className="size-4 text-copper" />
                  {s.label}
                </div>
                <div className="mt-3 font-display text-3xl font-bold text-foreground">
                  {total(s.key).toLocaleString("en-GB")}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{s.greek}</p>
              </div>
            );
          })}
          <div className="rounded-xl border border-copper/40 bg-copper/5 p-5 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
              <TrendingUp className="size-4 text-copper" />
              All entities
            </div>
            <div className="mt-3 font-display text-3xl font-bold text-foreground">
              {grandTotal.toLocaleString("en-GB")}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              January – July 2026
            </p>
          </div>
        </div>

        {/* Companies trend */}
        <section className="mt-12">
          <h2 className="font-display text-xl font-semibold text-foreground">
            Company registrations by month
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Limited companies registered with the Registrar, monthly.
          </p>
          <div className="mt-5 h-[320px] rounded-xl border border-border bg-card p-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={DATA} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "0.5rem",
                    fontSize: 12,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="companies"
                  name="Companies"
                  stroke="var(--chart-1)"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Other entity types */}
        <section className="mt-12">
          <h2 className="font-display text-xl font-semibold text-foreground">
            Other entity types by month
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Partnerships, business names, overseas companies and European entities.
          </p>
          <div className="mt-5 h-[340px] rounded-xl border border-border bg-card p-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={DATA} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "0.5rem",
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="businessNames" name="Business Names" fill="var(--chart-3)" radius={[3, 3, 0, 0]} />
                <Bar dataKey="partnerships" name="Partnerships" fill="var(--chart-2)" radius={[3, 3, 0, 0]} />
                <Bar dataKey="overseas" name="Overseas Companies" fill="var(--chart-4)" radius={[3, 3, 0, 0]} />
                <Bar dataKey="seEeig" name="SE & EEIG" fill="var(--chart-5)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Table */}
        <section className="mt-12">
          <h2 className="font-display text-xl font-semibold text-foreground">
            Monthly breakdown
          </h2>
          <div className="mt-5 overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left">
                  <th className="px-4 py-3 font-semibold text-foreground">Entity type</th>
                  {DATA.map((row) => (
                    <th key={row.month} className="px-3 py-3 text-right font-semibold text-foreground">
                      {row.month}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-right font-semibold text-copper">Total</th>
                </tr>
              </thead>
              <tbody>
                {SERIES.map((s) => (
                  <tr key={s.key} className="border-b border-border/60 last:border-0">
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">{s.label}</div>
                      <div className="text-xs text-muted-foreground">{s.greek}</div>
                    </td>
                    {DATA.map((row) => (
                      <td key={row.month} className="px-3 py-3 text-right tabular-nums text-muted-foreground">
                        {row[s.key].toLocaleString("en-GB")}
                      </td>
                    ))}
                    <td className="px-4 py-3 text-right font-semibold tabular-nums text-foreground">
                      {total(s.key).toLocaleString("en-GB")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Source: Department of Registrar of Companies and Intellectual Property, Cyprus.
            Figures cover 1 January – 31 July 2026 and are published monthly.
          </p>
        </section>
      </div>
    </div>
  );
}
