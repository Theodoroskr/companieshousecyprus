import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Banknote,
  Building2,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Download,
  ExternalLink,
  FileText,
  Globe2,
  Landmark,
  Receipt,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { getGuideContent } from "@/lib/guides.functions";
import { GUIDE_SLUG } from "@/lib/guides";
import { trackEvent } from "@/lib/analytics";
import {
  BANK_CHECKLIST,
  COMPLIANCE_CHECKLIST,
  DOC_CHECKLISTS,
  ENTITY_TYPES,
  FAQS,
  MISTAKES,
  PARTICIPANTS,
  POST_INCORPORATION_DOCS,
  SECTIONS,
  STEPS,
  TIMELINE_STAGES,
} from "@/components/guides/register-company-cyprus-data";
import {
  GuideDownloadForm,
  SpecialistIntroductionForm,
} from "@/components/guides/guide-lead-forms";

const TITLE = "Cyprus Company Formation & Registration Guide 2026";
const DESCRIPTION =
  "Learn Cyprus company formation and registration in 2026: requirements, documents, costs, timelines and ongoing obligations. Connect with a Cyprus company-formation specialist.";
const CANONICAL = "https://companieshousecyprus.com/guides/register-company-cyprus/";

export const Route = createFileRoute("/guides/register-company-cyprus")({
  loader: async () => getGuideContent({ data: { slug: GUIDE_SLUG } }),
  head: ({ loaderData }) => {
    const published = loaderData?.editorial?.date_published ?? "2026-01-15";
    const modified = loaderData?.editorial?.last_reviewed ?? published;
    return {
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
            "@graph": [
              {
                "@type": "Organization",
                "@id": "https://companieshousecyprus.com/#organization",
                name: "Companies House Cyprus",
                url: "https://companieshousecyprus.com/",
                email: "info@companieshousecyprus.com",
                description:
                  "Independent information service providing search of the Cyprus register of companies and official Registrar documents. Not affiliated with the Government of the Republic of Cyprus.",
              },
              {
                "@type": "WebPage",
                "@id": CANONICAL,
                url: CANONICAL,
                name: TITLE,
                description: DESCRIPTION,
                inLanguage: "en",
                isPartOf: { "@id": "https://companieshousecyprus.com/#website" },
                publisher: { "@id": "https://companieshousecyprus.com/#organization" },
                breadcrumb: { "@id": `${CANONICAL}#breadcrumb` },
              },
              {
                "@type": "BreadcrumbList",
                "@id": `${CANONICAL}#breadcrumb`,
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
                    name: "Guides",
                    item: "https://companieshousecyprus.com/guides",
                  },
                  {
                    "@type": "ListItem",
                    position: 3,
                    name: "Register a Company in Cyprus",
                    item: CANONICAL,
                  },
                ],
              },
              {
                "@type": "Article",
                "@id": `${CANONICAL}#article`,
                headline: "How to Register a Company in Cyprus: Complete 2026 Guide",
                description: DESCRIPTION,
                mainEntityOfPage: { "@id": CANONICAL },
                datePublished: published,
                dateModified: modified,
                inLanguage: "en",
                author: { "@id": "https://companieshousecyprus.com/#organization" },
                publisher: { "@id": "https://companieshousecyprus.com/#organization" },
              },
              {
                "@type": "FAQPage",
                "@id": `${CANONICAL}#faq`,
                mainEntity: FAQS.map((item) => ({
                  "@type": "Question",
                  name: item.q,
                  acceptedAnswer: { "@type": "Answer", text: item.a },
                })),
              },
            ],
          }),
        },
      ],
    };
  },
  component: RegisterCompanyGuide,
});

/* --------------------------------------------------------------- pieces -- */

function SectionHeading({ id, index, title }: { id: string; index: number; title: string }) {
  return (
    <div className="scroll-mt-28" id={id}>
      <p className="text-xs font-semibold uppercase tracking-wide text-copper">
        Section {index}
      </p>
      <h2 className="mt-1 text-2xl sm:text-3xl">{title}</h2>
    </div>
  );
}

function PrimaryCta({ location, className = "" }: { location: string; className?: string }) {
  return (
    <a
      href="#introduction"
      onClick={() => trackEvent("cta_click", { cta: "specialist_introduction", location })}
      className={className}
    >
      <Button size="lg" className="w-full sm:w-auto">
        Request a Specialist Introduction
        <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
      </Button>
    </a>
  );
}

function SecondaryCta({ location }: { location: string }) {
  return (
    <a
      href="#download"
      onClick={() => trackEvent("cta_click", { cta: "guide_download", location })}
    >
      <Button size="lg" variant="outline" className="w-full sm:w-auto">
        <Download className="mr-2 h-4 w-4" aria-hidden="true" />
        Download the Free Guide
      </Button>
    </a>
  );
}

function CtaBand({ location, note }: { location: string; note: string }) {
  return (
    <div className="my-10 rounded-xl border bg-sand/60 p-6">
      <p className="font-heading text-lg">Need professional assistance?</p>
      <p className="mt-1 text-sm text-muted-foreground">{note}</p>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <PrimaryCta location={location} />
        <SecondaryCta location={location} />
      </div>
    </div>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-olive" aria-hidden="true" />
      <span>{children}</span>
    </li>
  );
}

/* ------------------------------------------------------------------ page -- */

function RegisterCompanyGuide() {
  const { editorial, fees } = Route.useLoaderData();

  const reviewed = editorial?.last_reviewed ?? "";
  const formatDay = (value: string) =>
    value
      ? new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "long", year: "numeric" }).format(
          new Date(value),
        )
      : "—";

  return (
    <main>
      {/* Hero */}
      <section className="surface-deep">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:py-16">
          <nav aria-label="Breadcrumb" className="text-sm text-primary-foreground/70">
            <Link to="/" className="hover:underline">
              Home
            </Link>
            <span className="mx-2">/</span>
            <Link to="/guides" className="hover:underline">
              Guides
            </Link>
            <span className="mx-2">/</span>
            <span aria-current="page">Register a Company in Cyprus</span>
          </nav>

          <div className="mt-6 max-w-3xl">
            <h1 className="text-3xl leading-tight sm:text-5xl">
              How to Register a Company in Cyprus
            </h1>
            <p className="mt-4 text-base text-primary-foreground/85 sm:text-lg">
              A practical 2026 guide to the incorporation process, required documents, key
              participants and ongoing company obligations.
            </p>

            <ul className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-3">
              {[
                { icon: Landmark, label: "Based on official Registrar information" },
                { icon: Globe2, label: "Written for local and international founders" },
                { icon: BadgeCheck, label: "Updated for 2026" },
              ].map((item) => (
                <li
                  key={item.label}
                  className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs text-primary-foreground/90 backdrop-blur"
                >
                  <item.icon className="h-3.5 w-3.5" aria-hidden="true" />
                  {item.label}
                </li>
              ))}
            </ul>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <PrimaryCta location="hero" />
              <SecondaryCta location="hero" />
            </div>

            <p className="mt-6 text-xs text-primary-foreground/70">
              Independent information service. Not affiliated with the Government of the Republic of
              Cyprus.
            </p>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="grid gap-10 lg:grid-cols-[260px_minmax(0,1fr)]">
          {/* Table of contents */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <details className="rounded-xl border bg-card p-4 shadow-panel lg:hidden" >
              <summary className="cursor-pointer text-sm font-semibold">Contents</summary>
              <TocList />
            </details>
            <nav aria-label="Table of contents" className="hidden rounded-xl border bg-card p-5 shadow-panel lg:block">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Contents
              </p>
              <TocList />
            </nav>
          </aside>

          <article className="min-w-0 space-y-14">
            {/* Introduction */}
            <section className="space-y-4 text-[15px] leading-relaxed text-foreground/90">
              <p>
                Registering a company in Cyprus involves choosing the appropriate business structure,
                obtaining approval of the company name, preparing the incorporation documents,
                registering the entity with the Department of Registrar of Companies and Intellectual
                Property, and then completing tax, beneficial-ownership and ongoing compliance
                requirements.
              </p>
              <p>
                This guide walks through each stage in the order it happens, sets out what founders
                are usually asked to provide, and flags where outcomes depend on third parties such as
                the Registrar, the Tax Department and banks. It is written for founders based in
                Cyprus and abroad, and for the advisers who support them.
              </p>
              <p className="rounded-lg border-l-4 border-copper bg-sand/60 p-4 text-sm">
                This guide provides general information only. It does not constitute legal, tax,
                accounting or investment advice, and it is not a substitute for guidance from a
                licensed Cyprus professional who knows your circumstances.
              </p>
            </section>

            {/* 1. Overview */}
            <section className="space-y-4">
              <SectionHeading id="overview" index={1} title="Cyprus company overview" />
              <p className="text-[15px] leading-relaxed text-foreground/90">
                The most common vehicle in Cyprus is the private company limited by shares. It is a
                separate legal person from its owners: it can contract, hold assets and sue or be sued
                in its own name, and the liability of its members is limited to any amount unpaid on
                their shares. Ownership is divided into shares that can be transferred subject to the
                articles of association, which makes the structure workable for single founders,
                partners and corporate groups alike.
              </p>
              <p className="text-[15px] leading-relaxed text-foreground/90">
                Cyprus is widely used as a base for holding, trading, shipping, technology and
                professional-services companies, partly because it is an EU member state with an
                English-language business and legal ecosystem and an established corporate
                service-provider sector. Whether a Cyprus company is suitable for you, and how it will
                be taxed, depends on the founders, the activities, where management and control sit,
                the ownership chain and the other jurisdictions involved — no general guide can answer
                that for your case.
              </p>
              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  { icon: Building2, title: "Separate legal person", body: "The company, not the owner, carries the contracts and obligations." },
                  { icon: ShieldCheck, title: "Limited liability", body: "Members' exposure is limited to unpaid amounts on their shares." },
                  { icon: Users, title: "Flexible ownership", body: "Individual or corporate shareholders, with shares transferable under the articles." },
                ].map((card) => (
                  <div key={card.title} className="rounded-xl border bg-card p-5 shadow-panel">
                    <card.icon className="h-5 w-5 text-copper" aria-hidden="true" />
                    <p className="mt-3 font-heading">{card.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{card.body}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* 2. Who can register */}
            <section className="space-y-4">
              <SectionHeading id="who-can-register" index={2} title="Who can register a company?" />
              <p className="text-[15px] leading-relaxed text-foreground/90">
                Both Cyprus residents and non-residents can, in general terms, establish a Cyprus
                company, and there is no requirement for founders to hold a particular nationality.
                In practice the application passes through the compliance process of a licensed
                service provider, which will assess:
              </p>
              <ul className="space-y-2 text-[15px] text-foreground/90">
                <Bullet>Identification and verification of every individual involved</Bullet>
                <Bullet>Source-of-funds and source-of-wealth checks where required</Bullet>
                <Bullet>Sanctions, politically-exposed-person and adverse-media screening</Bullet>
                <Bullet>An assessment of the proposed business activity and its risk profile</Bullet>
                <Bullet>Applicable licensing requirements for regulated activities</Bullet>
              </ul>
              <p className="text-[15px] leading-relaxed text-foreground/90">
                Acceptance is never automatic. Providers and banks decline applications where the
                activity falls outside their risk appetite, where the ownership chain cannot be
                verified, or where documentation is incomplete.
              </p>
            </section>

            {/* 3. Entity types */}
            <section className="space-y-4">
              <SectionHeading id="entity-types" index={3} title="Types of business entities" />
              <div className="overflow-x-auto rounded-xl border bg-card shadow-panel">
                <table className="w-full min-w-[860px] border-collapse text-left text-sm">
                  <caption className="sr-only">
                    Comparison of Cyprus business entity types by typical use, liability, legal
                    personality and compliance level
                  </caption>
                  <thead className="bg-muted/60">
                    <tr>
                      {["Entity type", "Typical use", "Liability", "Separate legal personality", "General compliance level", "Suitable for"].map(
                        (heading) => (
                          <th key={heading} scope="col" className="p-3 font-semibold">
                            {heading}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {ENTITY_TYPES.map((row) => (
                      <tr key={row.type} className="border-t align-top">
                        <th scope="row" className="p-3 font-medium">
                          {row.type}
                        </th>
                        <td className="p-3 text-muted-foreground">{row.use}</td>
                        <td className="p-3 text-muted-foreground">{row.liability}</td>
                        <td className="p-3 text-muted-foreground">{row.personality}</td>
                        <td className="p-3 text-muted-foreground">{row.compliance}</td>
                        <td className="p-3 text-muted-foreground">{row.suitable}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-sm text-muted-foreground">
                Structures are not interchangeable, and the right choice affects liability, tax
                treatment and filing obligations. Obtain professional advice before deciding.
              </p>
            </section>

            {/* 4. Participants */}
            <section className="space-y-4">
              <SectionHeading id="participants" index={4} title="Key company participants" />
              <div className="grid gap-4 sm:grid-cols-2">
                {PARTICIPANTS.map((item) => (
                  <div key={item.title} className="rounded-xl border bg-card p-5 shadow-panel">
                    <p className="font-heading">{item.title}</p>
                    <p className="mt-1.5 text-sm text-muted-foreground">{item.body}</p>
                  </div>
                ))}
              </div>
              <div className="rounded-xl border border-copper/30 bg-sand/60 p-5 text-sm">
                <p className="font-heading text-base">Three distinctions worth getting right</p>
                <ul className="mt-3 space-y-2 text-muted-foreground">
                  <li>
                    <strong className="text-foreground">Shareholder vs beneficial owner:</strong> the
                    shareholder is the legal owner on the register; the beneficial owner is the
                    natural person who ultimately owns or controls the company through that chain.
                  </li>
                  <li>
                    <strong className="text-foreground">Director vs owner:</strong> directors manage
                    the company and carry statutory duties; they need not hold any shares, and
                    shareholders need not sit on the board.
                  </li>
                  <li>
                    <strong className="text-foreground">Registered office vs trading address:</strong>{" "}
                    the registered office receives official correspondence; the business may operate
                    from a completely different address.
                  </li>
                </ul>
              </div>
            </section>

            {/* 5. Documents */}
            <section className="space-y-4">
              <SectionHeading
                id="documents"
                index={5}
                title="Information and documents required"
              />
              <div className="grid gap-4 lg:grid-cols-3">
                {DOC_CHECKLISTS.map((list) => (
                  <div key={list.title} className="rounded-xl border bg-card p-5 shadow-panel">
                    <ClipboardList className="h-5 w-5 text-copper" aria-hidden="true" />
                    <p className="mt-3 font-heading text-base">{list.title}</p>
                    <ul className="mt-3 space-y-2 text-sm text-foreground/90">
                      {list.items.map((item) => (
                        <Bullet key={item}>{item}</Bullet>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
              <p className="text-sm text-muted-foreground">
                Exact requirements depend on the formation specialist and the risk profile of the
                proposed company, its owners and its activities. Certification, translation or
                apostille may be requested for documents issued abroad.
              </p>
            </section>

            {/* 6. Process */}
            <section className="space-y-4">
              <SectionHeading id="process" index={6} title="Step-by-step registration process" />
              <ol className="relative space-y-6 border-l pl-6">
                {STEPS.map((step, index) => (
                  <li key={step.title} className="relative">
                    <span
                      aria-hidden="true"
                      className="absolute -left-[31px] flex h-6 w-6 items-center justify-center rounded-full border bg-card text-[11px] font-semibold text-copper"
                    >
                      {index + 1}
                    </span>
                    <p className="font-heading">{step.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{step.body}</p>
                    {index === 4 && (
                      <CtaBand
                        location="after_step_5"
                        note="Document preparation is where most first-time founders lose time. An independent Cyprus specialist can draft and file correctly the first time."
                      />
                    )}
                  </li>
                ))}
              </ol>
              <CtaBand
                location="after_timeline"
                note="Have the process handled end to end by an independent, licensed Cyprus provider."
              />
            </section>

            {/* 7. Costs */}
            <section className="space-y-4">
              <SectionHeading id="costs" index={7} title="Costs and professional fees" />
              <p className="text-[15px] leading-relaxed text-foreground/90">
                The total cost of registering and running a Cyprus company combines official fees paid
                to the Registrar with professional fees charged independently by service providers.
                Official fees change from time to time, so the amounts below are maintained as
                editable content and must be verified against the Registrar's current published fees
                before you rely on them.
              </p>
              <div className="overflow-x-auto rounded-xl border bg-card shadow-panel">
                <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                  <caption className="sr-only">Cost components for Cyprus company registration</caption>
                  <thead className="bg-muted/60">
                    <tr>
                      <th scope="col" className="p-3 font-semibold">Cost component</th>
                      <th scope="col" className="p-3 font-semibold">Amount</th>
                      <th scope="col" className="p-3 font-semibold">Notes and source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fees.map((fee) => (
                      <tr key={fee.label} className="border-t align-top">
                        <th scope="row" className="p-3 font-medium">{fee.label}</th>
                        <td className="p-3">
                          <span className="font-medium">{fee.amount}</span>
                          {fee.needs_verification && (
                            <span className="ml-2 inline-flex items-center rounded-full border border-copper/40 bg-copper/10 px-2 py-0.5 text-[11px] text-copper">
                              Verify with official source
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-muted-foreground">
                          {fee.note}
                          {fee.source_url && (
                            <>
                              {" "}
                              <a
                                href={fee.source_url}
                                target="_blank"
                                rel="noopener noreferrer nofollow"
                                className="inline-flex items-center underline underline-offset-2"
                              >
                                Official source
                                <ExternalLink className="ml-1 h-3 w-3" aria-hidden="true" />
                              </a>
                            </>
                          )}
                          {fee.last_verified && (
                            <span className="mt-1 block text-xs">
                              Last verified {formatDay(fee.last_verified)}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-sm text-muted-foreground">
                Professional formation, registered-office, secretarial, nominee or fiduciary (where
                lawful and appropriate), certified-document, apostille, courier, tax and VAT
                registration, accounting and annual-compliance services are quoted individually by
                each provider and are available upon quotation.
              </p>
              <CtaBand
                location="after_costs"
                note="Ask for a written quotation covering formation and the first year of compliance before you commit."
              />
            </section>

            {/* 8. Timeline */}
            <section className="space-y-4">
              <SectionHeading id="timeline" index={8} title="Expected timeline" />
              <ol className="grid gap-3 sm:grid-cols-2">
                {TIMELINE_STAGES.map((stage, index) => (
                  <li key={stage.stage} className="rounded-xl border bg-card p-5 shadow-panel">
                    <div className="flex items-center gap-2">
                      <CalendarClock className="h-4 w-4 text-copper" aria-hidden="true" />
                      <p className="font-heading text-base">
                        {index + 1}. {stage.stage}
                      </p>
                    </div>
                    <p className="mt-1.5 text-sm text-muted-foreground">{stage.body}</p>
                  </li>
                ))}
              </ol>
              <p className="rounded-lg border-l-4 border-copper bg-sand/60 p-4 text-sm">
                Timelines are indicative and depend on document readiness, Registrar processing, the
                complexity of the ownership structure and third-party checks. No completion date can
                be guaranteed.
              </p>
            </section>

            {/* 9. Tax and VAT */}
            <section className="space-y-4">
              <SectionHeading id="tax-vat" index={9} title="Tax and VAT registration" />
              <p className="text-[15px] leading-relaxed text-foreground/90">
                A newly incorporated Cyprus company generally has to put its tax affairs in order soon
                after registration. Depending on the activity and the people involved, that can
                include:
              </p>
              <ul className="space-y-2 text-[15px] text-foreground/90">
                <Bullet>Registration with the Tax Department and obtaining a tax identification number</Bullet>
                <Bullet>VAT registration, depending on activities, place of supply and applicable thresholds</Bullet>
                <Bullet>Employer registration if the company will engage staff</Bullet>
                <Bullet>Social-insurance registration for employees and, where relevant, directors</Bullet>
                <Bullet>Maintaining proper accounting records from the first transaction</Bullet>
                <Bullet>Tax returns and other periodic filings, with audit where required</Bullet>
              </ul>
              <p className="rounded-lg border-l-4 border-copper bg-sand/60 p-4 text-sm">
                {editorial?.tax_disclaimer ??
                  "Tax and VAT treatment depends on the company's activities, management, ownership and the jurisdictions involved. Obtain personalised advice from a qualified Cyprus tax adviser."}
              </p>
              <p className="text-sm font-medium">
                Obtain personalised advice from a qualified Cyprus tax adviser.
              </p>
            </section>

            {/* 10. Beneficial ownership */}
            <section className="space-y-4">
              <SectionHeading id="beneficial-owner" index={10} title="Beneficial-owner registration" />
              <p className="text-[15px] leading-relaxed text-foreground/90">
                A beneficial owner is generally the natural person who ultimately owns or controls the
                company — through shareholding, voting rights or other means of control — even where
                the shares are registered in the name of another company or a nominee. Identifying
                beneficial owners is a core anti-money-laundering obligation and is separate from the
                company's own register of members.
              </p>
              <ul className="space-y-2 text-[15px] text-foreground/90">
                <Bullet>Beneficial-owner information is collected and verified during onboarding</Bullet>
                <Bullet>It is recorded separately from the legal shareholder register</Bullet>
                <Bullet>Filing, access and disclosure rules are set by applicable law and can change</Bullet>
                <Bullet>Changes in ownership or control may need to be reported within applicable deadlines</Bullet>
              </ul>
              <p className="text-sm text-muted-foreground">
                Access to beneficial-ownership information is restricted and governed by law; it is not
                a freely or universally accessible dataset. Ask your service provider what applies to
                your structure at the time of filing.
              </p>
            </section>

            {/* 11. Banking */}
            <section className="space-y-4">
              <SectionHeading id="banking" index={11} title="Bank-account preparation" />
              <p className="text-[15px] leading-relaxed text-foreground/90">
                Company registration does not guarantee bank-account approval. Banks and payment
                institutions run their own independent onboarding assessment, and applications are
                declined where the activity, ownership or expected flows fall outside their appetite.
                A complete, coherent file is the single biggest factor you control.
              </p>
              <div className="rounded-xl border bg-card p-5 shadow-panel">
                <div className="flex items-center gap-2">
                  <Banknote className="h-5 w-5 text-copper" aria-hidden="true" />
                  <p className="font-heading text-base">Banking file checklist</p>
                </div>
                <ul className="mt-3 grid gap-2 text-sm text-foreground/90 sm:grid-cols-2">
                  {BANK_CHECKLIST.map((item) => (
                    <Bullet key={item}>{item}</Bullet>
                  ))}
                </ul>
              </div>
            </section>

            {/* 12. Post-incorporation */}
            <section className="space-y-4">
              <SectionHeading
                id="post-incorporation"
                index={12}
                title="Post-incorporation requirements and documents"
              />
              <p className="text-[15px] leading-relaxed text-foreground/90">
                Once the company exists, its identity is evidenced by Registrar documents. You will
                typically hold or later request the following — each is available as a certified
                document through this site:
              </p>
              <ul className="grid gap-2 sm:grid-cols-2">
                {POST_INCORPORATION_DOCS.map((doc) => (
                  <li key={doc.label}>
                    <Link
                      to={doc.to}
                      className="flex items-center justify-between gap-3 rounded-lg border bg-card p-3 text-sm shadow-panel transition-colors hover:bg-muted/50"
                    >
                      <span className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-copper" aria-hidden="true" />
                        {doc.label}
                      </span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="rounded-xl border bg-sand/60 p-6">
                <p className="font-heading text-lg">Already have a Cyprus company?</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Look up any registered entity and order certified Registrar documents online.
                </p>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <Link
                    to="/search"
                    search={{ q: "", page: 1 }}
                    onClick={() =>
                      trackEvent("cta_click", {
                        cta: "register_search",
                        location: "post_incorporation",
                      })
                    }
                  >
                    <Button size="lg" variant="secondary" className="w-full sm:w-auto">
                      <Search className="mr-2 h-4 w-4" aria-hidden="true" />
                      Search the Cyprus Company Register
                    </Button>
                  </Link>
                  <PrimaryCta location="after_post_incorporation" />
                </div>
              </div>
            </section>

            {/* 13. Annual compliance */}
            <section className="space-y-4">
              <SectionHeading id="annual-compliance" index={13} title="Annual compliance" />
              <div className="rounded-xl border bg-card p-5 shadow-panel">
                <ul className="grid gap-2 text-sm text-foreground/90 sm:grid-cols-2">
                  {COMPLIANCE_CHECKLIST.map((item) => (
                    <Bullet key={item}>{item}</Bullet>
                  ))}
                </ul>
              </div>
              <p className="text-sm text-muted-foreground">
                Obligations are not identical for every company. Scope and frequency vary with size,
                activity, whether the company is dormant, group membership and whether the sector is
                regulated. Confirm your company's specific calendar with your accountant and service
                provider.
              </p>
            </section>

            {/* 14. Mistakes */}
            <section className="space-y-4">
              <SectionHeading id="mistakes" index={14} title="Common mistakes" />
              <div className="grid gap-3 sm:grid-cols-2">
                {MISTAKES.map((item) => (
                  <div key={item.title} className="rounded-xl border bg-card p-4 shadow-panel">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-copper" aria-hidden="true" />
                      <div>
                        <p className="font-medium">{item.title}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{item.body}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <CtaBand
                location="before_faq"
                note="Avoid the rework: have an independent specialist review your structure and documents before filing."
              />
            </section>

            {/* Lead magnet */}
            <section id="download" className="scroll-mt-28 space-y-4">
              <div className="rounded-2xl border border-copper/30 bg-sand/70 p-6 sm:p-8">
                <div className="flex items-center gap-2 text-copper">
                  <Download className="h-5 w-5" aria-hidden="true" />
                  <span className="text-xs font-semibold uppercase tracking-wide">Free download</span>
                </div>
                <h2 className="mt-2 text-2xl sm:text-3xl">
                  Download the Cyprus Company Formation Guide 2026
                </h2>
                <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                  Receive the complete guide together with a company-registration checklist, KYC
                  document list and post-incorporation compliance checklist.
                </p>
                <div className="mt-6">
                  <GuideDownloadForm />
                </div>
              </div>
            </section>

            {/* 15. FAQ */}
            <section className="space-y-4">
              <SectionHeading id="faq" index={15} title="Frequently asked questions" />
              <Accordion type="single" collapsible className="rounded-xl border bg-card px-4 shadow-panel">
                {FAQS.map((item, index) => (
                  <AccordionItem key={item.q} value={`faq-${index}`}>
                    <AccordionTrigger className="text-left">{item.q}</AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">{item.a}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </section>

            {/* 16. Introduction form */}
            <section id="introduction" className="scroll-mt-28 space-y-4">
              <SectionHeading
                id="introduction-heading"
                index={16}
                title="Request an Introduction to a Cyprus Company-Formation Specialist"
              />
              <p className="text-[15px] leading-relaxed text-foreground/90">
                Tell us briefly what you need. If appropriate, we will introduce you to an independent
                Cyprus company-formation specialist.
              </p>
              <SpecialistIntroductionForm />
            </section>

            {/* Official sources */}
            <section className="space-y-4">
              <div className="rounded-xl border bg-card p-6 shadow-panel">
                <div className="flex items-center gap-2">
                  <Landmark className="h-5 w-5 text-copper" aria-hidden="true" />
                  <h2 className="text-xl">Official sources and further information</h2>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Factual information in this guide is summarised in our own words from official
                  Cyprus government sources. Always check the current position directly:
                </p>
                <ul className="mt-3 space-y-2 text-sm">
                  {(editorial?.official_source_links ?? []).map((source) => (
                    <li key={source.url}>
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        className="inline-flex items-center text-copper underline underline-offset-4"
                      >
                        {source.label}
                        <ExternalLink className="ml-1.5 h-3.5 w-3.5" aria-hidden="true" />
                      </a>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Editorial block */}
              <div className="rounded-xl border bg-muted/40 p-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2 text-foreground">
                  <Receipt className="h-4 w-4 text-copper" aria-hidden="true" />
                  <p className="font-heading">Editorial information</p>
                </div>
                <dl className="mt-3 grid gap-x-8 gap-y-2 sm:grid-cols-2">
                  <div className="flex justify-between gap-4 border-b py-1">
                    <dt>Published</dt>
                    <dd className="text-foreground">{formatDay(editorial?.date_published ?? "")}</dd>
                  </div>
                  <div className="flex justify-between gap-4 border-b py-1">
                    <dt>Last reviewed</dt>
                    <dd className="text-foreground">{formatDay(reviewed)}</dd>
                  </div>
                  <div className="flex justify-between gap-4 border-b py-1">
                    <dt>Reviewed by</dt>
                    <dd className="text-foreground">{editorial?.reviewer_name ?? "—"}</dd>
                  </div>
                  <div className="flex justify-between gap-4 border-b py-1">
                    <dt>Reviewer role</dt>
                    <dd className="text-foreground">{editorial?.reviewer_role ?? "—"}</dd>
                  </div>
                  <div className="flex justify-between gap-4 border-b py-1">
                    <dt>Guide version</dt>
                    <dd className="text-foreground">{editorial?.guide_version ?? "—"}</dd>
                  </div>
                </dl>
                <p className="mt-4">
                  {editorial?.legal_disclaimer ??
                    "This guide is provided for general information only and does not constitute legal, tax, accounting, financial or investment advice. Requirements may vary according to the proposed activities, ownership structure, jurisdictions involved and applicable law. CompaniesHouseCyprus.com is an independent information service and is not affiliated with the Government of the Republic of Cyprus. Where requested and appropriate, we may introduce users to independent professional service providers."}
                </p>
              </div>
            </section>

            {/* Final CTA */}
            <section className="rounded-2xl surface-deep p-8">
              <h2 className="text-2xl sm:text-3xl">Ready to move forward?</h2>
              <p className="mt-2 max-w-2xl text-primary-foreground/85">
                Request an introduction to an independent Cyprus company-formation specialist, or take
                the full guide with you.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <PrimaryCta location="final" />
                <SecondaryCta location="final" />
              </div>
            </section>
          </article>
        </div>
      </div>
    </main>
  );
}

function TocList() {
  return (
    <ol className="mt-3 space-y-1.5 text-sm">
      {SECTIONS.map((section, index) => (
        <li key={section.id}>
          <a
            href={`#${section.id}`}
            className="flex gap-2 rounded px-1 py-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <span className="tabular-nums text-copper">{index + 1}.</span>
            <span>{section.label}</span>
          </a>
        </li>
      ))}
    </ol>
  );
}
