import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import {
  BarChart3,
  Check,
  Copy,
  Download,
  Languages,
  Link2,
  RefreshCw,
  Type,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import {
  formatComputedAt,
  industrySignals,
  letterDistribution,
} from "@/lib/company-name-stats";
import { getCompanyNameStats } from "@/lib/company-name-stats.functions";
import { formatEntityCount } from "@/lib/registry-stats";
import { SITE_URL } from "@/lib/seo/registry-landings";
import { toast } from "sonner";

const PAGE_URL = `${SITE_URL}/statistics/company-names`;
const TITLE = "Cyprus company name statistics — trends & patterns | Companies House Cyprus";
const DESCRIPTION =
  "What do 570,000+ Cyprus company names reveal? Most common words, industry keywords, language split, first letters and name lengths across the entire Cyprus company registry.";
const SHARE_TEXT =
  "Cyprus company name statistics: the most common words and industry patterns across 570k+ registered entities";

export const Route = createFileRoute("/statistics_/company-names")({
  loader: () => getCompanyNameStats(),
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
    links: [{ rel: "canonical", href: "/statistics/company-names" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
            { "@type": "ListItem", position: 2, name: "Statistics", item: `${SITE_URL}/statistics` },
            { "@type": "ListItem", position: 3, name: "Company name statistics", item: PAGE_URL },
          ],
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Dataset",
          name: "Cyprus company name statistics",
          description: DESCRIPTION,
          url: PAGE_URL,
          license: "https://creativecommons.org/licenses/by/4.0/",
          creator: { "@type": "Organization", name: "Companies House Cyprus", url: SITE_URL },
        }),
      },
    ],
  }),
  component: CompanyNameStatsPage,
});

const SCRIPT_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)"];

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

function ChartCard({
  id,
  title,
  description,
  filename,
  chartRef,
  height = 340,
  children,
}: {
  id: string;
  title: string;
  description: string;
  filename: string;
  chartRef: React.RefObject<HTMLDivElement | null>;
  height?: number;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-12" aria-labelledby={id}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id={id} className="font-display text-xl font-semibold text-foreground">
            {title}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        <button
          type="button"
          onClick={() => downloadChartSvg(chartRef.current, filename)}
          className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground shadow-sm hover:bg-muted"
        >
          <Download className="size-3.5" />
          Download chart (SVG)
        </button>
      </div>
      <div ref={chartRef} className="mt-5 rounded-xl border border-border bg-card p-4" style={{ height }}>
        {children}
      </div>
    </section>
  );
}

const tooltipStyle = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: "0.5rem",
  fontSize: 12,
} as const;

function CompanyNameStatsPage() {
  const stats = Route.useLoaderData();
  const wordsRef = useRef<HTMLDivElement>(null);
  const industryRef = useRef<HTMLDivElement>(null);
  const lettersRef = useRef<HTMLDivElement>(null);
  const lengthsRef = useRef<HTMLDivElement>(null);
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

  return (
    <div className="relative overflow-hidden">
      {/* Hero */}
      <div className="relative bg-primary py-14 text-primary-foreground">
        <div className="absolute inset-0 grid-dots opacity-20" />
        <div className="absolute -right-20 -top-20 size-80 rounded-full bg-copper/25 blur-3xl" />
        <div className="relative mx-auto max-w-5xl px-4">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-copper">
            <Type className="size-4" />
            <span>Free statistics dashboard</span>
          </div>
          <h1 className="mt-3 font-display text-3xl font-bold sm:text-4xl">
            Cyprus company name statistics
          </h1>
          <p className="mt-3 max-w-2xl text-sm/6 text-primary-foreground/80">
            What the names of {formatEntityCount(stats?.total)} registered Cyprus entities reveal:
            the most common words, the industries they signal, the languages they use and how
            they are structured. Free to use and share — no account required.
          </p>
          {stats && (
            <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-primary-foreground/20 bg-primary-foreground/10 px-3 py-1 text-xs text-primary-foreground/80">
              <BarChart3 className="size-3.5" />
              <span>{stats.total.toLocaleString("en-GB")} registered entities</span>
              <span aria-hidden="true">·</span>
              <span>Cyprus company registry</span>
            </p>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-12">
        {!stats ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
            Name statistics are temporarily unavailable — please check back shortly.
          </div>
        ) : (
          <>
            {/* Language split */}
            <section aria-labelledby="language">
              <h2 id="language" className="font-display text-xl font-semibold text-foreground">
                Name language split
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Entity names by writing script, across the whole registry.
              </p>
              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                {[
                  { label: "Latin script", greek: "e.g. ACME TRADING LTD", value: stats.scripts.latin, icon: Type },
                  { label: "Greek script", greek: "e.g. ΕΤΑΙΡΕΙΑ ΛΤΔ", value: stats.scripts.greek, icon: Languages },
                  { label: "Mixed script", greek: "Greek and Latin together", value: stats.scripts.mixed, icon: Languages },
                ].map((s) => {
                  const Icon = s.icon;
                  const pct = ((s.value / stats.total) * 100).toFixed(1);
                  return (
                    <div key={s.label} className="rounded-xl border border-border bg-card p-5 shadow-sm">
                      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                        <Icon className="size-4 text-copper" />
                        {s.label}
                      </div>
                      <div className="mt-3 font-display text-3xl font-bold text-foreground tabular-nums">
                        {s.value.toLocaleString("en-GB")}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {pct}% of all entities · {s.greek}
                      </p>
                    </div>
                  );
                })}
              </div>
              <div className="mt-5 h-[260px] rounded-xl border border-border bg-card p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: "Latin script", value: stats.scripts.latin },
                        { name: "Greek script", value: stats.scripts.greek },
                        { name: "Mixed script", value: stats.scripts.mixed },
                      ]}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={55}
                      outerRadius={90}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}
                      fontSize={11}
                    >
                      {SCRIPT_COLORS.map((color) => (
                        <Cell key={color} fill={color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </section>

            {/* Most common words */}
            <ChartCard
              id="words"
              title="Most common words in company names"
              description="The 25 words that appear most often in registered Cyprus entity names."
              filename="cyprus-company-names-common-words.svg"
              chartRef={wordsRef}
              height={420}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={stats.top_words.slice(0, 25).map((w) => ({
                    word: w.word,
                    count: w.count,
                    pct: ((w.count / stats.total) * 100).toFixed(1),
                  }))}
                  layout="vertical"
                  margin={{ top: 0, right: 40, left: 10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis type="number" stroke="var(--muted-foreground)" fontSize={12} />
                  <YAxis type="category" dataKey="word" stroke="var(--muted-foreground)" fontSize={11} width={110} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => value.toLocaleString("en-GB")} />
                  <Bar dataKey="count" name="Entities" fill="var(--chart-1)" radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Industry signals */}
            <ChartCard
              id="industries"
              title="Industry signals in names"
              description="Entity names associated with each line of business."
              filename="cyprus-company-names-industries.svg"
              chartRef={industryRef}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={industrySignals(stats)} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={10} interval={0} angle={-18} textAnchor="end" height={80} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => value.toLocaleString("en-GB")} />
                  <Bar dataKey="count" name="Entities" fill="var(--chart-2)" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* First letters */}
            <ChartCard
              id="letters"
              title="First letter of company names"
              description="Distribution of the initial letter of registered entity names."
              filename="cyprus-company-names-first-letters.svg"
              chartRef={lettersRef}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={letterDistribution(stats)} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="letter" stroke="var(--muted-foreground)" fontSize={12} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => value.toLocaleString("en-GB")} />
                  <Bar dataKey="count" name="Entities" fill="var(--chart-3)" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Name lengths */}
            <ChartCard
              id="lengths"
              title="Name length distribution"
              description="Character count of registered entity names, bucketed."
              filename="cyprus-company-names-lengths.svg"
              chartRef={lengthsRef}
              height={300}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.lengths} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="bucket" stroke="var(--muted-foreground)" fontSize={12} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => value.toLocaleString("en-GB")} />
                  <Bar dataKey="count" name="Entities" fill="var(--chart-4)" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </>
        )}

        {/* Share */}
        <section className="mt-12 rounded-xl border border-border bg-card p-6" aria-labelledby="share">
          <div className="flex items-center gap-2">
            <Link2 className="size-4 text-copper" />
            <h2 id="share" className="font-display text-lg font-semibold text-foreground">
              Share this analysis
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
          Looking for registration trends instead?{" "}
          <Link to="/statistics" className="font-medium text-copper hover:underline">
            See monthly registration statistics
          </Link>
          {" "}or{" "}
          <Link to="/search" search={{ q: "", page: 1 }} className="font-medium text-copper hover:underline">
            search the registry
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
