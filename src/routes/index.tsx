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
import { trackEvent } from "@/lib/analytics";
import {
  HOME_TITLE,
  HOME_DESCRIPTION,
  buildHomeHead,
} from "@/lib/home-head";
import { homeWebsiteJsonLd, homeOrganizationJsonLd } from "@/lib/home-jsonld";

const homeQueryOptions = () =>
  queryOptions({
    queryKey: ["home"],
    queryFn: async () => {
      const count = await getCompanyCount();
      return { count };
    },
  });

const TITLE = HOME_TITLE;
const DESCRIPTION = HOME_DESCRIPTION;

const FAQS = [
  {
    q: "Is there a Companies House in Cyprus?",
    a: "Not under that name. The Cyprus equivalent of Companies House is the Department of Registrar of Companies and Intellectual Property (DRCIP), which keeps the official register of companies, partnerships, business names and overseas branches and issues all certified certificates.",
  },
  {
    q: "What is the difference between Cyprus Companies House and UK Companies House?",
    a: "UK Companies House registers companies in the United Kingdom. Cyprus companies are registered with the DRCIP in Nicosia and carry prefixed registry numbers such as HE 252407. Companies House Cyprus is an independent commercial service that republishes Cyprus registry data for free searching and orders official documents from the Registrar.",
  },
  {
    q: "Is Companies House Cyprus the official Registrar?",
    a: "No. We are an independent commercial service operated by Infocredit Group Limited (HE4404). We publish company information sourced from the Department of Registrar of Companies and Intellectual Property and sell certificates and reports on request.",
  },

  {
    q: "Is searching Cyprus companies free?",
    a: "Yes. Searching the register and viewing company status, registration number, type, registration date and registered office is free and needs no account. Directors, shareholders and detailed reports require a paid Company Profile Report or certificate.",
  },
  {
    q: "How do I search by HE number?",
    a: "Type the registry number in the search box, with or without the prefix — for example HE 252407, HE252407 or 252407. Company names in English or Greek also work, including transliterated spellings.",
  },
  {
    q: "How fast are certificates delivered?",
    a: "Company profiles are usually issued the same business day. Official certificates from the Registrar are typically delivered within one to two business days, by email and in your account.",
  },
  {
    q: "How current is the company data?",
    a: "The register copy is refreshed regularly from the Registrar's published datasets. Each company profile shows what we hold, and certificates are always ordered fresh from the Registrar.",
  },
];



export const Route = createFileRoute("/")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(homeQueryOptions());
  },
  head: () => ({
    ...buildHomeHead(),
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(homeWebsiteJsonLd()),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify(homeOrganizationJsonLd()),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: FAQS.map((item) => ({
            "@type": "Question",
            name: item.q,
            acceptedAnswer: { "@type": "Answer", text: item.a },
          })),
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            {
              "@type": "ListItem",
              position: 1,
              name: "Home",
              item: "https://companieshousecyprus.com/",
            },
          ],
        }),
      },
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
  const entityCount = data.count === null ? "Cyprus register" : `${data.count.toLocaleString()} entities`;

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
            Official Registrar data · {entityCount}
          </span>

          <h1 className="mt-8 text-4xl font-bold leading-[1.12] tracking-tight text-primary-foreground md:text-5xl lg:text-6xl">
            Registrar of Companies Cyprus search. <span className="text-gradient-copper">Companies House Cyprus, free.</span>
          </h1>


          <p className="mx-auto mt-6 max-w-2xl text-lg text-primary-foreground/80">
            Free Cyprus company search from official Registrar data — look up status, registration number, type and
            registered office. Order Company Profile Reports, Credit Reports, Sanctions Snapshots and official
            certificates with digital delivery. Independent service, not the Registrar.
          </p>


          <form
            className="mx-auto mt-8 max-w-2xl"
            onSubmit={(event) => {
              event.preventDefault();
              trackEvent("search_start", { query: q.trim().slice(0, 120), source: "homepage_hero" });
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
              [data.count === null ? "Register-wide" : data.count.toLocaleString(), "Companies indexed"],
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

      {/* New product promo — Sanctions Risk Snapshot */}
      <section className="mx-auto max-w-7xl px-4 pt-12">
        <div className="relative overflow-hidden rounded-2xl border border-accent/30 bg-gradient-to-br from-primary via-[oklch(0.28_0.06_255)] to-[oklch(0.34_0.07_248)] p-6 md:p-10">
          <div className="pointer-events-none absolute -right-20 -top-20 size-72 rounded-full bg-accent/15 blur-3xl" />
          <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-accent">
                <ShieldCheck className="size-3.5" />
                New product
              </span>
              <h2 className="mt-4 font-display text-2xl font-bold text-primary-foreground md:text-3xl">
                Sanctions Risk Snapshot — screen a Cyprus company in minutes
              </h2>
              <p className="mt-3 text-primary-foreground/80">
                We screen a company&apos;s legal name, previous names and corporate shareholders against the official
                EU, UN, UK and US sanctions lists, and return a timestamped, explainable report — matching and
                conflicting attributes, confidence band and plain-language rationale. Legal entities only.
              </p>
              <ul className="mt-5 grid gap-2 sm:grid-cols-2">
                {[
                  "EU FSF, UN, UKSL and OFAC SDN checked separately",
                  "Current and previous legal names screened",
                  "Full audit trail of what was checked and when",
                  "Same-day delivery, downloadable PDF",
                ].map((point) => (
                  <li key={point} className="flex items-start gap-2 text-sm text-primary-foreground/85">
                    <Check className="mt-0.5 size-4 shrink-0 text-accent" />
                    {point}
                  </li>
                ))}
              </ul>
            </div>

            <div className="shrink-0 rounded-xl border border-primary-foreground/15 bg-white/10 p-6 text-center lg:w-64">
              <p className="text-xs font-semibold uppercase tracking-wider text-primary-foreground/70">From</p>
              <p className="mt-1 font-display text-4xl font-bold text-accent">
                {formatPrice(PRODUCTS.find((p) => p.slug === "sanctions-risk-snapshot")?.price ?? 29)}
              </p>
              <p className="mt-1 text-sm text-primary-foreground/70">per company · same day</p>
              <Button asChild size="lg" className="mt-5 w-full bg-accent text-accent-foreground hover:bg-accent/90">
                <Link to="/report/$type" params={{ type: "sanctions-risk-snapshot" }}>
                  See what&apos;s included
                  <ArrowRight className="ml-1 size-4" />
                </Link>
              </Button>
              <Link
                to="/search"
                search={{ q: "", page: 1 }}
                className="mt-3 inline-block text-sm text-primary-foreground/70 underline hover:text-primary-foreground"
              >
                Find a company first
              </Link>
            </div>
          </div>
        </div>
      </section>


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

      {/* Registry explained + comparison */}
      <section className="mx-auto max-w-7xl px-4 py-20">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">The registry, explained</p>
          <h2 className="mt-3 text-3xl font-bold text-foreground">What “Companies House Cyprus” actually refers to</h2>
          <div className="mt-6 space-y-4 text-sm leading-relaxed text-muted-foreground">
            <p>
              Cyprus has no body literally called “Companies House” — that name belongs to the UK register. The Cypriot
              equivalent is the <strong className="text-foreground">Department of Registrar of Companies and Intellectual
              Property (DRCIP)</strong>, part of the Ministry of Energy, Commerce and Industry. It maintains the official
              register of every Cyprus company, partnership, business name and overseas branch, and it alone can issue
              certified copies and certificates with legal standing.
            </p>
            <p>
              Every entity on the register carries a unique registry number — <strong className="text-foreground">HE</strong> for
              limited companies, <strong className="text-foreground">S</strong>/<strong className="text-foreground">B</strong> for
              partnerships and business names, <strong className="text-foreground">AE</strong> for overseas companies — together
              with its registration date, registered office, status (active, dissolved, struck off) and its directors,
              secretary and shareholders as filed. This is the data lenders, counterparties and regulators mean when they
              ask you to “check Companies House in Cyprus”.
            </p>
            <p>
              Companies House Cyprus (this site) is an independent commercial service, operated by Infocredit Group
              Limited (HE4404), that republishes that registry data for free searching and orders official documents from
              the Registrar on your behalf.
            </p>
            <p>
              Full background — registry numbers, what is free versus paid, how the Cyprus register compares with UK
              Companies House — is in our guide:{" "}
              <Link to="/guides/companies-house-cyprus" className="text-accent underline">
                Companies House Cyprus explained
              </Link>
              . You can also{" "}
              <Link to="/search" search={{ q: "", page: 1 }} className="text-accent underline">
                run a Cyprus company search
              </Link>{" "}
              straight away.
            </p>
          </div>
        </div>

        {/* Registry number formats */}
        <div className="mt-12 rounded-xl border bg-sand p-6 md:p-8">
          <h3 className="font-display text-lg font-semibold text-foreground">
            Cyprus registry number formats — HE, S, B and the rest
          </h3>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Every entity on the Cyprus register carries a prefixed registry number. The prefix tells you the entity
            type, and you can search with or without it — HE 252407, HE252407 and 252407 all resolve to the same record.
          </p>
          <dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ["HE", "Private and public limited companies — the most common Cyprus entity."],
              ["C", "Legacy company records issued before the current HE numbering."],
              ["S", "Partnerships — general and limited."],
              ["B", "Business names (trading names) registered by a person or company."],
              ["EE", "Business name filings recorded in Greek script."],
              ["AE", "Overseas companies and branches registered in Cyprus."],
            ].map(([prefix, meaning]) => (
              <div key={prefix} className="rounded-lg border bg-card p-4">
                <dt className="font-mono text-base font-bold text-accent">{prefix}</dt>
                <dd className="mt-1 text-sm text-muted-foreground">{meaning}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* How to search, step by step */}
        <div className="mt-8 rounded-xl border bg-card p-6 shadow-panel md:p-8">
          <h3 className="font-display text-lg font-semibold text-card-foreground">
            How to search Companies House Cyprus, step by step
          </h3>
          <ol className="mt-5 space-y-4 text-sm leading-relaxed text-muted-foreground">
            <li>
              <strong className="text-foreground">1. Enter a name or number.</strong> Type a full or partial company
              name in English or Greek, or the registry number in any format. Transliterated spellings are matched too.
            </li>
            <li>
              <strong className="text-foreground">2. Narrow the results.</strong> Result rows show registered name,
              registry number, entity type, registration date and current status; filter by type or status to isolate
              active companies, partnerships or business names.
            </li>
            <li>
              <strong className="text-foreground">3. Open the company profile.</strong> Free on every profile: status,
              registry number, entity type, registration date, company age, registered office and district.
            </li>
            <li>
              <strong className="text-foreground">4. Order what you need.</strong> Directors, secretary and
              shareholders come with a paid Company Profile Report; certified Registrar certificates can be added from
              the same page and arrive by email.
            </li>
          </ol>
          <p className="mt-5 text-sm text-muted-foreground">
            Prefer to browse? Use the{" "}
            <Link to="/companies/a-z/$letter" params={{ letter: "a" }} className="text-accent underline">
              A–Z index
            </Link>{" "}
            or read the full{" "}
            <Link to="/guides/companies-house-cyprus" className="text-accent underline">
              Companies House Cyprus guide
            </Link>
            .
          </p>
        </div>



        <div className="mt-12 overflow-hidden rounded-xl border bg-card shadow-panel">
          <div className="border-b bg-sand px-6 py-4">
            <h3 className="font-display text-lg font-semibold text-card-foreground">
              Official Registrar vs. Companies House Cyprus — which do you need?
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-6 py-3 font-semibold">Task</th>
                  <th className="px-6 py-3 font-semibold">Official Registrar (DRCIP)</th>
                  <th className="px-6 py-3 font-semibold">Companies House Cyprus (this site)</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {[
                  ["Search companies free online", "Limited public search", "Full free search, English & Greek, no account"],
                  ["View status, registration number, registered office", "On-site or e-filing access", "Free on any company profile"],
                  ["View directors, shareholders, filing history", "On-site or e-filing access", "Paid Company Profile Report"],
                  ["Company incorporation and filings", "Yes — filings must go to DRCIP", "No — we never file with the Registrar"],
                  ["Certified certificates (legal standing)", "Issues all official certificates", "Orders them from DRCIP for you, delivered digitally"],
                  ["Company profiles, credit & KYB reports", "Not offered", "Same-day digital reports"],
                  ["Typical turnaround", "Days, in person or by post", "1–2 business days, by email"],
                ].map(([task, official, ours]) => (
                  <tr key={task} className="align-top">
                    <td className="px-6 py-4 font-medium text-foreground">{task}</td>
                    <td className="px-6 py-4 text-muted-foreground">{official}</td>
                    <td className="px-6 py-4 text-muted-foreground">{ours}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Not affiliated with, or endorsed by, the Department of Registrar of Companies and Intellectual Property.
          For incorporation and statutory filings, always use the official Registrar.
        </p>
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

      {/* How it works */}
      <section className="border-y bg-sand">
        <div className="mx-auto max-w-7xl px-4 py-20">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">How it works</p>
          <h2 className="mt-3 text-3xl font-bold text-foreground">From search to certified document in three steps</h2>
          <ol className="mt-10 grid gap-6 md:grid-cols-3">
            {[
              {
                title: "1. Search the register",
                body: "Enter a company name in English or Greek, or an HE number with or without the prefix. Results show status, type and district instantly — free, no account.",
              },
              {
                title: "2. Open the company profile",
                body: "See registration date, company age, registered office, officials and owners where we hold them, plus the documents available for that entity.",
              },
              {
                title: "3. Order and receive",
                body: "Add certificates or reports to your basket, pay online, and track delivery in your account. Documents arrive by email, typically in 1–2 business days.",
              },
            ].map((step) => (
              <li key={step.title} className="rounded-xl border bg-card p-6 shadow-panel">
                <h3 className="font-display text-lg font-semibold text-card-foreground">{step.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-4 py-20">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">FAQ</p>
        <h2 className="mt-3 text-3xl font-bold text-foreground">Common questions about the Cyprus register</h2>
        <dl className="mt-8 divide-y divide-border border-y">
          {FAQS.map((item) => (
            <div key={item.q} className="py-5">
              <dt className="font-display font-semibold text-foreground">{item.q}</dt>
              <dd className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.a}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-6 text-sm text-muted-foreground">
          More detail on coverage and sources on our{" "}
          <Link to="/about" className="text-accent underline">about page</Link>, or see the{" "}
          <Link to="/cyprus-companies-registry" className="text-accent underline">Cyprus companies registry guide</Link>.
        </p>
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
