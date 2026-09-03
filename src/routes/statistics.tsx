import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import {
  BarChart3,
  Building2,
  Check,
  Copy,
  Download,
  Globe2,
  Link2,
  RefreshCw,
  Store,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
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
import {
  REGISTRY_STATISTICS,
  STATISTIC_SERIES,
  STATISTICS_LAST_UPDATED,
  STATISTICS_PERIOD,
  statisticsGrandTotal,
  statisticTotal,
  latestTrend,
} from "@/lib/registry-statistics";
import { SITE_URL } from "@/lib/seo/registry-landings";
import { toast } from "sonner";

const PAGE_URL = `${SITE_URL}/statistics`;
const TITLE = "Cyprus registry statistics — free dashboard | Companies House Cyprus";
const DESCRIPTION =
  "Free Cyprus Registrar of Companies statistics dashboard: new registrations by entity category, monthly trends for January–July 2026, last-updated timestamp and shareable charts.";
const SHARE_TEXT =
  "Cyprus registry statistics: monthly new company, partnership, business name and overseas registrations — free dashboard";

export const Route = createFileRoute("/statistics")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "article" },
      { property: "og:url", content: PAGE_URL },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "/statistics" }],
  }),
  component: StatisticsPage,
});

const ICONS = { companies: Building2, partnerships: Users, businessNames: Store, overseas: Globe2, seEeig: Globe2 } as const;

function downloadChartSvg(container: HTMLDivElement | null, filename: string) {
  const svg = container?.querySelector("svg");
  if (!svg) {
    toast.error("Chart not ready yet");
    return;
  }
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("style", "background:#ffffff");
  const blob = new Blob([new XMLSerializer().serializeToString(clone)], {
    type: "image/svg+xml;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  toast.success("Chart downloaded as SVG");
}

function TrendBadge({ value }: { value: number | null }) {
  if (value === null) return null;
  const up = value >= 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-semibold ${
        up ? "text-emerald-600" : "text-red-500"
      }`}
    >
      <Icon className="size-3.5" />
      {up ? "+" : ""}
      {value.toFixed(1)}%
    </span>
  );
}

function StatisticsPage() {
  const trendRef = useRef<HTMLDivElement>(null);
  const categoryRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(PAGE_URL);
      setCopied(true);
      toast.success("Link copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy link");
    }
  };

  const shareLinks = [
    {
      label: "X",
      href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(SHARE_TEXT)}&url=${encodeURIComponent(PAGE_URL)}`,
    },
    {
      label: "LinkedIn",
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(PAGE_URL)}`,
    },
    {
      label: "Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(PAGE_URL)}`,
    },
    {
      label: "WhatsApp",
      href: `https://wa.me/?text=${encodeURIComponent(`${SHARE_TEXT} ${PAGE_URL}`)}`,
    },
  ];

  const categoryData = STATISTIC_SERIES.map((s) => ({
    name: s.label,
    total: statisticTotal(s.key),
    fill: s.color,
  }));

  return (
    <div className="relative overflow-hidden">
      {/* Hero */}
      <div className="relative bg-primary py-14 text-primary-foreground">
        <div className="absolute inset-0 grid-dots opacity-20" />
        <div className="absolute -right-20 -top-20 size-80 rounded-full bg-copper/25 blur-3xl" />
        <div className="relative mx-auto max-w-5xl px-4">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-copper">
            <BarChart3 className="size-4" />
            <span>Free statistics dashboard</span>
          </div>
          <h1 className="mt-3 font-display text-3xl font-bold sm:text-4xl">
            Cyprus registry statistics
          </h1>
          <p className="mt-3 max-w-2xl text-sm/6 text-primary-foreground/80">
            New business entity registrations with the Cyprus Registrar of Companies,
            broken down by category with monthly trends. Free to use and share —
            no account required.
          </p>
          <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-primary-foreground/20 bg-primary-foreground/10 px-3 py-1 text-xs text-primary-foreground/80">
            <RefreshCw className="size-3.5" />
            <time dateTime={STATISTICS_LAST_UPDATED}>
              Last updated: 10 August 2026
            </time>
            <span aria-hidden="true">·</span>
            <span>{STATISTICS_PERIOD}</span>
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-12">
        {/* Counts by category */}
        <section aria-labelledby="counts">
          <h2 id="counts" className="font-display text-xl font-semibold text-foreground">
            Registrations by category
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Total new registrations, {STATISTICS_PERIOD}, with month-over-month change in the latest month.
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {STATISTIC_SERIES.map((s) => {
              const Icon = ICONS[s.key];
              return (
                <div key={s.key} className="rounded-xl border border-border bg-card p-5 shadow-sm">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                      <Icon className="size-4 text-copper" />
                      {s.label}
                    </div>
                    <TrendBadge value={latestTrend(s.key)} />
                  </div>
                  <div className="mt-3 font-display text-3xl font-bold text-foreground tabular-nums">
                    {statisticTotal(s.key).toLocaleString("en-GB")}
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
              <div className="mt-3 font-display text-3xl font-bold text-foreground tabular-nums">
                {statisticsGrandTotal().toLocaleString("en-GB")}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{STATISTICS_PERIOD}</p>
            </div>
          </div>
        </section>

        {/* Monthly trend (shareable) */}
        <section className="mt-12" aria-labelledby="trend">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="trend" className="font-display text-xl font-semibold text-foreground">
                Monthly registration trend
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                New limited companies registered per month.
              </p>
            </div>
            <button
              type="button"
              onClick={() => downloadChartSvg(trendRef.current, "cyprus-company-registrations-trend.svg")}
              className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground shadow-sm hover:bg-muted"
            >
              <Download className="size-3.5" />
              Download chart (SVG)
            </button>
          </div>
          <div ref={trendRef} className="mt-5 h-[320px] rounded-xl border border-border bg-card p-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={REGISTRY_STATISTICS} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
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

        {/* Category totals (shareable) */}
        <section className="mt-12" aria-labelledby="by-category">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="by-category" className="font-display text-xl font-semibold text-foreground">
                Totals by entity category
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Cumulative registrations per entity type, {STATISTICS_PERIOD}.
              </p>
            </div>
            <button
              type="button"
              onClick={() => downloadChartSvg(categoryRef.current, "cyprus-registrations-by-category.svg")}
              className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground shadow-sm hover:bg-muted"
            >
              <Download className="size-3.5" />
              Download chart (SVG)
            </button>
          </div>
          <div ref={categoryRef} className="mt-5 h-[340px] rounded-xl border border-border bg-card p-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={11} interval={0} angle={-12} textAnchor="end" height={60} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "0.5rem",
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="total" name="Registrations" fill="var(--chart-1)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* All series trend */}
        <section className="mt-12" aria-labelledby="all-trends">
          <h2 id="all-trends" className="font-display text-xl font-semibold text-foreground">
            Other entity types by month
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Partnerships, business names, overseas companies and European entities.
          </p>
          <div className="mt-5 h-[340px] rounded-xl border border-border bg-card p-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={REGISTRY_STATISTICS} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
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

        {/* Share */}
        <section className="mt-12 rounded-xl border border-border bg-card p-6" aria-labelledby="share">
          <div className="flex items-center gap-2">
            <Link2 className="size-4 text-copper" />
            <h2 id="share" className="font-display text-lg font-semibold text-foreground">
              Share this dashboard
            </h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            These statistics are free to share and cite with attribution to Companies House Cyprus.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={copyLink}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
            >
              {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              {copied ? "Copied" : "Copy link"}
            </button>
            {shareLinks.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center rounded-md border border-border bg-background px-3 py-2 text-xs font-medium text-foreground hover:bg-muted"
              >
                Share on {s.label}
              </a>
            ))}
          </div>
        </section>

        <p className="mt-8 text-xs text-muted-foreground">
          Source: Department of Registrar of Companies and Intellectual Property, Cyprus.
          Figures cover {STATISTICS_PERIOD} and are published monthly. Looking up a specific
          entity?{" "}
          <Link to="/search" search={{ q: "", page: 1 }} className="font-medium text-copper hover:underline">
            Search the Cyprus company registry
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
