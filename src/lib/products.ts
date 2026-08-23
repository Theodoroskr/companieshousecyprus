export type ProductCategory = "certificate" | "report" | "pack";

export type Product = {
  slug: string;
  name: string;
  eyebrow: string;
  headline: string;
  tagline: string;
  price: number;
  delivery: string;
  category: ProductCategory;
  description: string[];
  includes: { title: string; detail: string }[];
  typicalUse: string;
  popular?: boolean;
};

export const CURRENCY = "EUR";

export function formatPrice(amount: number): string {
  return new Intl.NumberFormat("en-CY", { style: "currency", currency: CURRENCY, minimumFractionDigits: 0 }).format(
    amount,
  );
}

export const PRODUCTS: Product[] = [
  {
    slug: "certificate-of-good-standing",
    name: "Certificate of Good Standing",
    eyebrow: "Registrar certificate",
    headline: "Prove a Cyprus company is active and compliant",
    tagline: "Official confirmation that the company exists and is in good standing with the Registrar.",
    price: 45,
    delivery: "1–2 business days",
    category: "certificate",
    popular: true,
    description: [
      "The Certificate of Good Standing is issued by the Cyprus Department of Registrar of Companies and Intellectual Property. It confirms that a company is duly registered, has filed its statutory returns and has not been struck off or placed in liquidation.",
      "Banks, tender authorities and foreign registries routinely request this certificate when onboarding a Cyprus entity.",
    ],
    includes: [
      { title: "Registrar confirmation of existence", detail: "Company name, registration number and date of incorporation as held by the Registrar." },
      { title: "Compliance standing", detail: "Confirmation that annual returns and statutory filings are up to date." },
      { title: "Liquidation and strike-off check", detail: "Confirmation that no strike-off or winding-up procedure is recorded." },
      { title: "Digital delivery", detail: "Signed PDF delivered by email; apostille and certified translation available on request." },
    ],
    typicalUse: "Bank account opening, foreign branch registration, tender submissions.",
  },
  {
    slug: "certificate-of-incorporation",
    name: "Certificate of Incorporation",
    eyebrow: "Registrar certificate",
    headline: "The founding certificate of a Cyprus company",
    tagline: "Official certificate showing name, registration number and date of incorporation.",
    price: 35,
    delivery: "1–2 business days",
    category: "certificate",
    description: [
      "A true copy of the certificate issued when the company was entered on the Cyprus register, including any subsequent change-of-name certificates.",
    ],
    includes: [
      { title: "Registered company name", detail: "Current name plus historic names where a change of name certificate exists." },
      { title: "Registration number", detail: "HE / EE / S number as recorded by the Registrar." },
      { title: "Date of incorporation", detail: "Official date the company was entered on the register." },
      { title: "Digital delivery", detail: "Signed PDF delivered by email." },
    ],
    typicalUse: "Corporate onboarding, notary files, cross-border filings.",
  },
  {
    slug: "certificate-of-directors-and-secretary",
    name: "Certificate of Directors & Secretary",
    eyebrow: "Registrar certificate",
    headline: "Who is legally authorised to act for the company",
    tagline: "Registrar-certified list of the current board and company secretary.",
    price: 35,
    delivery: "1–2 business days",
    category: "certificate",
    description: [
      "Certifies the persons currently registered as directors and secretary of a Cyprus company, as filed with the Registrar.",
    ],
    includes: [
      { title: "Current directors", detail: "Full names of all natural and corporate directors on record." },
      { title: "Company secretary", detail: "Name of the appointed secretary." },
      { title: "Appointment context", detail: "Positions exactly as recorded in the Registrar's officials file." },
      { title: "Digital delivery", detail: "Signed PDF delivered by email." },
    ],
    typicalUse: "Signatory verification, KYB files, power-of-attorney checks.",
  },
  {
    slug: "certificate-of-shareholders",
    name: "Certificate of Shareholders",
    eyebrow: "Registrar certificate",
    headline: "Registered ownership of a Cyprus company",
    tagline: "Certified list of registered members and their shareholdings.",
    price: 35,
    delivery: "1–2 business days",
    category: "certificate",
    description: [
      "Certifies the registered shareholders of a Cyprus company and the number and class of shares held by each, as recorded by the Registrar.",
    ],
    includes: [
      { title: "Registered members", detail: "Names of shareholders of record (nominee arrangements shown as filed)." },
      { title: "Shareholding", detail: "Number and class of shares per member." },
      { title: "Share capital", detail: "Authorised and issued capital as filed." },
      { title: "Digital delivery", detail: "Signed PDF delivered by email." },
    ],
    typicalUse: "UBO analysis, group structure mapping, transaction due diligence.",
  },
  {
    slug: "certificate-of-registered-office",
    name: "Certificate of Registered Office",
    eyebrow: "Registrar certificate",
    headline: "The company's official Cyprus address",
    tagline: "Registrar confirmation of the registered office address on file.",
    price: 30,
    delivery: "1–2 business days",
    category: "certificate",
    description: [
      "Confirms the registered office address of a Cyprus company exactly as held by the Registrar, including street, locality, postcode and district.",
    ],
    includes: [
      { title: "Registered office address", detail: "Street, building, locality, postcode and district." },
      { title: "Effective date", detail: "Date the current address was recorded." },
      { title: "Digital delivery", detail: "Signed PDF delivered by email." },
    ],
    typicalUse: "Service of process, correspondence verification, address confirmation.",
  },
  {
    slug: "cyprus-company-profile",
    name: "Cyprus Company Profile",
    eyebrow: "Intelligence report",
    headline: "The full registry picture in one document",
    tagline: "Consolidated profile: status, officials, ownership, address history and filings.",
    price: 65,
    delivery: "Same business day",
    category: "report",
    popular: true,
    description: [
      "A structured profile of a Cyprus company assembled from the Registrar's records: legal identity, current status, directors and secretary, shareholders, registered office and filing history.",
      "Written to be attached directly to a compliance or onboarding file — no interpretation required.",
    ],
    includes: [
      { title: "Legal identity & status", detail: "Name, HE number, type, sub-type, status and status date." },
      { title: "Directors & secretary", detail: "Current officials with positions in English and Greek." },
      { title: "Shareholders", detail: "Registered members and shareholdings where filed." },
      { title: "Registered office", detail: "Current address plus recorded changes." },
      { title: "Filing history", detail: "Annual return years on record." },
      { title: "Source references", detail: "Every field traced to the Registrar record it came from." },
    ],
    typicalUse: "Supplier onboarding, counterparty checks, internal credit files.",
  },
  {
    slug: "cyprus-credit-report",
    name: "Cyprus Credit Report",
    eyebrow: "Intelligence report",
    headline: "Assess the risk before you extend terms",
    tagline: "Registry profile plus financial indicators, payment behaviour context and a risk view.",
    price: 130,
    delivery: "1 business day",
    category: "report",
    description: [
      "Combines the registry profile with the company's filed financial statements, sector benchmarks and a structured risk assessment for credit and trade-terms decisions.",
    ],
    includes: [
      { title: "Everything in the Company Profile", detail: "Identity, officials, ownership, address and filings." },
      { title: "Financial indicators", detail: "Key figures from the most recent filed financial statements." },
      { title: "Sector context", detail: "Comparison against Cyprus sector norms." },
      { title: "Risk assessment", detail: "Structured scoring with the drivers behind it." },
      { title: "Recommended credit view", detail: "Suggested exposure band for trade terms." },
    ],
    typicalUse: "Credit limits, trade finance, receivables risk.",
  },
  {
    slug: "kyb-due-diligence-pack",
    name: "KYB & Due Diligence Pack",
    eyebrow: "Bundle",
    headline: "A complete onboarding file for a Cyprus counterparty",
    tagline: "Good Standing, Directors, Shareholders and full profile in one branded download.",
    price: 190,
    delivery: "1–2 business days",
    category: "pack",
    description: [
      "Everything a compliance team needs to onboard a Cyprus entity: the three core Registrar certificates plus the consolidated company profile, bundled into a single, indexed PDF.",
    ],
    includes: [
      { title: "Certificate of Good Standing", detail: "Registrar-issued." },
      { title: "Certificate of Directors & Secretary", detail: "Registrar-issued." },
      { title: "Certificate of Shareholders", detail: "Registrar-issued." },
      { title: "Cyprus Company Profile", detail: "Consolidated registry intelligence." },
      { title: "Single indexed PDF", detail: "Bundled and paginated, ready to attach to a KYB file." },
    ],
    typicalUse: "Bank and PSP onboarding, AML files, M&A target screening.",
  },
  {
    slug: "tender-and-bid-pack",
    name: "Tender & Bid Pack",
    eyebrow: "Bundle",
    headline: "Bid documentation assembled in one click",
    tagline: "The certificate set Cyprus public tenders ask for, delivered ready to attach.",
    price: 160,
    delivery: "1–2 business days",
    category: "pack",
    description: [
      "The documentation set most frequently requested in Cyprus public procurement and banking facility applications, issued together so nothing is missing at submission.",
    ],
    includes: [
      { title: "Certificate of Good Standing", detail: "Confirms active, compliant status." },
      { title: "Certificate of Incorporation", detail: "Founding certificate and name history." },
      { title: "Certificate of Directors & Secretary", detail: "Authorised signatories." },
      { title: "Certificate of Registered Office", detail: "Official address confirmation." },
      { title: "Submission-ready bundle", detail: "Indexed PDF plus individual files." },
    ],
    typicalUse: "Government tenders, RFP responses, banking facility applications.",
  },
];

export const PRODUCTS_BY_SLUG: Record<string, Product> = Object.fromEntries(
  PRODUCTS.map((product) => [product.slug, product]),
);

export const CATEGORY_LABEL: Record<ProductCategory, string> = {
  certificate: "Registrar certificates",
  report: "Intelligence reports",
  pack: "Bundles",
};
