import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  ArrowRight,
  Building2,
  Check,
  FileCheck2,
  Search,
  ShieldCheck,
  Timer,
} from "lucide-react";
import { getCompanyCount } from "@/lib/companies.functions";
import { Button } from "@/components/ui/button";
import { PRODUCTS, formatPrice } from "@/lib/products";

const homeQueryOptions = () =>
  queryOptions({
    queryKey: ["home"],
    queryFn: async () => {
      const count = await getCompanyCount();
      return { count };
    },
  });

const TITLE = "Cyprus company register search & certificates | Companies House Cyprus";
const DESCRIPTION =
  "Search 571,000+ Cyprus companies free — status, directors, shareholders and registered office — and order Registrar certificates with digital delivery.";

export const Route = createFileRoute("/")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(homeQueryOptions());
  },
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HomePage,
});

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

const TICKER = [
  "Certificate of Good Standing · Limassol",
  "Company Profile · HE 252407",
  "KYB Pack · Nicosia",
  "Certificate of Shareholders · Paphos",
  "Credit Report · Larnaca",
  "Certificate of Directors · Nicosia",
  "Tender Pack · Famagusta",
  "Certificate of Incorporation · Limassol",
];


const FEATURED_PRODUCTS = [
  "certificate-of-good-standing",
  "cyprus-company-profile",
  "kyb-due-diligence-pack",
  "certificate-of-directors-and-secretary",
  "cyprus-credit-report",
  "tender-and-bid-pack",
];

function HomePage() {
  const { data } = useSuspenseQuery(homeQueryOptions());
  const navigate = useNavigate();
  const [q, setQ] = useState("");

  return (
    <div>
      {/* Hero — solid navy */}
      <section className="surface-deep relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary via-[oklch(0.28_0.06_255)] to-[oklch(0.38_0.07_245)]" />
        <div className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full bg-accent/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 size-80 rounded-full bg-white/5 blur-3xl" />

        <div className="relative mx-auto max-w-4xl px-4 py-20 text-center lg:py-28">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary-foreground/20 bg-primary-foreground/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary-foreground">
            <span className="size-1.5 rounded-full bg-accent" />
            Official Registrar data · {data.count.toLocaleString()} entities
          </span>

          <h1 className="mt-8 text-4xl font-bold leading-[1.12] tracking-tight text-primary-foreground md:text-5xl lg:text-6xl">
            Every Cyprus company. <span className="text-gradient-copper">One search.</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-primary-foreground/80">
            Free access to the full register of the Department of Registrar of Companies — status, directors,
            shareholders and registered office — plus certified certificates delivered digitally.
          </p>

          <form
            className="mx-auto mt-8 max-w-2xl"
            onSubmit={(event) => {
              event.preventDefault();
              navigate({ to: "/search", search: { q: q.trim(), page: 1 } });
            }}
          >
            <div className="flex flex-col gap-2 rounded-xl border border-primary-foreground/15 bg-white/10 p-2 sm:flex-row">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-primary-foreground/50" />
                <input
                  value={q}
                  onChange={(event) => setQ(event.target.value)}
                  type="search"
                  aria-label="Search Cyprus companies"
                  placeholder="Company name or HE number…"
                  className="h-12 w-full rounded-lg bg-transparent pl-10 pr-3 text-base text-primary-foreground placeholder:text-primary-foreground/50 outline-none"
                />
              </div>
              <Button type="submit" size="lg" className="h-12 bg-accent px-7 text-accent-foreground hover:bg-accent/90">
                Search register
              </Button>
            </div>
            <p className="mt-3 text-sm text-primary-foreground/60">
              Try “SOFTBOT” or “HE 252407”.
            </p>
          </form>

          <dl className="mx-auto mt-12 flex flex-wrap justify-center gap-x-10 gap-y-4 border-t border-primary-foreground/15 pt-8">
            {[
              [data.count.toLocaleString(), "Companies indexed"],
              ["6", "Districts"],
              ["1–2 days", "Certificate delivery"],
              ["100%", "Registrar sourced"],
            ].map(([value, label]) => (
              <div key={label} className="text-center">
                <dt className="font-display text-2xl font-bold text-accent">{value}</dt>
                <dd className="mt-1 text-sm text-primary-foreground/70">{label}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Ticker */}
      <div className="overflow-hidden border-y bg-sand py-3">
        <div className="flex w-max animate-marquee gap-8 whitespace-nowrap text-xs text-muted-foreground">
          {[...TICKER, ...TICKER].map((item, index) => (
            <span key={`${item}-${index}`} className="inline-flex items-center gap-2">
              <FileCheck2 className="size-3.5 text-olive" />
              {item}
            </span>
          ))}
        </div>
      </div>

      {/* Documents grid */}
      <section className="mx-auto max-w-7xl px-4 py-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Documents</p>
            <h2 className="mt-3 text-3xl font-bold text-foreground">Order what the other side actually asks for</h2>
          </div>
          <Button asChild variant="outline">
            <Link to="/pricing">
              All products <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {PRODUCTS.filter((product) => FEATURED_PRODUCTS.includes(product.slug)).map((product) => (
            <Link
              key={product.slug}
              to="/report/$type"
              params={{ type: product.slug }}
              className="group flex flex-col rounded-xl border bg-card p-6 shadow-panel transition-all hover:-translate-y-0.5 hover:shadow-lift"
            >
              <span className="text-[11px] font-semibold uppercase tracking-wide text-accent">{product.eyebrow}</span>
              <h3 className="mt-2 font-display text-lg font-semibold text-card-foreground">{product.name}</h3>
              <p className="mt-2 flex-1 text-sm text-muted-foreground">{product.tagline}</p>
              <div className="mt-5 flex items-center justify-between border-t border-border pt-4 text-sm">
                <span className="font-semibold text-foreground">{formatPrice(product.price)}</span>
                <span className="inline-flex items-center gap-1 text-accent group-hover:underline">
                  Details <ArrowRight className="size-3.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Trust features */}
      <section className="border-y bg-sand">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 md:grid-cols-3">
          {[
            { icon: ShieldCheck, title: "Registrar sourced", body: "Every field traceable to the official Cyprus register — nothing inferred." },
            { icon: Timer, title: "Fast turnaround", body: "Profiles the same business day, certificates in one to two business days." },
            { icon: Building2, title: "Whole-of-register coverage", body: "Companies, partnerships and overseas branches across all six districts." },
          ].map((item) => (
            <div key={item.title} className="flex gap-4">
              <item.icon className="size-6 shrink-0 text-accent" />
              <div>
                <h3 className="font-display font-semibold text-foreground">{item.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{item.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Browse A–Z */}
      <section className="mx-auto max-w-7xl px-4 py-20">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Browse A–Z</p>
          <h2 className="mt-3 text-3xl font-bold text-foreground">Alphabetical index of the register</h2>
          <div className="mt-8 grid grid-cols-6 gap-2 sm:grid-cols-9">
            {LETTERS.map((letter) => (
              <Link
                key={letter}
                to="/companies/a-z/$letter"
                params={{ letter: letter.toLowerCase() }}
                className="flex aspect-square items-center justify-center rounded-lg border bg-card text-sm font-medium text-card-foreground transition-colors hover:border-accent hover:text-accent"
              >
                {letter}
              </Link>
            ))}
          </div>
          <ul className="mt-8 space-y-2 text-sm text-muted-foreground">
            {[
              "Free to search, no account required",
              "Officials & owners and registered office on every profile",
              "Certificates orderable directly from a company page",
            ].map((item) => (
              <li key={item} className="flex gap-2">
                <Check className="mt-0.5 size-4 shrink-0 text-olive" /> {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 pb-24">
        <div className="surface-deep grid-dots flex flex-col gap-6 rounded-2xl p-10 md:flex-row md:items-center md:justify-between md:p-14">
          <div>
            <h2 className="text-3xl font-bold text-primary-foreground">Need a certificate today?</h2>
            <p className="mt-3 max-w-xl text-primary-foreground/75">
              Find the company, add the document, and our registry team takes it from there.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Link to="/search" search={{ q: "", page: 1 }}>
                Search the register
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10">
              <Link to="/contact">Talk to our team</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
