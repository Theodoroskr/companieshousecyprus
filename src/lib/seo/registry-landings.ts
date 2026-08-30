/**
 * High-intent registry landing pages.
 *
 * One definition per landing page drives the route content AND its head
 * metadata, so title, meta description, H1 and canonical URL are always
 * derived from the same record and can never drift.
 * Guarded by src/lib/__tests__/sitemap-robots.test.ts.
 */

export const SITE_URL = "https://companieshousecyprus.com";

/** URL prefix for the landing pages. */
export const REGISTRY_LANDING_PREFIX = "/registry";

export type RegistryFaq = { question: string; answer: string };

export type RegistrySection = { heading: string; body: string; bullets?: string[] };

export type RegistryLanding = {
  slug: string;
  /** Search term the page targets, used in breadcrumbs and internal links. */
  label: string;
  h1: string;
  title: string;
  description: string;
  intro: string;
  sections: RegistrySection[];
  faqs: RegistryFaq[];
};

export const REGISTRY_LANDINGS: RegistryLanding[] = [
  {
    slug: "cyprus-company-search",
    label: "Cyprus company search",
    h1: "Cyprus Company Search",
    title: "Cyprus Company Search | Free Registrar Lookup",
    description:
      "Search Cyprus companies free by name or registration number. See status, company type, registration date, registered office and officials on record from Registrar of Companies data.",
    intro:
      "Search every company on the Cyprus register by name or registration number. Results come from the Department of Registrar of Companies and Intellectual Property record, with no account and no charge for the search itself.",
    sections: [
      {
        heading: "What a company search returns",
        body: "Each company profile is built from the fields the Registrar publishes. Nothing is inferred or estimated, and empty fields are left out rather than filled with placeholders.",
        bullets: [
          "Registered name in Greek and Latin transliteration",
          "Registration number and organisation type",
          "Registry status and registration date",
          "Registered office address",
          "Directors and secretary on record",
        ],
      },
      {
        heading: "How to search effectively",
        body: "Partial names work — the search matches on fragments, so a distinctive word is often enough. If you already hold the registration number, enter it in full (for example HE123456) to jump straight to the profile.",
      },
      {
        heading: "When you need official documents",
        body: "Search and company profiles are free. Certificates issued by the Registrar, structure reports and credit reports are paid products, delivered digitally once the order is processed.",
      },
    ],
    faqs: [
      {
        question: "Is the Cyprus company search free?",
        answer:
          "Yes. Searching by name or registration number and viewing a company profile is free and requires no account. Only Registrar certificates and reports are paid.",
      },
      {
        question: "Can I search by registration number?",
        answer:
          "Yes. Enter the full registration number, such as HE123456, and the matching company profile is returned directly.",
      },
    ],
  },
  {
    slug: "registrar-of-companies-cyprus",
    label: "Registrar of Companies Cyprus",
    h1: "Registrar of Companies Cyprus",
    title: "Registrar of Companies Cyprus | Search the Register",
    description:
      "Look up Cyprus Registrar of Companies records online: company status, registration number, type, registered office and officials, plus official certificates delivered digitally.",
    intro:
      "The Department of Registrar of Companies and Intellectual Property maintains the official Cyprus company register. This service makes that record searchable, with certificates and reports available to order when you need them in a document.",
    sections: [
      {
        heading: "What the Registrar records",
        body: "The register holds the incorporation and ongoing filing record for every Cyprus company, partnership and business name.",
        bullets: [
          "Company name, registration number and organisation type",
          "Current registry status and the date it was recorded",
          "Registered office address as filed",
          "Directors, secretary and, for business names, owners",
        ],
      },
      {
        heading: "This service and the official Registrar",
        body: "This is a commercial search and document service built on Registrar data. It does not replace the Department and is not operated by it — it adds fast search, structured profiles and digital delivery of official documents.",
      },
    ],
    faqs: [
      {
        question: "Is this the official Registrar of Companies website?",
        answer:
          "No. This is an independent commercial service that makes Registrar of Companies data searchable and delivers official documents digitally.",
      },
      {
        question: "How current is the Registrar data shown here?",
        answer:
          "Company records are refreshed from the Registrar's published data. Each profile shows the fields exactly as they were filed.",
      },
    ],
  },
  {
    slug: "check-company-registration-number-cyprus",
    label: "Check a Cyprus registration number",
    h1: "Check a Cyprus Company Registration Number",
    title: "Check Cyprus Company Registration Number | Free Lookup",
    description:
      "Check any Cyprus company registration number free. Confirm the registered name, organisation type, registry status and registered office behind an HE, EE, S or AE number.",
    intro:
      "Enter a Cyprus registration number to confirm which entity it belongs to, whether it is still on the register, and where it is registered.",
    sections: [
      {
        heading: "Cyprus registration number prefixes",
        body: "The prefix tells you which register the entity sits on.",
        bullets: [
          "HE — limited companies",
          "EE — general and limited partnerships",
          "S — business names",
          "AE — overseas companies registered in Cyprus",
        ],
      },
      {
        heading: "What to verify before you rely on a number",
        body: "Check that the registered name matches the counterparty you are dealing with, that the registry status is current rather than struck off or in liquidation, and that the registered office matches the address you were given.",
      },
    ],
    faqs: [
      {
        question: "What does the HE prefix mean on a Cyprus company number?",
        answer:
          "HE identifies a limited company on the Cyprus register. Other prefixes cover partnerships (EE), business names (S) and overseas companies (AE).",
      },
      {
        question: "Can I check a registration number without an account?",
        answer: "Yes. Registration number lookups and company profiles are free and open.",
      },
    ],
  },
  {
    slug: "cyprus-company-status-check",
    label: "Cyprus company status check",
    h1: "Cyprus Company Status Check",
    title: "Cyprus Company Status Check | Active, Struck Off, Liquidation",
    description:
      "Check whether a Cyprus company is active, dissolved, struck off or in liquidation. Registry status, registration date and registered office from Registrar of Companies data.",
    intro:
      "Confirm the current registry status of any Cyprus company before you contract, invoice or onboard. Status is shown exactly as recorded by the Registrar.",
    sections: [
      {
        heading: "Status values you will see",
        body: "The Registrar records a company's lifecycle stage rather than a credit opinion.",
        bullets: [
          "Active — on the register and not in an insolvency or strike-off process",
          "Strike off — in the process of removal from the register",
          "Liquidation — wound up by court order, members or creditors",
          "Dissolved — removed from the register",
        ],
      },
      {
        heading: "Why status matters for due diligence",
        body: "A struck-off or dissolved counterparty cannot lawfully contract, and a company in liquidation is controlled by a liquidator rather than its directors. Checking status before payment is the cheapest control available.",
      },
    ],
    faqs: [
      {
        question: "Does an active status mean the company is financially healthy?",
        answer:
          "No. Registry status reflects the company's legal standing on the register, not its finances. A credit report covers financial standing.",
      },
      {
        question: "How do I see companies currently in liquidation?",
        answer:
          "The directory groups Cyprus companies by registry signal, including court-ordered and voluntary liquidation.",
      },
    ],
  },
];

export function getRegistryLanding(slug: string): RegistryLanding | undefined {
  return REGISTRY_LANDINGS.find((landing) => landing.slug === slug);
}

export function registryLandingPath(landing: RegistryLanding): string {
  return `${REGISTRY_LANDING_PREFIX}/${landing.slug}`;
}

export function registryLandingCanonical(landing: RegistryLanding): string {
  return `${SITE_URL}${registryLandingPath(landing)}`;
}

type MetaTag =
  | { title: string }
  | { name: string; content: string }
  | { property: string; content: string };

/** Head metadata derived from the landing definition — the single source of truth. */
export function buildRegistryLandingHead(landing: RegistryLanding): {
  meta: MetaTag[];
  links: { rel: string; href: string }[];
  scripts: { type: string; children: string }[];
} {
  const canonical = registryLandingCanonical(landing);
  return {
    meta: [
      { title: landing.title },
      { name: "description", content: landing.description },
      { property: "og:title", content: landing.title },
      { property: "og:description", content: landing.description },
      { property: "og:type", content: "website" },
      { property: "og:url", content: canonical },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: landing.title },
      { name: "twitter:description", content: landing.description },
    ],
    links: [{ rel: "canonical", href: canonical }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
            { "@type": "ListItem", position: 2, name: landing.label, item: canonical },
          ],
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: landing.faqs.map((faq) => ({
            "@type": "Question",
            name: faq.question,
            acceptedAnswer: { "@type": "Answer", text: faq.answer },
          })),
        }),
      },
    ],
  };
}
