import { createFileRoute, Link } from "@tanstack/react-router";
import { Scale, ShieldCheck, Mail, FileText } from "lucide-react";

const TITLE = "Terms of service — Companies House Cyprus";
const DESCRIPTION =
  "Terms and conditions for using the Companies House Cyprus directory and ordering Registrar-issued documents, reports and certificates.";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "/terms" }],
  }),
  component: TermsPage,
});

const SECTIONS = [
  {
    heading: "1. About this service",
    body: "Companies House Cyprus is an independent online directory of the Cyprus company register and an ordering service for Registrar-issued documents and company intelligence reports. We are operated by Infocredit Group Ltd. The directory is not affiliated with, nor endorsed by, the Department of Registrar of Companies and Intellectual Property or the Government of the Republic of Cyprus. Data is reproduced from public sources in accordance with applicable law.",
  },
  {
    heading: "2. Use of the directory",
    body: "The public directory is provided for lawful use. You may not scrape, bulk-download, systematically extract or re-publish the register data at scale, nor use it for unsolicited marketing, unlawful profiling of individuals, or any purpose prohibited by Cyprus or EU law. We reserve the right to limit access where usage appears to violate these restrictions.",
  },
  {
    heading: "3. Information we collect and how we use it",
    body: "When you register for our services or place an order, we may collect your name, company name, position, VAT number, address, telephone, fax and email address. We use this information solely to process your registrations, fulfil orders, communicate with you about your account, and provide the services you request.",
  },
  {
    heading: "4. Accuracy of data",
    body: "Register data is reproduced from official Registrar exports and other public sources. Records may lag behind filings made at the Registrar and may contain errors present in the source. The directory is informational; only a Registrar-issued certificate or official extract is evidential for legal purposes.",
  },
  {
    heading: "5. Orders and delivery",
    body: "Placing an order submits a request. An order is accepted only when we confirm it in writing. Certificates and reports are typically delivered within one to two business days by email as a PDF. Apostille, certified translation, due-diligence investigations and courier delivery are chargeable extras quoted separately.",
  },
  {
    heading: "6. Prices and payment",
    body: "Prices are shown in euro and are exclusive of applicable Cyprus VAT (currently 19%) unless otherwise stated. Payment is required before documents are issued unless an approved account has been agreed in writing. Card payments are processed through secure, PCI-compliant payment providers.",
  },
  {
    heading: "7. Refunds and cancellations",
    body: "Because Registrar documents are ordered on request and many reports are bespoke, orders cannot be cancelled once the work has commenced or the certificate has been requested from the Registrar. If a document or report cannot be issued, any amount paid is refunded in full.",
  },
  {
    heading: "8. Intellectual property",
    body: "The structure, layout, branding and original content of the website are owned by Infocredit Group Ltd. Public register data is not our intellectual property, but the way it is organised, formatted and presented on this site is protected. You may not copy or reproduce substantial parts of the website without permission.",
  },
  {
    heading: "9. Liability",
    body: "To the fullest extent permitted by law, our liability arising from use of the directory or any document or report supplied is limited to the amount paid for the relevant order. We are not liable for indirect, consequential or economic loss, including decisions taken in reliance on directory data.",
  },
  {
    heading: "10. Privacy and cookies",
    body: "Our Privacy Policy explains how we use the information we collect about you, the cookies we may use and your rights under data protection law. By using this service you consent to the practices described in the Privacy Policy.",
  },
  {
    heading: "11. Governing law",
    body: "These terms are governed by the laws of the Republic of Cyprus, and the courts of Cyprus have exclusive jurisdiction over any dispute arising from use of the service.",
  },
  {
    heading: "12. Contact",
    body: "For any question about these terms, please contact us at info@infocreditgroup.com.",
  },
];

function TermsPage() {
  return (
    <div className="relative overflow-hidden">
      {/* Hero */}
      <div className="relative bg-primary py-14 text-primary-foreground">
        <div className="absolute inset-0 grid-dots opacity-20" />
        <div className="absolute -right-20 -top-20 size-80 rounded-full bg-copper/25 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 size-72 rounded-full bg-primary-glow/20 blur-3xl" />
        <div className="relative mx-auto max-w-3xl px-4">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-copper">
            <Scale className="size-4" />
            <span>Legal</span>
          </div>
          <h1 className="mt-3 font-display text-3xl font-bold sm:text-4xl">
            Terms and Conditions
          </h1>
          <p className="mt-3 max-w-2xl text-sm/6 text-primary-foreground/80">
            The terms governing use of the Companies House Cyprus directory and
            orders for Registrar documents, company reports and certificates.
          </p>
          <p className="mt-4 text-xs text-primary-foreground/60">
            Last updated: {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-3xl px-4 py-14">
        <div className="space-y-10">
          {SECTIONS.map((section) => (
            <section key={section.heading} className="scroll-mt-24">
              <h2 className="font-display text-lg font-semibold text-foreground">
                {section.heading}
              </h2>
              <p className="mt-3 leading-7 text-muted-foreground">
                {section.body}
              </p>
            </section>
          ))}
        </div>

        {/* Related cards */}
        <div className="mt-16 grid gap-4 sm:grid-cols-2">
          <Link
            to="/privacy"
            className="group flex items-start gap-4 rounded-xl border bg-card p-5 transition-all hover:border-copper/40 hover:shadow-panel"
          >
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ShieldCheck className="size-5" />
            </div>
            <div>
              <h3 className="font-display text-sm font-semibold text-foreground group-hover:text-copper">
                Privacy policy
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                How we handle your data and your rights under GDPR.
              </p>
            </div>
          </Link>

          <a
            href="mailto:info@infocreditgroup.com"
            className="group flex items-start gap-4 rounded-xl border bg-card p-5 transition-all hover:border-copper/40 hover:shadow-panel"
          >
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Mail className="size-5" />
            </div>
            <div>
              <h3 className="font-display text-sm font-semibold text-foreground group-hover:text-copper">
                Contact us
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                info@infocreditgroup.com
              </p>
            </div>
          </a>
        </div>
      </div>
    </div>
  );
}
