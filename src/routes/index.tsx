import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowRight, Building2, Check, FileCheck2, Search, ShieldCheck, Timer } from "lucide-react";
import { getCompanyCount, getDistricts } from "@/lib/companies.functions";
import { Button } from "@/components/ui/button";
import { PRODUCTS, formatPrice } from "@/lib/products";

const homeQueryOptions = () =>
  queryOptions({
    queryKey: ["home"],
    queryFn: async () => {
      const [count, districts] = await Promise.all([getCompanyCount(), getDistricts()]);
      return { count, districts };
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

function HomePage() {
  const { data } = useSuspenseQuery(homeQueryOptions());
  const navigate = useNavigate();
  const [q, setQ] = useState("");

  return (
    <div>
      <section className="surface-deep grid-dots relative overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 py-20 md:py-28">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium">
            <span className="size-1.5 rounded-full bg-copper" />
            Official Registrar data · {data.count.toLocaleString()} entities
          </span>
          <h1 className="mt-6 max-w-3xl text-4xl font-bold leading-[1.08] md:text-6xl">
            Every Cyprus company. <span className="text-gradient-copper">One search.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-primary-foreground/75">
            Free access to the full register of the Department of Registrar of Companies — status, directors,
            shareholders and registered office — plus certified certificates delivered digitally.
          </p>

          <form
            className="mt-10 max-w-2xl"
            onSubmit={(event) => {
              event.preventDefault();
              navigate({ to: "/search", search: { q: q.trim(), page: 1 } });
            }}
          >
            <div className="flex flex-col gap-2 rounded-xl border border-white/15 bg-white/10 p-2 backdrop-blur sm:flex-row">
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
              <Button type="submit" size="lg" className="h-12 bg-copper px-7 text-copper-foreground hover:bg-copper/90">
                Search register
              </Button>
            </div>
            <p className="mt-3 text-sm text-primary-foreground/60">
              Try “SOFTBOT”, “HE 252407” or browse by district below.
            </p>
          </form>

          <dl className="mt-14 grid gap-8 border-t border-white/15 pt-8 sm:grid-cols-4">
            {[
              [data.count.toLocaleString(), "Companies indexed"],
              ["6", "Districts"],
              ["1–2 days", "Certificate delivery"],
              ["100%", "Registrar sourced"],
            ].map(([value, label]) => (
              <div key={label}>
                <dt className="font-display text-2xl font-bold text-copper">{value}</dt>
                <dd className="mt-1 text-sm text-primary-foreground/70">{label}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

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

      <section className="mx-auto max-w-7xl px-4 py-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-copper">Documents</p>
            <h2 className="mt-3 text-3xl font-bold">Order what the other side actually asks for</h2>
          </div>
          <Button asChild variant="outline">
            <Link to="/pricing">
              All products <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {PRODUCTS.filter((product) => ["certificate-of-good-standing", "cyprus-company-profile", "kyb-due-diligence-pack", "certificate-of-directors-and-secretary", "cyprus-credit-report", "tender-and-bid-pack"].includes(product.slug)).map(
            (product) => (
              <Link
                key={product.slug}
                to="/report/$type"
                params={{ type: product.slug }}
                className="group flex flex-col rounded-xl border bg-card p-6 shadow-panel transition-all hover:-translate-y-0.5 hover:shadow-lift"
              >
                <span className="text-[11px] font-semibold uppercase tracking-wide text-copper">{product.eyebrow}</span>
                <h3 className="mt-2 font-display text-lg font-semibold">{product.name}</h3>
                <p className="mt-2 flex-1 text-sm text-muted-foreground">{product.tagline}</p>
                <div className="mt-5 flex items-center justify-between border-t pt-4 text-sm">
                  <span className="font-semibold">{formatPrice(product.price)}</span>
                  <span className="inline-flex items-center gap-1 text-copper group-hover:underline">
                    Details <ArrowRight className="size-3.5" />
                  </span>
                </div>
              </Link>
            ),
          )}
        </div>
      </section>

      <section className="border-y bg-sand">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 md:grid-cols-3">
          {[
            { icon: ShieldCheck, title: "Registrar sourced", body: "Every field traceable to the official Cyprus register — nothing inferred." },
            { icon: Timer, title: "Fast turnaround", body: "Profiles the same business day, certificates in one to two business days." },
            { icon: Building2, title: "Whole-of-register coverage", body: "Companies, partnerships and overseas branches across all six districts." },
          ].map((item) => (
            <div key={item.title} className="flex gap-4">
              <item.icon className="size-6 shrink-0 text-copper" />
              <div>
                <h3 className="font-display font-semibold">{item.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{item.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.1fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-copper">Browse by district</p>
            <h2 className="mt-3 text-3xl font-bold">Where the company is registered</h2>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {data.districts.map((district) => (
                <Link
                  key={district.name}
                  to="/companies/city/$district"
                  params={{ district: district.name }}
                  className="flex items-center justify-between rounded-lg border bg-card px-4 py-3.5 transition-colors hover:border-copper"
                >
                  <span className="font-medium capitalize">{district.name}</span>
                  <span className="text-sm text-muted-foreground">{district.count.toLocaleString()}</span>
                </Link>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-copper">Browse A–Z</p>
            <h2 className="mt-3 text-3xl font-bold">Alphabetical index of the register</h2>
            <div className="mt-8 grid grid-cols-6 gap-2 sm:grid-cols-9">
              {LETTERS.map((letter) => (
                <Link
                  key={letter}
                  to="/companies/a-z/$letter"
                  params={{ letter: letter.toLowerCase() }}
                  className="flex aspect-square items-center justify-center rounded-lg border bg-card text-sm font-medium transition-colors hover:border-copper hover:text-copper"
                >
                  {letter}
                </Link>
              ))}
            </div>
            <ul className="mt-8 space-y-2 text-sm text-muted-foreground">
              {[
                "Free to search, no account required",
                "Officials and registered office on every profile",
                "Certificates orderable directly from a company page",
              ].map((item) => (
                <li key={item} className="flex gap-2">
                  <Check className="mt-0.5 size-4 shrink-0 text-olive" /> {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-24">
        <div className="surface-deep grid-dots flex flex-col gap-6 rounded-2xl p-10 md:flex-row md:items-center md:justify-between md:p-14">
          <div>
            <h2 className="text-3xl font-bold">Need a certificate today?</h2>
            <p className="mt-3 max-w-xl text-primary-foreground/75">
              Find the company, add the document, and our registry team takes it from there.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg" className="bg-copper text-copper-foreground hover:bg-copper/90">
              <Link to="/search" search={{ q: "", page: 1 }}>Search the register</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-white/30 bg-transparent text-primary-foreground hover:bg-white/10">
              <Link to="/contact">Talk to our team</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

