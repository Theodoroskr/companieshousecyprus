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
      "Search Cyprus companies free by name or registration number: status, company type, registration date, registered office and officials from Registrar data.",
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
      "Look up Cyprus Registrar of Companies records: status, registration number, type, registered office and officials, plus certificates delivered digitally.",
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
      "Check any Cyprus company registration number free: registered name, organisation type, registry status and registered office behind an HE, EE, S or AE number.",
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
    title: "Cyprus Company Status Check | Active or Struck Off",
    description:
      "Check whether a Cyprus company is active, dissolved, struck off or in liquidation: registry status, registration date and registered office from Registrar data.",
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
  {
    slug: "cyprus-beneficial-owner-register",
    label: "Cyprus beneficial owner register",
    h1: "Cyprus Beneficial Owner (UBO) Register",
    title: "Cyprus Beneficial Owner Register (UBO) | Access Explained",
    description:
      "How the Cyprus UBO register works: who must file beneficial ownership, who can access it after the 2022 CJEU ruling, and what ownership data you can obtain instead.",
    intro:
      "Cyprus keeps a central register of beneficial owners of companies and other legal entities, maintained by the Department of Registrar of Companies and Intellectual Property. Access is restricted, so this page explains who can see what, and which ownership evidence is available to everyone else.",
    sections: [
      {
        heading: "Who must be registered as a beneficial owner",
        body: "A beneficial owner is the natural person who ultimately owns or controls the entity. Cyprus companies, partnerships and European entities registered in Cyprus must file and keep these details current with the Registrar.",
        bullets: [
          "Natural persons holding more than 25% of shares or voting rights",
          "Persons exercising control through other means",
          "Senior managing officials, where no owner can be identified",
          "Changes must be filed within the deadline set by the Registrar",
        ],
      },
      {
        heading: "Who can access the UBO register",
        body: "Following the Court of Justice of the European Union ruling of 22 November 2022 (joined cases C-37/20 and C-601/20), general public access to EU beneficial ownership registers was invalidated. Cyprus restricted access accordingly: competent authorities and obliged entities carrying out customer due diligence retain access, while general public access is no longer open.",
      },
      {
        heading: "What ownership information you can still obtain",
        body: "Legal ownership filed with the Registrar remains obtainable in document form. A shareholders certificate or a company structure report sets out the registered shareholders and shareholdings, which is what most banks, notaries and counterparties actually ask for.",
        bullets: [
          "Certificate of Shareholders issued by the Registrar",
          "Company structure report showing shareholdings",
          "Directors and secretary certificate for control at board level",
        ],
      },
    ],
    faqs: [
      {
        question: "Is the Cyprus UBO register public?",
        answer:
          "No. Since the CJEU ruling of November 2022, general public access to the Cyprus beneficial ownership register has been withdrawn. Competent authorities and obliged entities performing due diligence retain access.",
      },
      {
        question: "How can I find who owns a Cyprus company?",
        answer:
          "Order a Certificate of Shareholders or a company structure report. Both are produced from Registrar filings and show the registered shareholders and their shareholdings.",
      },
      {
        question: "Is beneficial ownership the same as shareholding?",
        answer:
          "Not always. A shareholder can be a nominee or a corporate entity, while a beneficial owner is the natural person who ultimately owns or controls the company.",
      },
    ],
  },
  {
    slug: "certificate-of-good-standing-cyprus",
    label: "Certificate of good standing Cyprus",
    h1: "Certificate of Good Standing Cyprus",
    title: "Certificate of Good Standing Cyprus | Order Online",
    description:
      "What a Cyprus certificate of good standing proves, when banks and authorities ask for one, how to order it from the Registrar, plus turnaround and apostille.",
    intro:
      "A certificate of good standing is issued by the Cyprus Registrar of Companies and confirms that a company exists, is on the register and has no pending strike-off or dissolution recorded against it at the date of issue.",
    sections: [
      {
        heading: "What the certificate confirms",
        body: "The certificate is a point-in-time statement of legal standing, not a financial opinion.",
        bullets: [
          "The company is registered and remains on the register",
          "It is not in the process of being struck off or dissolved",
          "The registered name and registration number as recorded",
          "The date on which standing is certified",
        ],
      },
      {
        heading: "When you will be asked for one",
        body: "Banks opening corporate accounts, foreign registries accepting a Cyprus parent, tender authorities, payment providers and counterparties in cross-border transactions commonly require a recent certificate — usually issued within the last three to six months.",
      },
      {
        heading: "Ordering, turnaround and apostille",
        body: "Find the company, add the certificate to your basket and pay online. The certified document issued by the Registrar is emailed to you and stored in your account, typically within one to two business days. Where the certificate is used abroad, an apostille can be added so it is accepted under the Hague Convention.",
      },
    ],
    faqs: [
      {
        question: "How long is a Cyprus certificate of good standing valid?",
        answer:
          "There is no statutory expiry. In practice most banks and authorities accept a certificate issued within the last three to six months.",
      },
      {
        question: "Does a certificate of good standing show the directors?",
        answer:
          "No. It confirms legal standing only. Directors and secretary are certified in a separate certificate.",
      },
      {
        question: "Can I get an apostille on the certificate?",
        answer:
          "Yes. An apostille can be added for use abroad under the Hague Convention, and is ordered alongside the certificate.",
      },
    ],
  },
  {
    slug: "cyprus-company-documents",
    label: "Cyprus company documents",
    h1: "Cyprus Company Documents and Certificates",
    title: "Cyprus Company Documents & Certificates | What to Order",
    description:
      "Official Cyprus company documents — incorporation, shareholders, directors, registered office, good standing and charges: what each proves and how to order.",
    intro:
      "Cyprus company documents are issued by the Registrar of Companies. Each certificate proves one specific fact, so choosing the right one avoids a rejected file and a second order.",
    sections: [
      {
        heading: "The certificates the Registrar issues",
        body: "Each document is certified separately and can be ordered on its own.",
        bullets: [
          "Certificate of Incorporation — the company exists and when it was registered",
          "Certificate of Shareholders — registered shareholders and shareholdings",
          "Certificate of Directors and Secretary — the board and secretary on record",
          "Certificate of Registered Office — the official address",
          "Certificate of Good Standing — the company remains on the register",
          "Certificate of No Charges — no registered charges recorded",
        ],
      },
      {
        heading: "Choosing the right document",
        body: "Banks usually ask for incorporation, shareholders, directors and registered office together. Lenders and buyers add a charges search. Foreign registries and tenders usually ask for good standing, often with an apostille.",
      },
      {
        heading: "Delivery and certified copies",
        body: "Documents are issued by the Registrar, delivered digitally and stored in your account. Where a wet-ink or apostilled copy is needed for use abroad, that can be added to the same order.",
      },
    ],
    faqs: [
      {
        question: "Are Cyprus company documents available free?",
        answer:
          "Searching the register and viewing a company profile is free. Certificates carry Registrar fees and are paid products.",
      },
      {
        question: "Which documents do banks ask for most often?",
        answer:
          "Incorporation, shareholders, directors and secretary, and registered office — frequently together with a certificate of good standing.",
      },
      {
        question: "Can documents be issued in English?",
        answer:
          "The Registrar issues certificates in Greek, and certified English versions can be requested where they are required abroad.",
      },
    ],
  },
  {
    slug: "cyprus-company-strike-off",
    label: "Cyprus company strike off",
    h1: "Cyprus Company Strike Off and Restoration",
    title: "Cyprus Company Strike Off and Restoration | Check It",
    description:
      "What strike off means on the Cyprus register, why companies are struck off, how to check whether a company is in strike-off proceedings, and how restoration works.",
    intro:
      "Strike off is the removal of a company from the Cyprus register. It can be voluntary, at the members' request, or initiated by the Registrar where a company appears to be dormant or non-compliant.",
    sections: [
      {
        heading: "Why companies are struck off",
        body: "The Registrar can begin strike-off proceedings where a company no longer appears to be carrying on business or has failed to keep its filings current.",
        bullets: [
          "Annual returns or accounts not filed",
          "Annual levy or Registrar fees unpaid",
          "The company is dormant and the members apply voluntarily",
          "No response to Registrar correspondence",
        ],
      },
      {
        heading: "What strike off means for counterparties",
        body: "A struck-off company ceases to exist as a legal person and cannot contract, invoice or hold assets — assets remaining at dissolution can pass to the Republic. Checking registry status before payment or onboarding is the cheapest control available.",
      },
      {
        heading: "Restoration to the register",
        body: "A dissolved Cyprus company can be restored by court application within the statutory period, generally on the application of a member, creditor or the liquidator, once outstanding filings and fees are brought up to date.",
      },
    ],
    faqs: [
      {
        question: "How do I check whether a Cyprus company has been struck off?",
        answer:
          "Search the company and read its registry status. Strike off, dissolved and liquidation are shown exactly as recorded by the Registrar.",
      },
      {
        question: "Can a struck-off Cyprus company be restored?",
        answer:
          "Yes, by court application within the statutory period, normally after outstanding filings and fees are settled.",
      },
      {
        question: "Is strike off the same as liquidation?",
        answer:
          "No. Liquidation is a formal winding-up process run by a liquidator. Strike off is administrative removal from the register without a full winding up.",
      },
    ],
  },
  {
    slug: "cyprus-annual-return-he32",
    label: "Cyprus annual return (HE32)",
    h1: "Cyprus Annual Return (HE32)",
    title: "Cyprus Annual Return HE32 | Deadlines and Filing Check",
    description:
      "What the Cyprus HE32 annual return contains, when it is due, what happens if it is filed late, and how to check a company's filing position on the register.",
    intro:
      "The HE32 is the annual return every Cyprus company files with the Department of Registrar of Companies and Intellectual Property. It confirms the company's officers, registered office and share capital position as at the return date, and is filed together with the financial statements for the corresponding year.",
    sections: [
      {
        heading: "What the HE32 contains",
        body: "The annual return is a snapshot of the company's constitutional position, not a set of accounts. The financial statements are filed alongside it.",
        bullets: [
          "Registered office address at the return date",
          "Directors and company secretary in office",
          "Issued share capital and the shareholder list",
          "Transfers of shares since the previous return",
        ],
      },
      {
        heading: "When the annual return is due",
        body: "A Cyprus company draws up its annual return as at a date within the calendar year and files it with the Registrar within the statutory period after that date, with the audited financial statements for the preceding year attached. A newly incorporated company's first return follows its first financial period rather than its incorporation date.",
      },
      {
        heading: "What happens if the HE32 is late",
        body: "Late filing attracts Registrar penalties that accrue over time, and a persistent failure to file is one of the grounds on which the Registrar begins strike-off proceedings. A company that has fallen behind is often visible from its registry status before any formal action appears.",
      },
      {
        heading: "Checking a company's filing position",
        body: "Search the company on this site and read its registry status and recorded officials. Where you need the filed record itself — the officers, shareholders and capital as registered — a structure report sets it out in a single document you can download.",
      },
    ],
    faqs: [
      {
        question: "What is the HE32 form in Cyprus?",
        answer:
          "HE32 is the annual return form filed by Cyprus companies with the Registrar of Companies. It records the officers, registered office, share capital and shareholders as at the return date.",
      },
      {
        question: "Does every Cyprus company have to file an annual return?",
        answer:
          "Yes. Every registered company must file an annual return each year, including dormant companies, together with the financial statements for the corresponding period.",
      },
      {
        question: "What is the penalty for filing the HE32 late?",
        answer:
          "The Registrar applies a late filing charge that increases with the delay, and continued non-filing can lead to strike-off proceedings against the company.",
      },
    ],
  },
  {
    slug: "cyprus-company-annual-levy",
    label: "Cyprus company annual levy",
    h1: "Cyprus Company Annual Levy",
    title: "Cyprus Company Annual Levy | Who Pays and What Happens",
    description:
      "Who owes the Cyprus annual company levy, when it is payable, what non-payment means for a company's standing, and how to check a company's registry status.",
    intro:
      "The annual levy is a fixed yearly charge payable by companies registered in Cyprus to keep the company in good standing on the register. It is separate from corporation tax and from the Registrar's filing fees.",
    sections: [
      {
        heading: "Who has to pay",
        body: "The levy applies to companies incorporated under the Cyprus Companies Law. Whether a particular company or group is liable in a given year, and at what amount, depends on the rules in force for that year — a Cyprus accountant or corporate administrator can confirm the current position.",
      },
      {
        heading: "Why non-payment matters",
        body: "Unpaid levies leave a company out of good standing, which is exactly what a certificate of good standing is designed to evidence.",
        bullets: [
          "A certificate of good standing may be refused",
          "Interest and surcharges accrue on the outstanding amount",
          "Persistent non-payment can contribute to strike-off proceedings",
          "Banks and counterparties routinely ask for evidence of standing",
        ],
      },
      {
        heading: "Checking a company before you deal with it",
        body: "Registry status on a company profile shows whether a company is active, in strike off, dissolved or in liquidation. Where a counterparty or bank requires formal proof, a certificate of good standing issued by the Registrar is the document that carries weight.",
      },
    ],
    faqs: [
      {
        question: "What is the Cyprus annual company levy?",
        answer:
          "It is a fixed annual charge payable by companies registered in Cyprus to remain in good standing on the register. It is separate from corporation tax.",
      },
      {
        question: "What happens if the annual levy is not paid?",
        answer:
          "Surcharges accrue, a certificate of good standing may be refused, and prolonged non-payment can contribute to the company being struck off the register.",
      },
      {
        question: "Can I see whether a company has paid its levy?",
        answer:
          "Payment records are not published. What you can check is the company's registry status, and you can order a certificate of good standing, which is only issued for a company in good standing.",
      },
    ],
  },
  {
    slug: "certificate-of-shareholders-cyprus",
    label: "Certificate of shareholders Cyprus",
    h1: "Certificate of Shareholders (Cyprus)",
    title: "Certificate of Shareholders Cyprus | Order Online",
    description:
      "What a Cyprus certificate of shareholders proves, what it contains, when banks and notaries ask for one, and how to order it with apostille for use abroad.",
    intro:
      "A certificate of shareholders is an official Registrar document listing the registered members of a Cyprus company and their shareholdings. Banks, notaries and foreign authorities ask for it when they need documentary proof of who owns a company, rather than a screenshot of a search result.",
    sections: [
      {
        heading: "What the certificate shows",
        body: "The certificate reflects the shareholder register as held by the Registrar on the date of issue.",
        bullets: [
          "Company name and registration number",
          "Each registered shareholder as recorded",
          "Number and class of shares held",
          "Date of issue and Registrar certification",
        ],
      },
      {
        heading: "Registered shareholders and beneficial owners",
        body: "The certificate names the shareholders on the register. Where shares are held through a nominee or a corporate holder, the ultimate individuals are recorded separately in the beneficial owner register, which has restricted access. The two documents answer different questions and are often requested together.",
      },
      {
        heading: "Use abroad and apostille",
        body: "For use outside Cyprus, a certificate normally needs an apostille under the Hague Convention. Apostille is available as an add-on when you order, and adds processing time because the document is certified by the Republic after the Registrar issues it.",
      },
      {
        heading: "How to order",
        body: "Find the company through the search, then order the structure report or the certificate you need. Documents are delivered digitally to your account once issued, with the apostilled original dispatched where that option is selected.",
      },
    ],
    faqs: [
      {
        question: "What is a certificate of shareholders in Cyprus?",
        answer:
          "It is an official document issued by the Registrar of Companies listing a Cyprus company's registered shareholders and their shareholdings as at the date of issue.",
      },
      {
        question: "Does the certificate show the beneficial owners?",
        answer:
          "No. It shows the registered shareholders. Ultimate beneficial owners are held in the separate beneficial owner register, which has restricted access.",
      },
      {
        question: "Can I get an apostille on the certificate?",
        answer:
          "Yes. Apostille certification for use abroad can be added to the order; it is processed after the Registrar issues the certificate and adds to the delivery time.",
      },
    ],
  },
  {
    slug: "cyprus-company-name-approval",
    label: "Cyprus company name approval",
    h1: "Cyprus Company Name Approval",
    title: "Cyprus Company Name Approval | Rules and Name Check",
    description:
      "How Cyprus company name approval works, which names the Registrar refuses, how long approval lasts, and how to check whether a name is already taken.",
    intro:
      "Before a Cyprus company can be incorporated, its proposed name must be approved by the Department of Registrar of Companies and Intellectual Property. Approval is a separate step from incorporation and is the most common cause of delay when setting up.",
    sections: [
      {
        heading: "How approval works",
        body: "You submit the proposed name to the Registrar, which checks it against the existing register and its naming rules and either approves or refuses it. An approved name is reserved for a limited period, within which the incorporation documents must be filed. Submitting two or three alternatives in order of preference is standard practice.",
      },
      {
        heading: "Names the Registrar refuses",
        body: "Refusal usually comes down to one of a small number of grounds.",
        bullets: [
          "Identical or confusingly similar to a name already on the register",
          "Misleading as to the company's activities, size or status",
          "Words implying state, royal or regulatory connection without consent",
          "Regulated terms such as bank, insurance or trustee without a licence",
          "Names considered offensive or contrary to public policy",
        ],
      },
      {
        heading: "Checking a name before you apply",
        body: "Search the register first. If a close match already exists, the Registrar is likely to refuse. Browsing the words that recur most across the register also helps — a name built from very common terms is far more likely to collide than a distinctive one.",
      },
      {
        heading: "After approval",
        body: "Once the name is approved, the incorporation documents are filed within the reservation period. Approval of a name is not a trade mark and does not by itself give rights against a similar brand.",
      },
    ],
    faqs: [
      {
        question: "How long does Cyprus company name approval take?",
        answer:
          "Standard examination normally takes a few working days, and an accelerated examination is available for an additional Registrar fee.",
      },
      {
        question: "How long is an approved name reserved?",
        answer:
          "An approved name is held for a limited period, during which the incorporation documents must be filed. If they are not, the name is released and must be re-applied for.",
      },
      {
        question: "Can I check whether a company name is already taken in Cyprus?",
        answer:
          "Yes. Search the register by name here — if an identical or very similar name is already registered, the Registrar is likely to refuse your application.",
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
