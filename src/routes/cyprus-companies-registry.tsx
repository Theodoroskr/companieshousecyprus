import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowRight,
  Building2,
  Check,
  FileCheck2,
  MapPin,
  Search,
  ShieldCheck,
  Timer,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const TITLE = "Cyprus Companies Registry — Free Register Search & Official Documents";
const DESCRIPTION =
  "Search the Cyprus companies registry free: company status, registration number, directors, shareholders and registered office — plus official Registrar certificates delivered digitally.";
const CANONICAL = "https://companieshousecyprus.com/cyprus-companies-registry";

export const Route = createFileRoute("/cyprus-companies-registry")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: CANONICAL },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
    ],
    links: [{ rel: "canonical", href: CANONICAL }],
    scripts: [
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
            {
              "@type": "ListItem",
              position: 2,
              name: "Cyprus companies registry",
              item: CANONICAL,
            },
          ],
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: [
            {
              "@type": "Question",
              name: "Is searching the Cyprus companies registry free?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Yes. Searching company names and registration numbers, and viewing company profiles with status, registered office and officials on record, is free and requires no account. Only official Registrar certificates and reports are paid.",
              },
            },
            {
              "@type": "Question",
              name: "Where does the registry data come from?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Every field is sourced from the Cyprus Department of Registrar of Companies and Intellectual Property. Nothing is inferred or estimated.",
              },
            },
            {
              "@type": "Question",
              name: "What is a Cyprus registration number?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Cyprus entities carry a Registrar number prefixed by entity type, for example HE for limited companies, C for older company records, EE for business names and S for partnerships. You can search by number or by name.",
              },
            },
            {
              "@type": "Question",
              name: "How long does an official certificate take?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Company profiles and structure reports are usually produced the same business day. Certified Registrar certificates are typically delivered in one to two business days by email.",
              },
            },
          ],
        }),
      },
    ],
  }),
  component: RegistryLandingPage,
});

const SEARCHABLE = [
  {
    icon: Building2,
    title: "Companies and legal entities",
    body: "Private and public limited companies, partnerships, business names and overseas branches registered in Cyprus.",
  },
  {
    icon: Search,
    title: "Names and registration numbers",
    body: "Search by full or partial company name, or go straight to a record with its Registrar number such as HE 252407.",
  },
  {
    icon: Users,
    title: "Officials and owners on record",
    body: "Directors, secretaries and recorded owners for each entity, as filed with the Registrar.",
  },
  {
    icon: MapPin,
    title: "Registered office and district",
    body: "The registered address in Greek and Latin script, with the district it belongs to across all six districts.",
  },
];

const HOW_RESULTS_WORK = [
  {
    step: "1",
    title: "Type a name or number",
    body: "Partial names work — results are ranked by closeness of match, so “softbot” finds SOFTBOT LIMITED without exact spelling.",
  },
  {
    step: "2",
    title: "Scan the result list",
    body: "Each row shows the registered name, Registrar number, entity type, registration date and current status such as Active or Struck off.",
  },
  {
    step: "3",
    title: "Open the company profile",
    body: "The profile adds company age, registry status, registered office, officials and owners on record, and district — all on one page.",
  },
  {
    step: "4",
    title: "Order official documents",
    body: "From any profile you can add certificates, a structure report or a credit report to your basket and pay online. Delivery is digital.",
  },
];

const TRUST = [
  {
    icon: ShieldCheck,
    title: "Registrar sourced, field by field",
    body: "Data originates from the Department of Registrar of Companies and Intellectual Property. Nothing is inferred.",
  },
  {
    icon: Timer,
    title: "Clear turnaround times",
    body: "Reports the same business day; certified certificates in one to two business days, tracked in your account.",
  },
  {
    icon: FileCheck2,
    title: "Documents accepted by third parties",
    body: "Certificates are issued by the Registrar, suitable for banks, tenders, notaries and KYB/AML review files.",
  },
];

const ENTITY_PREFIXES = [
  ["HE", "Limited companies"],
  ["C", "Legacy company records"],
  ["EE", "Business names"],
  ["S", "Partnerships"],
  ["AE", "Overseas companies"],
  ["ΕΕ", "Greek-script filings"],
];

function RegistryLandingPage() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");

  return (
    <div>
      <section className="surface-deep relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary via-[oklch(0.28_0.06_255)] to-[oklch(0.38_0.07_245)]" />
        <div className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full bg-accent/10 blur-3xl" />

        <div className="relative mx-auto max-w-4xl px-4 py-20 lg:py-24">
          <nav aria-label="Breadcrumb" className="text-xs text-primary-foreground/70">
            <ol className="flex flex-wrap items-center gap-2">
              <li>
                <Link to="/" className="hover:text-primary-foreground">
                  Home
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li aria-current="page" className="text-primary-foreground">
                Cyprus companies registry
              </li>
            </ol>
          </nav>

          <h1 className="mt-6 text-4xl font-bold leading-[1.12] tracking-tight text-primary-foreground md:text-5xl">
            Cyprus companies registry <span className="text-gradient-copper">search</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-primary-foreground/80">
            Look up any company registered in Cyprus — status, registration number, directors, shareholders and
            registered office — using data from the official Registrar of Companies. Free to search, no account needed.
          </p>

          <form
            className="mt-8 max-w-2xl"
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
                  aria-label="Search the Cyprus companies registry"
                  placeholder="Company name or registration number…"
                  className="h-12 w-full rounded-lg bg-transparent pl-10 pr-3 text-base text-primary-foreground placeholder:text-primary-foreground/50 outline-none"
                />
              </div>
              <Button type="submit" size="lg" className="h-12 bg-accent px-7 text-accent-foreground hover:bg-accent/90">
                Search registry
              </Button>
            </div>
            <p className="mt-3 text-sm text-primary-foreground/60">
              Example searches: “SOFTBOT”, “HE 252407”, “holdings limassol”.
            </p>
          </form>
        </div>
      </section>

      {/* What you can search */}
      <section className="mx-auto max-w-7xl px-4 py-20">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">What you can search</p>
        <h2 className="mt-3 max-w-2xl text-3xl font-bold text-foreground">
          Everything the Registrar records about a Cyprus entity
        </h2>
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {SEARCHABLE.map((item) => (
            <div key={item.title} className="flex gap-4 rounded-xl border bg-card p-6 shadow-panel">
              <item.icon className="size-6 shrink-0 text-accent" />
              <div>
                <h3 className="font-display font-semibold text-card-foreground">{item.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{item.body}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-xl border bg-sand p-6">
          <h3 className="font-display font-semibold text-foreground">Registration number prefixes</h3>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {ENTITY_PREFIXES.map(([prefix, meaning]) => (
              <div key={prefix} className="flex items-baseline gap-3 text-sm">
                <dt className="font-mono font-semibold text-foreground">{prefix}</dt>
                <dd className="text-muted-foreground">{meaning}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* How results work */}
      <section className="border-y bg-sand">
        <div className="mx-auto max-w-7xl px-4 py-20">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">How results work</p>
          <h2 className="mt-3 max-w-2xl text-3xl font-bold text-foreground">
            From a search box to a certified document in four steps
          </h2>
          <ol className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {HOW_RESULTS_WORK.map((item) => (
              <li key={item.step} className="rounded-xl border bg-card p-6 shadow-panel">
                <span className="inline-flex size-8 items-center justify-center rounded-full bg-accent/10 font-display text-sm font-bold text-accent">
                  {item.step}
                </span>
                <h3 className="mt-4 font-display font-semibold text-card-foreground">{item.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{item.body}</p>
              </li>
            ))}
          </ol>
          <ul className="mt-8 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
            {[
              "Free to search — no registration or subscription",
              "Greek and Latin script addresses on every profile",
              "Status, registration date and company age shown together",
              "Certificates orderable directly from a company page",
            ].map((item) => (
              <li key={item} className="flex gap-2">
                <Check className="mt-0.5 size-4 shrink-0 text-olive" /> {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Trust signals */}
      <section className="mx-auto max-w-7xl px-4 py-20">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Why teams rely on it</p>
        <h2 className="mt-3 max-w-2xl text-3xl font-bold text-foreground">Official data, documented turnaround</h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {TRUST.map((item) => (
            <div key={item.title} className="rounded-xl border bg-card p-6 shadow-panel">
              <item.icon className="size-6 text-accent" />
              <h3 className="mt-4 font-display font-semibold text-card-foreground">{item.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{item.body}</p>
            </div>
          ))}
        </div>
        <p className="mt-6 max-w-3xl text-sm text-muted-foreground">
          Companies House Cyprus is an independent service that presents Cyprus registry data and orders official
          documents on your behalf. It is not the Department of Registrar of Companies and Intellectual Property. See our{" "}
          <Link to="/certifications" className="underline">
            certifications
          </Link>{" "}
          and{" "}
          <Link to="/terms" className="underline">
            terms of service
          </Link>
          .
        </p>
      </section>

      {/* FAQ */}
      <section className="border-t bg-sand">
        <div className="mx-auto max-w-3xl px-4 py-20">
          <h2 className="text-3xl font-bold text-foreground">Cyprus registry questions</h2>
          <dl className="mt-8 space-y-6">
            {[
              [
                "Is searching the Cyprus companies registry free?",
                "Yes. Name and number searches, plus company profiles with status, registered office and officials on record, are free and need no account. Only certificates and reports are paid.",
              ],
              [
                "Where does the data come from?",
                "Every field is sourced from the Cyprus Department of Registrar of Companies and Intellectual Property. Nothing is inferred or estimated.",
              ],
              [
                "What is a Cyprus registration number?",
                "A Registrar number prefixed by entity type — HE for limited companies, C for legacy company records, EE for business names, S for partnerships. You can search by number or by name.",
              ],
              [
                "How long does an official certificate take?",
                "Profiles and structure reports are usually produced the same business day. Certified Registrar certificates are typically delivered in one to two business days by email.",
              ],
            ].map(([question, answer]) => (
              <div key={question}>
                <dt className="font-display font-semibold text-foreground">{question}</dt>
                <dd className="mt-1.5 text-sm text-muted-foreground">{answer}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 py-20">
        <div className="surface-deep grid-dots flex flex-col gap-6 rounded-2xl p-10 md:flex-row md:items-center md:justify-between md:p-14">
          <div>
            <h2 className="text-3xl font-bold text-primary-foreground">Start with a name or a number</h2>
            <p className="mt-3 max-w-xl text-primary-foreground/75">
              Search the register free, then order certificates or reports from the company profile when you need them.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Link to="/search" search={{ q: "", page: 1 }}>
                Search the registry <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10"
            >
              <Link to="/pricing">See document pricing</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
