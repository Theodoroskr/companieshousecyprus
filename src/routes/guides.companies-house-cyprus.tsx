import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

const TITLE = "Companies House Cyprus Explained | Cyprus Companies House";
const DESCRIPTION =
  "What people mean by Companies House Cyprus or Cyprus Companies House: who runs the Cyprus company register, what it records, how to search by name or HE number, and how it differs from UK Companies House.";
const CANONICAL = "https://companieshousecyprus.com/guides/companies-house-cyprus";

const FAQS: Array<[string, string]> = [
  [
    "Is there a Companies House in Cyprus?",
    "Not by that name. The Cyprus equivalent of Companies House is the Department of Registrar of Companies and Intellectual Property (DRCIP), part of the Ministry of Energy, Commerce and Industry. It keeps the official register of companies, partnerships, business names and overseas branches, and it alone issues certificates with legal standing.",
  ],
  [
    "What is the difference between Companies House Cyprus and the UK Companies House?",
    "UK Companies House is a UK government agency registering companies in England, Wales, Scotland and Northern Ireland. Cyprus companies are registered with the DRCIP in Nicosia and carry registry numbers such as HE 252407. Companies House Cyprus (this site) is an independent commercial service operated by Infocredit Group Limited (HE4404) that republishes Cyprus registry data for free searching and orders official documents from the Registrar on request.",
  ],
  [
    "Is Cyprus company data public?",
    "Yes. Company name, registry number, entity type, registration date, current status and registered office are public. Directors, secretary and shareholders are also on the public record, and we supply them in a paid Company Profile Report rather than for free.",
  ],
  [
    "How do I get an official Cyprus certificate?",
    "Find the company, open its profile and add the certificate you need — incorporation, good standing, directors and secretary, shareholders, registered office, capital, no charges or strike off. Pay online and the certified document, issued by the Registrar, is emailed to you and stored in your account, typically within one to two business days.",
  ],
];

const SECTIONS = [
  { id: "what-it-means", label: "What the term means" },
  { id: "who-runs-it", label: "Who runs the Cyprus register" },
  { id: "what-it-records", label: "What the register records" },
  { id: "how-to-search", label: "How to search" },
  { id: "registry-numbers", label: "Registry number prefixes" },
  { id: "documents", label: "Documents and turnaround" },
  { id: "vs-uk", label: "Cyprus vs UK Companies House" },
  { id: "where-we-fit", label: "Where this service fits" },
  { id: "faq", label: "FAQ" },
];

export const Route = createFileRoute("/guides/companies-house-cyprus")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "article" },
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
          "@type": "Article",
          headline: "Companies House Cyprus explained: the Cyprus company register",
          description: DESCRIPTION,
          inLanguage: "en",
          mainEntityOfPage: CANONICAL,
          author: {
            "@type": "Organization",
            name: "Companies House Cyprus",
            url: "https://companieshousecyprus.com/",
          },
          publisher: {
            "@type": "Organization",
            name: "Companies House Cyprus",
            url: "https://companieshousecyprus.com/",
          },
          about: [
            "Companies House Cyprus",
            "Cyprus Companies House",
            "Department of Registrar of Companies and Intellectual Property",
          ],
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: "https://companieshousecyprus.com/" },
            { "@type": "ListItem", position: 2, name: "Guides", item: "https://companieshousecyprus.com/guides" },
            { "@type": "ListItem", position: 3, name: "Companies House Cyprus explained", item: CANONICAL },
          ],
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: FAQS.map(([q, a]) => ({
            "@type": "Question",
            name: q,
            acceptedAnswer: { "@type": "Answer", text: a },
          })),
        }),
      },
    ],
  }),
  component: CompaniesHouseCyprusGuide;
});

const PREFIXES: Array<[string, string]> = [
  ["HE", "Private and public limited companies"],
  ["C", "Legacy company records"],
  ["EE / B", "Business names"],
  ["S", "Partnerships"],
  ["AE", "Overseas companies and branches"],
];

function CompaniesHouseCyprusGuide() {
  return (
    <main>
      <section className="surface-deep">
        <div className="mx-auto max-w-5xl px-4 py-14 sm:py-20">
          <nav aria-label="Breadcrumb" className="text-sm text-primary-foreground/70">
            <Link to="/" className="hover:underline">
              Home
            </Link>
            <span className="mx-2">/</span>
            <Link to="/guides" className="hover:underline">
              Guides
            </Link>
            <span className="mx-2">/</span>
            <span aria-current="page">Companies House Cyprus</span>
          </nav>
          <h1 className="mt-4 text-3xl font-bold text-primary-foreground sm:text-4xl">
            Companies House Cyprus explained: the Cyprus company register
          </h1>
          <p className="mt-4 max-w-2xl text-primary-foreground/80">
            “Companies House Cyprus” and “Cyprus Companies House” are the everyday English names for the Cyprus company
            register. This guide explains who actually keeps that register, what it holds, how to search it for free,
            and how to obtain official certificates.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Link to="/search" search={{ q: "", page: 1 }}>
                Search Cyprus companies <ArrowRight className="size-4" />
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

      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 lg:grid-cols-[220px_1fr]">
        <aside className="hidden lg:block">
          <nav aria-label="On this page" className="sticky top-24">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">On this page</p>
            <ul className="mt-4 space-y-2 text-sm">
              {SECTIONS.map((section) => (
                <li key={section.id}>
                  <a href={`#${section.id}`} className="text-muted-foreground hover:text-accent">
                    {section.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        <article className="max-w-3xl space-y-12">
          <section id="what-it-means" className="scroll-mt-24">
            <h2 className="font-display text-2xl font-bold text-foreground">What the term means</h2>
            <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
              <p>
                Cyprus has no institution literally named “Companies House” — that name belongs to the United Kingdom.
                When a bank, auditor, tender committee or overseas counterparty asks you to “check Companies House in
                Cyprus”, they mean the official Cyprus company register kept by the{" "}
                <strong className="text-foreground">
                  Department of Registrar of Companies and Intellectual Property (DRCIP)
                </strong>
                .
              </p>
              <p>
                The phrase has stuck because the two registers serve the same purpose: a single public record of who is
                incorporated, where they are registered, whether they are still active, and who runs and owns them.
              </p>
            </div>
          </section>

          <section id="who-runs-it" className="scroll-mt-24">
            <h2 className="font-display text-2xl font-bold text-foreground">Who runs the Cyprus register</h2>
            <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
              <p>
                The DRCIP sits under the Ministry of Energy, Commerce and Industry in Nicosia. It registers new
                companies, receives statutory filings such as annual returns and changes of officers, maintains the
                register of beneficial owners, and issues certified certificates. Incorporation and every statutory
                filing must go through the Registrar — no commercial service can file on the register in its place.
              </p>
              <p>
                If you are incorporating rather than researching, our{" "}
                <Link to="/guides/register-company-cyprus" className="text-accent underline">
                  guide to registering a company in Cyprus
                </Link>{" "}
                walks through the process, and our{" "}
                <Link to="/company-set-up" className="text-accent underline">
                  company formation service
                </Link>{" "}
                can handle it for you.
              </p>
            </div>
          </section>

          <section id="what-it-records" className="scroll-mt-24">
            <h2 className="font-display text-2xl font-bold text-foreground">What the register records</h2>
            <ul className="mt-4 grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
              {[
                "Registered name, in Greek and Latin script",
                "Registry number and entity type",
                "Registration date and company age",
                "Current status — active, dissolved, struck off, liquidation",
                "Registered office address and district",
                "Directors, secretary and shareholders as filed",
                "Previous names and name changes",
                "Charges and, where filed, financial statements",
              ].map((item) => (
                <li key={item} className="flex gap-2">
                  <Check className="mt-0.5 size-4 shrink-0 text-olive" /> {item}
                </li>
              ))}
            </ul>
            <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
              On this site, name, number, type, registration date, status and registered office are free on every
              company profile. Directors, secretary and shareholders are supplied in a paid{" "}
              <Link to="/report/$type" params={{ type: "cyprus-company-profile" }} className="text-accent underline">
                Company Profile Report
              </Link>
              .
            </p>
          </section>

          <section id="how-to-search" className="scroll-mt-24">
            <h2 className="font-display text-2xl font-bold text-foreground">How to search the Cyprus register</h2>
            <ol className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
              <li>
                <strong className="text-foreground">By name.</strong> Partial names work, in English or Greek, including
                transliterated spellings — “softbot” finds SOFTBOT LIMITED without exact punctuation.
              </li>
              <li>
                <strong className="text-foreground">By registry number.</strong> Type it with or without the prefix and
                spacing: HE 252407, HE252407 or 252407 all resolve to the same record.
              </li>
              <li>
                <strong className="text-foreground">By browsing.</strong> Use the{" "}
                <Link to="/companies/a-z/$letter" params={{ letter: "a" }} className="text-accent underline">
                  A–Z index
                </Link>{" "}
                or the{" "}
                <Link to="/directory" className="text-accent underline">
                  risk-signal directory
                </Link>{" "}
                to work through the register by letter, district or status.
              </li>
            </ol>
            <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
              A step-by-step walkthrough of results and filters is on our{" "}
              <Link to="/cyprus-companies-registry" className="text-accent underline">
                Cyprus companies registry page
              </Link>
              .
            </p>
          </section>

          <section id="registry-numbers" className="scroll-mt-24">
            <h2 className="font-display text-2xl font-bold text-foreground">Registry number prefixes</h2>
            <dl className="mt-4 grid gap-3 rounded-xl border bg-sand p-6 sm:grid-cols-2">
              {PREFIXES.map(([prefix, meaning]) => (
                <div key={prefix} className="flex items-baseline gap-3 text-sm">
                  <dt className="font-mono font-semibold text-foreground">{prefix}</dt>
                  <dd className="text-muted-foreground">{meaning}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section id="documents" className="scroll-mt-24">
            <h2 className="font-display text-2xl font-bold text-foreground">Documents and turnaround</h2>
            <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
              <p>
                Certified certificates — incorporation, good standing, directors and secretary, shareholders, registered
                office, capital, no charges and strike off — are issued by the Registrar and typically delivered by
                email within one to two business days. Apostille can be added to any certificate.
              </p>
              <p>
                Commercial reports are produced the same business day: the Company Profile Report for structure and
                officials, the{" "}
                <Link to="/report/$type" params={{ type: "cyprus-credit-report" }} className="text-accent underline">
                  Cyprus Credit Report
                </Link>{" "}
                for financial standing, and the{" "}
                <Link
                  to="/report/$type"
                  params={{ type: "sanctions-risk-snapshot" }}
                  className="text-accent underline"
                >
                  Sanctions Risk Snapshot
                </Link>{" "}
                for EU, UN, UK and US sanctions screening of the legal entity. Full prices are on the{" "}
                <Link to="/pricing" className="text-accent underline">
                  pricing page
                </Link>
                .
              </p>
            </div>
          </section>

          <section id="vs-uk" className="scroll-mt-24">
            <h2 className="font-display text-2xl font-bold text-foreground">
              Cyprus register vs UK Companies House
            </h2>
            <div className="mt-4 overflow-hidden rounded-xl border bg-card shadow-panel">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="px-5 py-3 font-semibold">Aspect</th>
                      <th className="px-5 py-3 font-semibold">Cyprus (DRCIP)</th>
                      <th className="px-5 py-3 font-semibold">UK Companies House</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {[
                      ["Registering body", "Department of Registrar of Companies and IP, Nicosia", "Companies House, an executive agency"],
                      ["Company number format", "Prefixed, e.g. HE 252407", "Eight digits, e.g. 01234567"],
                      ["Languages of record", "Greek, with Latin transliteration", "English and Welsh"],
                      ["Free bulk document access", "Limited", "Extensive"],
                      ["Certificates", "Issued on request, usually 1–2 business days", "Issued on request, often same day"],
                    ].map(([aspect, cy, uk]) => (
                      <tr key={aspect} className="align-top">
                        <td className="px-5 py-4 font-medium text-foreground">{aspect}</td>
                        <td className="px-5 py-4 text-muted-foreground">{cy}</td>
                        <td className="px-5 py-4 text-muted-foreground">{uk}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <section id="where-we-fit" className="scroll-mt-24">
            <h2 className="font-display text-2xl font-bold text-foreground">Where this service fits</h2>
            <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
              <p>
                Companies House Cyprus is an independent commercial service operated by Infocredit Group Limited
                (HE4404). We are not the Department of Registrar of Companies and Intellectual Property and are not
                endorsed by it. We republish registry-sourced data so it can be searched free of charge, and we order
                official documents from the Registrar on your behalf.
              </p>
              <p>
                For incorporation and statutory filings, always use the official Registrar. More on our sourcing and
                refresh cadence is on the{" "}
                <Link to="/about" className="text-accent underline">
                  about page
                </Link>
                ; if you need something specific,{" "}
                <Link to="/contact" className="text-accent underline">
                  contact our registry team
                </Link>
                .
              </p>
            </div>
          </section>

          <section id="faq" className="scroll-mt-24">
            <h2 className="font-display text-2xl font-bold text-foreground">Frequently asked questions</h2>
            <dl className="mt-6 divide-y divide-border border-y">
              {FAQS.map(([q, a]) => (
                <div key={q} className="py-5">
                  <dt className="font-display font-semibold text-foreground">{q}</dt>
                  <dd className="mt-2 text-sm leading-relaxed text-muted-foreground">{a}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="surface-deep grid-dots rounded-2xl p-8 md:p-10">
            <h2 className="text-2xl font-bold text-primary-foreground">Look up a Cyprus company now</h2>
            <p className="mt-3 max-w-xl text-primary-foreground/75">
              Search by name or HE number free, then order certificates and reports straight from the company profile.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
                <Link to="/search" search={{ q: "", page: 1 }}>
                  Search the register <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10"
              >
                <Link to="/directory">Browse the directory</Link>
              </Button>
            </div>
          </section>
        </article>
      </div>
    </main>
  );
}
