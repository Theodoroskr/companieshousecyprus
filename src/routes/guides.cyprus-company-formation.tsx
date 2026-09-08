import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BadgeCheck, Building2, ClipboardList, FileText, Landmark, Search, Stamp, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";

const TITLE = "Cyprus Company Formation: Costs, Steps & Documents (2026)";
const DESCRIPTION =
  "Company formation in Cyprus, step by step: Registrar name approval to incorporation, government fees and annual costs, and every document you need to prepare.";

const CANONICAL = "https://companieshousecyprus.com/guides/cyprus-company-formation";
const PUBLISHED = "2026-09-08";

const FAQS = [
  {
    question: "How much does Cyprus company formation cost?",
    answer:
      "Government fees are modest: a name-approval fee, a registration fee based on authorised share capital, plus stamp duty of 0.6% on the authorised share capital (capped at €20,000). Professional service fees for drafting the memorandum and articles, registered office and company secretary are separate and vary by provider. Budget for the €350 annual company levy from the first full year onwards.",
  },
  {
    question: "How long does it take to form a company in Cyprus?",
    answer:
      "Name approval typically takes a few working days, and incorporation a further few working days once the Registrar accepts the signed incorporation package. Using a pre-approved shelf company can shorten the effective timeline, but you should still update officers, registered office and beneficial-owner details afterwards.",
  },
  {
    question: "Can a non-resident form a Cyprus company?",
    answer:
      "Yes. Cyprus company law does not require shareholders or directors to be Cyprus residents. However, tax residency of the company depends on management and control, and most banks and the tax authorities expect at least some local substance. Non-residents usually work through a local professional who provides the registered office and secretary.",
  },
  {
    question: "What documents do I need to form a Cyprus company?",
    answer:
      "Certified passport copies and recent proof of address for each beneficial owner, director and secretary; the memorandum and articles of association; the HE1 statutory declaration by a Cyprus lawyer; HE2 (registered office) and HE3 (directors and secretary) forms; and the approved name application. Banks will additionally request business plans and source-of-funds evidence for account opening.",
  },
  {
    question: "Do I need a company secretary and registered office in Cyprus?",
    answer:
      "Yes. Every Cyprus company must have a registered office address in Cyprus and a company secretary at all times. These are usually provided as services by the firm handling your incorporation.",
  },
  {
    question: "What ongoing obligations follow incorporation?",
    answer:
      "File the HE32 annual return with financial statements each year, pay the €350 annual levy by 30 June, keep the beneficial-owner register up to date, maintain accounting records and audited financial statements, and renew tax and VAT registrations where applicable. Missing filings leads to penalties and ultimately strike-off.",
  },
] as const;

export const Route = createFileRoute("/guides/cyprus-company-formation")({
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
          "@graph": [
            {
              "@type": "Article",
              "@id": `${CANONICAL}#article`,
              headline: TITLE,
              description: DESCRIPTION,
              datePublished: PUBLISHED,
              dateModified: PUBLISHED,
              inLanguage: "en",
              mainEntityOfPage: CANONICAL,
              author: { "@id": "https://companieshousecyprus.com/#organization" },
              publisher: { "@id": "https://companieshousecyprus.com/#organization" },
              about: {
                "@type": "Thing",
                name: "Cyprus company formation",
              },
            },
            {
              "@type": "FAQPage",
              mainEntity: FAQS.map((faq) => ({
                "@type": "Question",
                name: faq.question,
                acceptedAnswer: { "@type": "Answer", text: faq.answer },
              })),
            },
            {
              "@type": "BreadcrumbList",
              itemListElement: [
                { "@type": "ListItem", position: 1, name: "Home", item: "https://companieshousecyprus.com/" },
                { "@type": "ListItem", position: 2, name: "Guides", item: "https://companieshousecyprus.com/guides" },
                { "@type": "ListItem", position: 3, name: "Cyprus company formation", item: CANONICAL },
              ],
            },
          ],
        }),
      },
    ],
  }),
  component: FormationGuide,
});

const SECTION_CLASS = "mx-auto max-w-3xl px-4";

const STEPS = [
  {
    title: "Choose the company structure and name",
    body: "Most founders register a private company limited by shares. Propose a name through your service provider — the Registrar rejects names that are identical or confusingly similar to existing entities, overly generic, or that contain restricted words (bank, insurance, university, and similar) without the relevant licence. Check whether your preferred name is already taken with a free registry search before filing.",
  },
  {
    title: "Prepare the incorporation package",
    body: "Your Cyprus lawyer drafts the memorandum and articles of association, signs the HE1 statutory declaration of compliance, and files the HE2 (registered office) and HE3 (directors and secretary) forms together with the approved name.",
  },
  {
    title: "File with the Registrar of Companies",
    body: "The package is submitted to the Department of Registrar of Companies and Intellectual Property with the registration fee and stamp duty. On acceptance, the Registrar issues the certificate of incorporation and the company's HE registration number.",
  },
  {
    title: "Complete post-incorporation registrations",
    body: "Register for a tax identification code, VAT if turnover thresholds or cross-border trade require it, update the register of beneficial owners, and open the business bank account — the step that usually takes longest for non-resident founders.",
  },
] as const;

const COSTS = [
  {
    item: "Name approval",
    detail: "A small government fee per name application, paid when the proposed name is submitted to the Registrar.",
  },
  {
    item: "Registration fee",
    detail: "Charged on the authorised share capital at filing, with an expedited option available through the Registrar for urgent incorporations.",
  },
  {
    item: "Stamp duty",
    detail: "0.6% of the authorised share capital, capped at €20,000, paid on the memorandum at incorporation.",
  },
  {
    item: "Professional services",
    detail: "Legal drafting, registered office, company secretary and filing handled by your provider; fees vary by firm and by the complexity of the share structure.",
  },
  {
    item: "Annual company levy",
    detail: "€350 per year, payable to the Registrar by 30 June. Non-payment leads to penalties and can result in the company being struck off.",
  },
  {
    item: "Accounting, audit and annual return",
    detail: "Every Cyprus company must keep proper books, prepare audited financial statements and file the HE32 annual return. Ongoing compliance cost depends on transaction volume.",
  },
] as const;

const DOCUMENTS = [
  "Certified passport copy for every beneficial owner, director and secretary",
  "Recent proof of residential address (utility bill or bank statement) for each person",
  "Memorandum and articles of association drafted for the company's objects and share capital",
  "HE1 statutory declaration of compliance, sworn by a Cyprus lawyer",
  "HE2 notice of the registered office address in Cyprus",
  "HE3 particulars of the directors and company secretary",
  "Approved company-name application",
  "Bank-reference or professional-reference letters, usually requested by the bank at account opening",
] as const;

function FormationGuide() {
  return (
    <main>
      <section className="surface-deep">
        <div className="mx-auto max-w-5xl px-4 py-14 sm:py-20">
          <nav aria-label="Breadcrumb" className="text-sm text-primary-foreground/70">
            <Link to="/" className="hover:underline">Home</Link>
            <span className="mx-2">/</span>
            <Link to="/guides" className="hover:underline">Guides</Link>
            <span className="mx-2">/</span>
            <span aria-current="page">Cyprus company formation</span>
          </nav>
          <h1 className="mt-4 max-w-3xl text-3xl sm:text-4xl">
            Cyprus company formation: steps, costs and documents
          </h1>
          <p className="mt-4 max-w-2xl text-primary-foreground/80">
            What forming a company in Cyprus actually involves — the Registrar's process from name
            approval to certificate of incorporation, the government and professional costs, and the
            paperwork to have ready before you start.
          </p>
          <p className="mt-6 text-sm text-primary-foreground/60">
            By Companies House Cyprus (Infocredit Group Limited, HE4404) · Published 8 September 2026
          </p>
        </div>
      </section>

      <article className="py-12">
        <div className={`${SECTION_CLASS} space-y-14`}>
          <section>
            <h2 className="flex items-center gap-2 font-heading text-2xl">
              <Building2 className="h-6 w-6 text-copper" aria-hidden="true" />
              What a Cyprus company is
            </h2>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              A Cyprus private company limited by shares is a separate legal person registered with the
              Department of Registrar of Companies and Intellectual Property. It can hold property, sign
              contracts and trade internationally, benefits from Cyprus's EU membership and double-tax
              treaty network, and is taxed at a corporate rate of 12.5% when it is managed and controlled
              from Cyprus. One shareholder and one director are enough to incorporate, and neither needs
              to be a Cyprus resident.
            </p>
          </section>

          <section>
            <h2 className="flex items-center gap-2 font-heading text-2xl">
              <ClipboardList className="h-6 w-6 text-copper" aria-hidden="true" />
              The formation steps
            </h2>
            <ol className="mt-6 space-y-6">
              {STEPS.map((step, index) => (
                <li key={step.title} className="flex gap-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary font-heading text-sm text-primary-foreground">
                    {index + 1}
                  </span>
                  <div>
                    <h3 className="font-heading text-lg">{step.title}</h3>
                    <p className="mt-1.5 leading-relaxed text-muted-foreground">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
            <p className="mt-6 leading-relaxed text-muted-foreground">
              For the full end-to-end walkthrough, including tax registration, banking and the first
              year's compliance calendar, read our{" "}
              <Link to="/guides/register-company-cyprus" className="text-primary hover:underline">
                complete guide to registering a company in Cyprus
              </Link>
              .
            </p>
          </section>

          <section>
            <h2 className="flex items-center gap-2 font-heading text-2xl">
              <Wallet className="h-6 w-6 text-copper" aria-hidden="true" />
              What Cyprus company formation costs
            </h2>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              Total cost has two parts: government charges payable to the Registrar and the Stamp Duty
              Commissioner, and professional fees for the firm that drafts and files your incorporation.
            </p>
            <div className="mt-6 overflow-hidden rounded-xl border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 text-left">
                    <th scope="col" className="px-4 py-3 font-heading">Cost</th>
                    <th scope="col" className="px-4 py-3 font-heading">What it covers</th>
                  </tr>
                </thead>
                <tbody>
                  {COSTS.map((row) => (
                    <tr key={row.item} className="border-b last:border-0">
                      <th scope="row" className="px-4 py-3 text-left font-medium">{row.item}</th>
                      <td className="px-4 py-3 text-muted-foreground">{row.detail}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              Government fees change from time to time — confirm current amounts with the Registrar of
              Companies or your service provider before filing. Read more about the{" "}
              <Link to="/registry/$topic" params={{ topic: "cyprus-company-annual-levy" }} className="text-primary hover:underline">
                annual levy
              </Link>{" "}
              and the{" "}
              <Link to="/registry/$topic" params={{ topic: "cyprus-annual-return-he32" }} className="text-primary hover:underline">
                HE32 annual return
              </Link>
              .
            </p>
          </section>

          <section>
            <h2 className="flex items-center gap-2 font-heading text-2xl">
              <FileText className="h-6 w-6 text-copper" aria-hidden="true" />
              Documents you need to prepare
            </h2>
            <ul className="mt-6 space-y-3">
              {DOCUMENTS.map((doc) => (
                <li key={doc} className="flex items-start gap-3">
                  <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0 text-copper" aria-hidden="true" />
                  <span className="leading-relaxed text-muted-foreground">{doc}</span>
                </li>
              ))}
            </ul>
            <p className="mt-6 leading-relaxed text-muted-foreground">
              Corporate shareholders additionally provide their certificate of incorporation, registers
              of directors and shareholders, and good-standing evidence. All foreign-language documents
              need certified translations, and banks may ask for them apostilled.
            </p>
          </section>

          <section>
            <h2 className="flex items-center gap-2 font-heading text-2xl">
              <Stamp className="h-6 w-6 text-copper" aria-hidden="true" />
              Before you file: check the name
            </h2>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              The most common reason a formation stalls is a name rejection. Search the live register
              first to see whether a similar company name already exists, then read the{" "}
              <Link to="/registry/$topic" params={{ topic: "cyprus-company-name-approval" }} className="text-primary hover:underline">
                Cyprus name-approval rules
              </Link>{" "}
              covering restricted words and similarity checks.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button asChild>
                <Link to="/search" search={{ q: "", page: 1 }}>
                  <Search className="mr-2 h-4 w-4" aria-hidden="true" />
                  Check name availability
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/company-set-up">
                  Get help with your formation
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </section>

          <section>
            <h2 className="flex items-center gap-2 font-heading text-2xl">
              <Landmark className="h-6 w-6 text-copper" aria-hidden="true" />
              Frequently asked questions
            </h2>
            <div className="mt-6 space-y-6">
              {FAQS.map((faq) => (
                <div key={faq.question}>
                  <h3 className="font-heading text-lg">{faq.question}</h3>
                  <p className="mt-2 leading-relaxed text-muted-foreground">{faq.answer}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-xl border bg-card p-6 shadow-panel">
            <h2 className="font-heading text-xl">About this guide</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              This guide is general information, not legal or tax advice. Companies House Cyprus is an
              independent commercial service operated by Infocredit Group Limited (HE4404) and is not
              affiliated with the Government of the Republic of Cyprus or the Department of Registrar of
              Companies and Intellectual Property. Figures were checked against public registrar
              information at the time of publication; confirm current fees and requirements before filing.
            </p>
          </section>
        </div>
      </article>
    </main>
  );
}
