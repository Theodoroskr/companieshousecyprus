import { createFileRoute, Link } from "@tanstack/react-router";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { FileCheck2, Clock, ShieldCheck, HelpCircle, Search, Mail } from "lucide-react";

const TITLE = "Certificate ordering FAQ | Companies House Cyprus";
const DESCRIPTION =
  "Answers to common questions about ordering Cyprus company certificates: who can order, what company information is needed, processing times and delivery.";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:url", content: "/faq" },
    ],
    links: [{ rel: "canonical", href: "/faq" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: FAQS.flatMap((section) =>
            section.items.map((item) => ({
              "@type": "Question",
              name: item.q,
              acceptedAnswer: { "@type": "Answer", text: item.a },
            })),
          ),
        }),
      },
    ],
  }),
  component: FaqPage,
});

const FAQS = [
  {
    category: "Eligibility",
    icon: ShieldCheck,
    items: [
      {
        q: "Who can order a Cyprus company certificate?",
        a: "Anyone can order. The Cyprus register is public, and the Department of Registrar of Companies does not restrict who may request a certificate. You do not need to be a director, shareholder, lawyer or employee of the company.",
      },
      {
        q: "Can I order a certificate for any company, partnership or business name?",
        a: "Yes, provided the entity is — or was — on the Cyprus register. We can issue certificates for active companies, struck-off companies, partnerships, business names and overseas companies with a Cyprus branch.",
      },
      {
        q: "Can I order certificates from outside Cyprus?",
        a: "Yes. We deliver digitally, so certificates can be ordered from any country. Most clients use them for international banking, litigation, due diligence, tender bids and foreign registry filings.",
      },
    ],
  },
  {
    category: "Required company information",
    icon: Search,
    items: [
      {
        q: "What company information do I need to provide?",
        a: "At a minimum, the company name or official registration number (e.g. HE 252407). We can locate the record from either. If you are unsure of the exact name, use the search bar to find the company first, then click Order certificate.",
      },
      {
        q: "What if the company has a similar name to another company?",
        a: "Always provide the registration number (HE number) when you can. This eliminates any ambiguity. If you only have a name, we will confirm the company with you before submitting the order to the Registrar.",
      },
      {
        q: "Do I need to upload documents or proof of identity?",
        a: "For standard certificates, no. Some research products, such as the Due Diligence Report, may require a brief call or written scope confirmation before fieldwork begins. If any ID is needed, we will ask for it directly.",
      },
    ],
  },
  {
    category: "Processing & delivery",
    icon: Clock,
    items: [
      {
        q: "How long does a certificate take?",
        a: "Most Registrar certificates are ready within one to two business days. Electronic profiles and reports are usually delivered the same business day. Apostille, translation or notarisation can add one to three business days.",
      },
      {
        q: "How are certificates delivered?",
        a: "Digital PDF delivery is standard. Hard copies, apostille, sworn translation and notarised copies can be arranged on request. We will contact you after checkout to confirm the exact format you need.",
      },
      {
        q: "Can I cancel or change an order after it has been submitted?",
        a: "You can cancel or change an order before we file it with the Registrar. Once an application has been submitted to the Department of Registrar of Companies, the order cannot be changed or refunded because government fees are paid at that point.",
      },
      {
        q: "What happens if the company is struck off or dissolved?",
        a: "We will first check the live status. If a certificate cannot be issued because the entity is struck off, we will offer a Certificate of Strike Off or a full refund if no certificate exists.",
      },
    ],
  },
  {
    category: "Products & certificates",
    icon: FileCheck2,
    items: [
      {
        q: "Which certificates can I order?",
        a: "We offer Certificate of Good Standing, Certificate of Directors, Certificate of Shareholders, Certificate of Capital, Certificate of Strike Off, and bundled profiles such as the Cyprus Company Profile and KYB Pack.",
      },
      {
        q: "Are the certificates official documents?",
        a: "Yes. Certificates are issued by the Department of Registrar of Companies and Intellectual Property. They are official extracts of the public register, not internal summaries.",
      },
    ],
  },
];

function FaqPage() {
  return (
    <div>
      <section className="surface-deep grid-dots">
        <div className="mx-auto max-w-7xl px-4 py-16 md:py-24">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-copper">Help centre</p>
          <h1 className="mt-4 max-w-3xl text-4xl font-bold md:text-5xl">
            Certificate ordering questions, answered.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-primary-foreground/75">
            Everything you need to know about eligibility, what company details to provide, and how certificates are
            processed and delivered.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 md:py-20">
        <div className="grid gap-12 lg:grid-cols-[1fr_320px]">
          <div className="space-y-14">
            {FAQS.map((section) => (
              <div key={section.category}>
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <section.icon className="size-5" />
                  </div>
                  <h2 className="text-xl font-semibold">{section.category}</h2>
                </div>
                <Accordion type="single" collapsible className="w-full">
                  {section.items.map((item, index) => (
                    <AccordionItem key={index} value={`${section.category}-${index}`}>
                      <AccordionTrigger className="text-base font-medium">{item.q}</AccordionTrigger>
                      <AccordionContent className="text-muted-foreground leading-relaxed">{item.a}</AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            ))}
          </div>

          <aside className="space-y-6">
            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <div className="flex size-12 items-center justify-center rounded-lg bg-copper/10 text-copper">
                <HelpCircle className="size-6" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">Still need help?</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                If your question is not answered above, contact our support team. We usually reply the same business
                day.
              </p>
              <Button asChild className="mt-5 w-full bg-copper text-copper-foreground hover:bg-copper/90">
                <Link to="/contact">
                  <Mail className="mr-2 size-4" />
                  Contact support
                </Link>
              </Button>
            </div>

            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <h3 className="text-lg font-semibold">Ready to order?</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Search the company and add the certificate you need to your basket.
              </p>
              <Button asChild variant="outline" className="mt-5 w-full">
                <Link to="/pricing">View all products</Link>
              </Button>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}
