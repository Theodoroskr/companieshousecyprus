import { createFileRoute } from "@tanstack/react-router";

const TITLE = "Privacy policy — Companies House Cyprus";
const DESCRIPTION =
  "How Companies House Cyprus handles personal data published in the Cyprus company register and information you provide when ordering documents.";

export const Route = createFileRoute("/privacy")({
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
  component: PrivacyPage,
});

const SECTIONS = [
  {
    heading: "1. Data we publish",
    body: "The directory reproduces information that the Cyprus Registrar of Companies publishes in the public register, including company names, registration numbers, registered office addresses and the names and positions of company officials. Publication is based on our legitimate interest in providing transparency of the public register, consistent with the purpose for which the Registrar publishes it.",
  },
  {
    heading: "2. Data you give us",
    body: "When you order a document or contact us we process your name, email address, phone number and any billing or firm details you provide. We use this solely to process and deliver your order, to invoice you, and to answer your enquiry.",
  },
  {
    heading: "3. Accounts",
    body: "Staff accounts used to administer the register store an email address and authentication data. We do not create accounts for members of the public browsing the directory.",
  },
  {
    heading: "4. Retention",
    body: "Order and correspondence records are retained for seven years to meet Cyprus accounting and anti-money-laundering obligations. Register data is retained for as long as it appears in the public register.",
  },
  {
    heading: "5. Sharing",
    body: "We share order details with the Registrar and, where relevant, with translators, notaries or apostille services strictly to fulfil your order. We do not sell personal data and do not use it for advertising.",
  },
  {
    heading: "6. Your rights",
    body: "Under the GDPR you may request access to, correction of, or erasure of personal data we hold about you, object to processing, or request portability. Note that we cannot amend the public register itself — corrections to a company record must be filed with the Registrar, after which our copy is updated.",
  },
  {
    heading: "7. Cookies",
    body: "We use only functional storage — your cart is kept in your browser's local storage, and a session cookie is set if you sign in as staff. No advertising or cross-site tracking cookies are used.",
  },
  {
    heading: "8. Contact",
    body: "For any privacy request, write to privacy@companieshousecyprus.com. You also have the right to lodge a complaint with the Office of the Commissioner for Personal Data Protection of Cyprus.",
  },
];

function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-4xl font-bold">Privacy policy</h1>
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
