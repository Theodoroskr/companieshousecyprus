import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Landmark,
  ShieldCheck,
  FileCheck,
  Search,
  Users,
  Building2,
  Scale,
  Clock,
  Phone,
  Mail,
} from "lucide-react";

const TITLE = "KYB for Banks & Financial Institutions — Cyprus Registry Data";
const DESCRIPTION =
  "Cyprus company verification for AML/KYC teams: registry-sourced structure reports, credit reports and certified Registrar documents for onboarding and periodic review.";
const CANONICAL = "https://companieshousecyprus.com/solutions/kyb-for-banks";

export const Route = createFileRoute("/solutions/kyb-for-banks")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: CANONICAL },
      { name: "twitter:card", content: "summary" },
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
              name: "KYB for banks and financial institutions",
              item: CANONICAL,
            },
          ],
        }),
      },
    ],
  }),
  component: KybForBanksPage,
});

const USE_CASES = [
  {
    icon: Users,
    title: "Onboarding a corporate client",
    text: "Confirm the entity exists, is active with the Registrar, and identify the directors, secretary, shareholders and registered office before the relationship is opened.",
  },
  {
    icon: Clock,
    title: "Periodic KYC review",
    text: "Re-verify status, officers and address at review dates. Every order is placed as a fresh investigation, so you receive current registry data rather than a cached file.",
  },
  {
    icon: Scale,
    title: "Legal and transaction due diligence",
    text: "Support share transfers, financing and litigation with statutory documents such as the Memorandum and Articles of Association and Registrar certificates.",
  },
  {
    icon: Building2,
    title: "Procurement and counterparty checks",
    text: "Screen suppliers and bidders on legal name, registration number, incorporation date and standing with the Registrar of Companies.",
  },
];

const DELIVERABLES = [
  {
    name: "Cyprus Company Profile (Structure Report)",
    price: "€65",
    text: "Registry structure: legal name, registration number, type, status, incorporation date, registered office, directors, secretary and shareholders.",
    to: "/report/$type" as const,
    params: { type: "structure" },
  },
  {
    name: "Cyprus Credit Report",
    price: "€130",
    text: "Structure plus credit intelligence for risk-based onboarding decisions and exposure assessment.",
    to: "/report/$type" as const,
    params: { type: "credit" },
  },
  {
    name: "KYB & Due Diligence Pack",
    price: "€185",
    text: "Bundled report and Registrar certificates for a single onboarding file, ordered in one step.",
    to: "/pricing" as const,
    params: undefined,
  },
  {
    name: "Due Diligence Report",
    price: "€750",
    text: "Enhanced due diligence for higher-risk relationships and escalated review cases.",
    to: "/pricing" as const,
    params: undefined,
  },
];

const CONTROLS = [
  {
    icon: ShieldCheck,
    title: "ISO/IEC 27001 information security",
    text: "Access, transmission, storage and disposal of the data you send us are covered by an externally audited information security management system.",
    to: "/certifications" as const,
  },
  {
    icon: FileCheck,
    title: "ISO 9001 documented processes",
    text: "Each workflow that touches your order and your documents is documented and subject to quality oversight — useful evidence for your own audit trail.",
    to: "/certifications" as const,
  },
  {
    icon: Clock,
    title: "ISO 22301 business continuity",
    text: "Continuity plans keep certificate issuance and enquiry handling running if key systems or locations are disrupted.",
    to: "/certifications" as const,
  },
];

function KybForBanksPage() {
  return (
    <div className="relative overflow-hidden">
      {/* Hero */}
      <div className="relative bg-primary py-14 text-primary-foreground">
        <div className="absolute inset-0 grid-dots opacity-20" />
        <div className="absolute -right-20 -top-20 size-80 rounded-full bg-copper/25 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 size-72 rounded-full bg-primary-glow/20 blur-3xl" />
        <div className="relative mx-auto max-w-3xl px-4">
          <nav aria-label="Breadcrumb" className="text-xs text-primary-foreground/70">
            <Link to="/" className="hover:text-primary-foreground">
              Home
            </Link>
            <span className="mx-2">/</span>
            <span className="text-primary-foreground/90">KYB for banks</span>
          </nav>
          <div className="mt-4 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-copper">
            <Landmark className="size-4" />
            <span>KYB solutions</span>
          </div>
          <h1 className="mt-3 font-display text-3xl font-bold sm:text-4xl">
            Cyprus KYB for banks and financial institutions
          </h1>
          <p className="mt-3 max-w-2xl text-sm/6 text-primary-foreground/80">
            Verify Cyprus companies with data taken from the Registrar of Companies. AML and KYC teams
            use our structure reports, credit reports and certified Registrar documents to open,
            review and document corporate relationships.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/search"
              search={{ q: "", page: 1 }}
              className="inline-flex items-center gap-2 rounded-md bg-copper px-4 py-2 text-sm font-semibold text-primary shadow-panel"
            >
              <Search className="size-4" />
              Search a Cyprus company
            </Link>
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 rounded-md border border-primary-foreground/25 px-4 py-2 text-sm font-semibold text-primary-foreground"
            >
              Talk to us about account pricing
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-16">
        {/* Use cases */}
        <section>
          <h2 className="font-display text-2xl font-semibold">Where it fits in your file</h2>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
            The same registry evidence supports onboarding, periodic review, transactions and
            procurement screening.
          </p>
          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            {USE_CASES.map((item) => (
              <div key={item.title} className="rounded-xl border bg-card p-6 shadow-panel">
                <item.icon className="size-6 text-copper" />
                <h3 className="mt-4 font-display text-base font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Deliverables */}
        <section className="mt-16">
          <h2 className="font-display text-2xl font-semibold">What you receive</h2>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
            Reports are delivered digitally through your client portal. Registrar certificates carry a
            handling fee, and VAT applies to reports and service fees.
          </p>
          <div className="mt-8 grid gap-4">
            {DELIVERABLES.map((item) => (
              <div
                key={item.name}
                className="flex flex-col gap-3 rounded-xl border bg-sand p-6 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <h3 className="font-display text-base font-semibold">{item.name}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{item.text}</p>
                </div>
                <div className="flex shrink-0 items-center gap-4">
                  <span className="font-display text-lg font-semibold">{item.price}</span>
                  {item.params ? (
                    <Link
                      to={item.to}
                      params={item.params}
                      className="text-sm font-medium text-copper hover:underline"
                    >
                      Details
                    </Link>
                  ) : (
                    <Link to={item.to} className="text-sm font-medium text-copper hover:underline">
                      Details
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Controls / trust */}
        <section className="mt-16">
          <h2 className="font-display text-2xl font-semibold">Controls your auditors will ask about</h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            {CONTROLS.map((item) => (
              <Link
                key={item.title}
                to={item.to}
                className="rounded-xl border bg-card p-6 transition-colors hover:border-copper"
              >
                <item.icon className="size-6 text-copper" />
                <h3 className="mt-4 font-display text-base font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.text}</p>
              </Link>
            ))}
          </div>
        </section>

        {/* Contact */}
        <section className="mt-16 rounded-xl border bg-primary p-8 text-primary-foreground">
          <h2 className="font-display text-2xl font-semibold">
            Volume onboarding or a recurring review cycle?
          </h2>
          <p className="mt-3 max-w-2xl text-sm/6 text-primary-foreground/80">
            Tell us how many entities you review and how often, and we will come back with account
            pricing and a delivery process that fits your compliance workflow.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-4 text-sm">
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 rounded-md bg-copper px-4 py-2 font-semibold text-primary"
            >
              Request account pricing
            </Link>
            <a
              href="mailto:info@companieshousecyprus.com"
              className="inline-flex items-center gap-2 text-primary-foreground/85 hover:text-primary-foreground"
            >
              <Mail className="size-4" />
              info@companieshousecyprus.com
            </a>
            <a
              href="tel:+35722398241"
              className="inline-flex items-center gap-2 text-primary-foreground/85 hover:text-primary-foreground"
            >
              <Phone className="size-4" />
              +357 22 398241
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}
