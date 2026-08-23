import { createFileRoute } from "@tanstack/react-router";

const TITLE = "Terms of service — Companies House Cyprus";
const DESCRIPTION =
  "The terms governing use of the Companies House Cyprus register directory and orders for Registrar certificates and company reports.";

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
  }),
  component: TermsPage,
});

const SECTIONS = [
  {
    heading: "1. About this service",
    body: "Companies House Cyprus is an independent directory of the Cyprus company register and an ordering service for Registrar-issued documents. We are not affiliated with, nor endorsed by, the Department of Registrar of Companies and Intellectual Property or the Government of the Republic of Cyprus.",
  },
  {
    heading: "2. Use of the directory",
    body: "The public directory is provided free of charge for lawful use. You may not scrape, bulk-download or re-publish the register data at scale, nor use it for unsolicited marketing, profiling of individuals, or any purpose prohibited by Cyprus or EU law.",
  },
  {
    heading: "3. Accuracy of data",
    body: "Register data is reproduced from official registrar exports. Records may lag behind filings made at the Registrar and may contain errors present in the source. The directory is informational; only a Registrar-issued certificate is evidential.",
  },
  {
    heading: "4. Orders and delivery",
    body: "Placing an order submits a request. An order is accepted only when we confirm it in writing. Certificates are typically delivered within one to two business days by email as a signed PDF. Apostille, certified translation and courier delivery are chargeable extras quoted separately.",
  },
  {
    heading: "5. Prices and payment",
    body: "Prices are shown in euro and are exclusive of Cyprus VAT at 19% where applicable. Card payment is not currently enabled on this site; confirmed orders are invoiced and payable before documents are issued.",
  },
  {
    heading: "6. Refunds",
    body: "Because documents are issued by the Registrar on request, orders cannot be cancelled once the certificate has been requested from the Registrar. If a document cannot be issued, any amount paid is refunded in full.",
  },
  {
    heading: "7. Liability",
    body: "To the fullest extent permitted by law, our liability arising from use of the directory or any document supplied is limited to the amount paid for the relevant order. We are not liable for indirect or consequential loss, including decisions taken in reliance on directory data.",
  },
  {
    heading: "8. Governing law",
    body: "These terms are governed by the laws of the Republic of Cyprus, and the courts of Cyprus have exclusive jurisdiction over any dispute.",
  },
];

function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-4xl font-bold">Terms of service</h1>
      <p className="mt-3 text-sm text-muted-foreground">Last updated: January 2026</p>
      <div className="mt-10 space-y-8">
        {SECTIONS.map((section) => (
          <section key={section.heading}>
            <h2 className="font-display text-lg font-semibold">{section.heading}</h2>
            <p className="mt-2 leading-relaxed text-muted-foreground">{section.body}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
