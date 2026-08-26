import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Banknote,
  BadgeCheck,
  Building2,
  Calculator,
  ClipboardCheck,
  FileSignature,
  FileText,
  Globe2,
  Landmark,
  MapPin,
  Plane,
  Receipt,
  Scale,
  Search,
  ShieldCheck,
  Sparkles,
  Stamp,
  UserCheck,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { CompanySetupEnquiryForm } from "@/components/company-setup/enquiry-form";
import { trackEvent } from "@/lib/analytics";

const TITLE = "Register a Company in Cyprus | Company Formation";
const DESCRIPTION =
  "Learn how to register a company in Cyprus, what documents are required and request assistance from a Cyprus company-formation professional.";
const CANONICAL = "https://companieshousecyprus.com/company-set-up/";

const FAQS = [
  {
    q: "Can a non-resident register a company in Cyprus?",
    a: "Yes. Non-residents may establish and own a Cyprus company, subject to the applicable incorporation, identification and due-diligence requirements. The appropriate management and tax structure should be reviewed professionally.",
  },
  {
    q: "How many shareholders are required?",
    a: "A private company may be established with one or more shareholders. Shareholders may generally be individuals or legal entities.",
  },
  {
    q: "Does a Cyprus company need a director?",
    a: "Yes. At least one director must be appointed. The choice and location of directors may have legal, operational and tax implications.",
  },
  {
    q: "Is a company secretary required?",
    a: "Yes. A Cyprus company must appoint a company secretary.",
  },
  {
    q: "Is a registered office in Cyprus required?",
    a: "Yes. The company must maintain a registered office address in the Republic of Cyprus.",
  },
  {
    q: "How long does incorporation take?",
    a: "The timeframe depends on name approval, the company structure, document availability, due-diligence checks and processing by the relevant authorities. An estimated timeframe can be provided after the initial review.",
  },
  {
    q: "What does the €1,700 starting price include?",
    a: "The precise inclusions will be confirmed in a written quotation. The final amount may depend on the ownership structure, business activity, government fees and optional professional services.",
  },
  {
    q: "Can you guarantee approval of my proposed company name?",
    a: "No. A search may identify existing or similar company names, but formal approval can only be granted through the applicable Registrar process.",
  },
  {
    q: "Can you help with tax, VAT and accounting?",
    a: "These services may be included in a tailored quotation depending on your requirements.",
  },
  {
    q: "Can you guarantee a business bank account?",
    a: "No. Bank and payment-account applications are subject to the independent compliance and approval procedures of the selected institution.",
  },
  {
    q: "Is Companies House Cyprus the official Cyprus Registrar?",
    a: "No. Companies House Cyprus is an independent business-information platform operated by Infocredit Group Ltd. It is not part of or affiliated with the Cyprus Department of Registrar of Companies and Intellectual Property.",
  },
];

const REQUIREMENTS = [
  {
    icon: BadgeCheck,
    title: "Approved company name",
    body: "The proposed name must be submitted for approval and should not conflict with an existing or protected name.",
  },
  {
    icon: Users,
    title: "Shareholders",
    body: "A Cyprus private company must have at least one shareholder. A shareholder may be an individual or a legal entity.",
  },
  {
    icon: UserCheck,
    title: "Directors",
    body: "At least one director must be appointed. The appropriate structure may depend on the company’s operations and intended tax position.",
  },
  {
    icon: ClipboardCheck,
    title: "Company secretary",
    body: "Every Cyprus company must appoint a company secretary.",
  },
  {
    icon: MapPin,
    title: "Registered office",
    body: "The company must maintain a registered office address in the Republic of Cyprus.",
  },
  {
    icon: Banknote,
    title: "Share capital",
    body: "The company’s issued shares, nominal value and allocation between shareholders must be determined.",
  },
  {
    icon: FileSignature,
    title: "Constitutional documents",
    body: "A memorandum and articles of association must be prepared as part of the incorporation.",
  },
  {
    icon: ShieldCheck,
    title: "Beneficial owners",
    body: "The ultimate natural persons who own or control the company must be identified in accordance with applicable requirements.",
  },
];

const STEPS = [
  {
    title: "Tell us what you need",
    body: "Complete the short enquiry form with basic information about the proposed company.",
  },
  {
    title: "Speak with a specialist",
    body: "We introduce you to an appropriate independent Cyprus company-formation professional.",
  },
  {
    title: "Complete onboarding",
    body: "The selected professional will collect the required identification, ownership and due-diligence documents securely.",
  },
  {
    title: "Prepare and submit",
    body: "The company name and incorporation documents are prepared and submitted to the Cyprus Registrar.",
  },
  {
    title: "Receive your company documents",
    body: "Following approval, the company’s official incorporation documents are issued.",
  },
];

const QUOTE_COVERAGE = [
  "Company-name application",
  "Preparation of incorporation documents",
  "Registrar filing fees",
  "Memorandum and articles of association",
  "Official company certificates",
  "Registered-office services",
  "Company-secretary services",
  "Beneficial-owner assistance",
  "Tax and VAT registration",
  "Accounting and audit",
  "Bank or payment-account assistance",
];

const OPTIONAL_SERVICES = [
  { icon: MapPin, title: "Registered office" },
  { icon: ClipboardCheck, title: "Company secretary" },
  { icon: UserCheck, title: "Director services" },
  { icon: Receipt, title: "Tax and VAT registration" },
  { icon: Calculator, title: "Accounting and audit" },
  { icon: Landmark, title: "Bank or payment-account assistance" },
  { icon: Plane, title: "Business relocation and work permits" },
  { icon: Stamp, title: "Trademark registration" },
];

const DISCLAIMER =
  "Companies House Cyprus is an independent business-information platform operated by Infocredit Group Ltd. It is not affiliated with, endorsed by, or part of the Cyprus Department of Registrar of Companies and Intellectual Property. Companies House Cyprus does not provide legal or tax advice. Where requested, users may be introduced to independent qualified professionals. Submitting an enquiry does not constitute an application to register a company and does not guarantee company-name approval, incorporation, tax treatment or approval of a bank or payment account.";

export const Route = createFileRoute("/company-set-up")({
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
              name: "Register a Company in Cyprus",
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
          "@type": "Service",
          name: "Cyprus company formation introduction service",
          serviceType: "Company formation assistance and professional introduction",
          description:
            "Enquiry and introduction service connecting businesses with independent Cyprus company-formation professionals. Companies House Cyprus is not a government authority or the Cyprus Registrar.",
          areaServed: { "@type": "Country", name: "Cyprus" },
          provider: {
            "@type": "Organization",
            name: "Companies House Cyprus",
            legalName: "Infocredit Group Ltd",
            url: "https://companieshousecyprus.com/",
          },
          offers: {
            "@type": "Offer",
            priceCurrency: "EUR",
            price: "1700",
            priceSpecification: {
              "@type": "PriceSpecification",
              priceCurrency: "EUR",
              minPrice: "1700",
              valueAddedTaxIncluded: false,
            },
            url: CANONICAL,
          },
        }),
      },
    ],
  }),
  component: CompanySetUpPage,
});

function scrollTo(id: string) {
  if (typeof document === "undefined") return;
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function CompanySetUpPage() {
  const goToForm = () => {
    trackEvent("cta_click", { page: "company_set_up", target: "enquiry" });
    scrollTo("enquiry");
  };

  return (
    <main className="pb-24 md:pb-0">
      {/* ---------------------------------------------------------- hero -- */}
      <section className="border-b bg-gradient-to-b from-primary/10 via-background to-background">
        <div className="container mx-auto grid gap-10 px-4 py-12 md:py-16 lg:grid-cols-[1.15fr_0.85fr] lg:items-start lg:gap-14">
          <div>
            <nav aria-label="Breadcrumb" className="mb-4 text-xs text-muted-foreground">
              <Link to="/" className="hover:underline">
                Home
              </Link>
              <span className="mx-1.5">/</span>
              <span aria-current="page">Register a Company in Cyprus</span>
            </nav>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              Cyprus company formation
            </p>
            <h1 className="mt-3 font-heading text-3xl leading-tight sm:text-4xl lg:text-5xl">
              Register a Company in Cyprus
            </h1>
            <p className="mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
              Establish your Cyprus company with support from an experienced company-formation
              professional. Get assistance with name approval, incorporation, registered office,
              company secretary, tax registration and other essential services.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button size="lg" onClick={goToForm}>
                Start Your Enquiry
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => scrollTo("requirements")}>
                View What You Need
              </Button>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Initial enquiry takes approximately two minutes. No obligation and no payment required.
            </p>
          </div>

          <aside className="rounded-2xl border bg-card p-6 shadow-panel">
            <p className="text-sm font-medium text-muted-foreground">Company formation packages</p>
            <p className="mt-2 font-heading text-4xl">
              From €1,700 <span className="text-lg text-muted-foreground">+ VAT</span>
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              Final pricing depends on the company’s ownership structure, business activity and
              services required. A complete quotation will be provided before you proceed.
            </p>
            <Button className="mt-5 w-full" onClick={goToForm}>
              Request a Tailored Quotation
            </Button>
            <ul className="mt-5 space-y-2 text-sm">
              {["Transparent quotation", "Professional assistance", "No obligation to proceed"].map(
                (item) => (
                  <li key={item} className="flex items-center gap-2">
                    <BadgeCheck className="h-4 w-4 text-primary" aria-hidden="true" />
                    {item}
                  </li>
                ),
              )}
            </ul>
          </aside>
        </div>
      </section>

      {/* -------------------------------------------------- requirements -- */}
      <section id="requirements" className="scroll-mt-24 border-b py-14">
        <div className="container mx-auto px-4">
          <h2 className="font-heading text-2xl sm:text-3xl">
            What is required to register a Cyprus company?
          </h2>
          <p className="mt-3 max-w-3xl text-muted-foreground">
            A typical Cyprus private company limited by shares requires the following information and
            arrangements.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {REQUIREMENTS.map((item) => (
              <div key={item.title} className="rounded-xl border bg-card p-5">
                <item.icon className="h-6 w-6 text-primary" aria-hidden="true" />
                <h3 className="mt-3 font-heading text-base">{item.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{item.body}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">
            The appropriate structure depends on the company’s activities, ownership and intended use.
            A qualified professional should review the circumstances before incorporation. You can
            check whether a name is already taken with our{" "}
            <Link to="/search" search={{ q: "", page: 1 }} className="underline underline-offset-2">
              Cyprus company search
            </Link>
            .
          </p>
        </div>
      </section>

      {/* ------------------------------------------------------ how it works -- */}
      <section className="border-b bg-muted/20 py-14">
        <div className="container mx-auto px-4">
          <h2 className="font-heading text-2xl sm:text-3xl">How Cyprus company formation works</h2>
          <ol className="mt-8 grid gap-4 md:grid-cols-3 lg:grid-cols-5">
            {STEPS.map((step, index) => (
              <li key={step.title} className="rounded-xl border bg-card p-5">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                  {index + 1}
                </span>
                <h3 className="mt-3 font-heading text-base">{step.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* --------------------------------------------------------- pricing -- */}
      <section className="border-b py-14">
        <div className="container mx-auto grid gap-8 px-4 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <h2 className="font-heading text-2xl sm:text-3xl">Clear pricing before you proceed</h2>
            <div className="mt-6 rounded-2xl border bg-card p-6 shadow-panel">
              <h3 className="font-heading text-lg">Cyprus Company Formation</h3>
              <p className="mt-2 font-heading text-4xl">
                From €1,700 <span className="text-lg text-muted-foreground">+ VAT</span>
              </p>
              <p className="mt-3 text-sm text-muted-foreground">
                The starting price applies to a standard company-formation case. The final fee may
                vary depending on the ownership structure, business activity, professional
                requirements and optional services selected.
              </p>
              <Button className="mt-5 w-full" onClick={goToForm}>
                Request a Tailored Quotation
              </Button>
            </div>
          </div>
          <div className="rounded-2xl border bg-card p-6">
            <h3 className="font-heading text-lg">Your tailored quotation may cover:</h3>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {QUOTE_COVERAGE.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm">
                  <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-5 rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">
              The precise services included, government fees, professional fees and recurring annual
              charges will be clearly itemised in your quotation before you decide whether to proceed.
            </p>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------- optional services -- */}
      <section className="border-b bg-muted/20 py-14">
        <div className="container mx-auto px-4">
          <h2 className="font-heading text-2xl sm:text-3xl">
            Additional services for your Cyprus company
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {OPTIONAL_SERVICES.map((service) => (
              <div key={service.title} className="flex items-center gap-3 rounded-xl border bg-card p-5">
                <service.icon className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                <h3 className="font-heading text-sm">{service.title}</h3>
              </div>
            ))}
          </div>
          <p className="mt-6 text-sm text-muted-foreground">
            Select the services you may require in the enquiry form. The specialist can then prepare a
            quotation based on your actual requirements. For existing entities, see our{" "}
            <Link to="/pricing" className="underline underline-offset-2">
              official certificates and reports
            </Link>
            .
          </p>
        </div>
      </section>

      {/* ------------------------------------------------------ lead form -- */}
      <section id="enquiry" className="scroll-mt-24 border-b py-14">
        <div className="container mx-auto grid gap-10 px-4 lg:grid-cols-[1fr_0.8fr] lg:items-start">
          <div>
            <h2 className="font-heading text-2xl sm:text-3xl">
              Tell us about the company you want to establish
            </h2>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              Complete this short form and we will review your requirements. Do not upload identity
              documents or other sensitive personal information at this stage.
            </p>
            <div className="mt-6">
              <CompanySetupEnquiryForm />
            </div>
            <p className="mt-5 text-xs leading-relaxed text-muted-foreground">{DISCLAIMER}</p>
          </div>

          <aside className="space-y-6">
            <div className="rounded-xl border bg-card p-6">
              <h2 className="font-heading text-xl">What documents may be requested later?</h2>
              <p className="mt-3 text-sm text-muted-foreground">
                After the initial review, the selected professional may request documents for the
                shareholders, directors and beneficial owners. These are normally collected through a
                secure onboarding process.
              </p>
              <h3 className="mt-5 font-heading text-sm uppercase tracking-wide text-muted-foreground">
                For individuals
              </h3>
              <ul className="mt-2 space-y-1.5 text-sm">
                {[
                  "Valid passport or identity document",
                  "Recent proof of residential address",
                  "Professional or business background",
                  "Information about the proposed activity",
                  "Source-of-funds information where required",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <FileText className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
              <h3 className="mt-5 font-heading text-sm uppercase tracking-wide text-muted-foreground">
                For corporate shareholders
              </h3>
              <ul className="mt-2 space-y-1.5 text-sm">
                {[
                  "Certificate of incorporation",
                  "Registered-office certificate or equivalent",
                  "Director and shareholder information",
                  "Constitutional documents",
                  "Ownership structure up to the ultimate beneficial owners",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
              <p className="mt-4 rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
                Please do not submit sensitive documents through the initial enquiry form.
              </p>
            </div>

            <div className="rounded-xl border bg-card p-6 text-sm">
              <h3 className="font-heading text-base">Useful links</h3>
              <ul className="mt-3 space-y-2">
                <li>
                  <Link to="/search" search={{ q: "", page: 1 }} className="inline-flex items-center gap-2 underline underline-offset-2">
                    <Search className="h-4 w-4" aria-hidden="true" /> Cyprus company search
                  </Link>
                </li>
                <li>
                  <Link to="/cyprus-companies-registry" className="inline-flex items-center gap-2 underline underline-offset-2">
                    <Globe2 className="h-4 w-4" aria-hidden="true" /> Business name approval and trade
                    name registration
                  </Link>
                </li>
                <li>
                  <Link to="/pricing" className="inline-flex items-center gap-2 underline underline-offset-2">
                    <Stamp className="h-4 w-4" aria-hidden="true" /> Official certificates
                  </Link>
                </li>
                <li>
                  <Link to="/guides/register-company-cyprus" className="inline-flex items-center gap-2 underline underline-offset-2">
                    <Sparkles className="h-4 w-4" aria-hidden="true" /> Cyprus company formation guide
                  </Link>
                </li>
                <li>
                  <Link to="/privacy" className="inline-flex items-center gap-2 underline underline-offset-2">
                    <ShieldCheck className="h-4 w-4" aria-hidden="true" /> Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link to="/terms" className="inline-flex items-center gap-2 underline underline-offset-2">
                    <Scale className="h-4 w-4" aria-hidden="true" /> Terms and Conditions
                  </Link>
                </li>
                <li>
                  <Link to="/contact" className="inline-flex items-center gap-2 underline underline-offset-2">
                    <ArrowRight className="h-4 w-4" aria-hidden="true" /> Contact page
                  </Link>
                </li>
              </ul>
            </div>
          </aside>
        </div>
      </section>

      {/* ------------------------------------------------------------- faq -- */}
      <section className="border-b bg-muted/20 py-14">
        <div className="container mx-auto max-w-3xl px-4">
          <h2 className="font-heading text-2xl sm:text-3xl">Frequently asked questions</h2>
          <Accordion type="single" collapsible className="mt-6">
            {FAQS.map((item, index) => (
              <AccordionItem key={item.q} value={`faq-${index}`}>
                <AccordionTrigger className="text-left">{item.q}</AccordionTrigger>
                <AccordionContent>{item.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* ------------------------------------------------------ final CTA -- */}
      <section className="bg-primary/95 py-14 text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="font-heading text-2xl sm:text-3xl">
            Ready to establish your Cyprus company?
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm opacity-90 sm:text-base">
            Tell us about your plans and request an introduction to an independent company-formation
            professional.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
            <Button size="lg" variant="secondary" onClick={goToForm}>
              Start Your Enquiry
            </Button>
            <Link to="/search" search={{ q: "", page: 1 }} className="text-sm underline underline-offset-4">
              Search Cyprus Companies
            </Link>
          </div>
          <p className="mx-auto mt-8 max-w-3xl text-xs opacity-80">
            Companies House Cyprus is an independent platform operated by Infocredit Group Ltd and is
            not affiliated with the Cyprus Department of Registrar of Companies and Intellectual
            Property. Submitting an enquiry does not constitute an application to register a company.
          </p>
        </div>
      </section>

      {/* --------------------------------------------------- sticky mobile -- */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 p-3 backdrop-blur md:hidden">
        <Button className="w-full" size="lg" onClick={goToForm}>
          Start Your Enquiry
        </Button>
      </div>
    </main>
  );
}
