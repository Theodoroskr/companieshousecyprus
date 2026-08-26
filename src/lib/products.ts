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
  /** Number of Registrar certificates included — each attracts the certificate service fee. */
  certificateCount?: number;
  /** Portion of the price that is subject to VAT (e.g. the report element inside a bundle). */
  vatablePrice?: number;
};

export const CURRENCY = "EUR";

export function formatPrice(amount: number): string {
  return new Intl.NumberFormat("en-CY", { style: "currency", currency: CURRENCY, minimumFractionDigits: 2 }).format(
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
    price: 40,
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
    price: 40,
    delivery: "1–2 business days",
    category: "certificate",
    description: [
      "A true copy of the certificate issued when the company was entered on the Cyprus register, including any subsequent change-of-name certificates.",
    ],
    includes: [
      { title: "Registered company name", detail: "Current name plus historic names where a change of name certificate exists." },
      { title: "Registration number", detail: "HE / EE / S / P number as recorded by the Registrar." },
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
    price: 40,
    delivery: "1–2 business days",
    category: "certificate",
    description: [
      "Certifies the persons currently registered as directors and secretary of a Cyprus company, as filed with the Registrar.",
    ],
    includes: [
      { title: "Current directors", detail: "Full names of all natural and corporate directors on record." },
      { title: "Company secretary", detail: "Name of the appointed secretary." },
      { title: "Appointment context", detail: "Positions exactly as recorded in the Registrar's officials & owners file." },
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
    price: 40,
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
    price: 40,
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
    slug: "certificate-of-capital",
    name: "Certificate of Capital",
    eyebrow: "Registrar certificate",
    headline: "The company's issued and authorised capital",
    tagline: "Official certification of the share capital structure filed with the Registrar.",
    price: 40,
    delivery: "1–2 business days",
    category: "certificate",
    description: [
      "The Certificate of Capital confirms the authorised and issued share capital of a Cyprus company as recorded in the Registrar's documents, including the number, class and nominal value of shares.",
    ],
    includes: [
      { title: "Authorised capital", detail: "Maximum share capital the company is authorised to issue." },
      { title: "Issued capital", detail: "Number, class and nominal value of shares actually issued." },
      { title: "Capital structure", detail: "Share classes and any special rights as filed." },
      { title: "Digital delivery", detail: "Signed PDF delivered by email." },
    ],
    typicalUse: "Transaction due diligence, capital verification, investor onboarding.",
  },
  {
    slug: "certificate-of-strike-off",
    name: "Certificate of Strike Off",
    eyebrow: "Registrar certificate",
    headline: "Proof of removal from the Cyprus register",
    tagline: "Official confirmation that the company has been struck off and dissolved.",
    price: 40,
    delivery: "1–2 business days",
    category: "certificate",
    description: [
      "The Certificate of Strike Off is issued by the Cyprus Registrar to confirm that a company has been removed from the register and is formally dissolved. It is commonly required to close bank accounts, settle claims or prove cessation of legal existence.",
    ],
    includes: [
      { title: "Strike-off confirmation", detail: "Registrar confirmation of the company's removal from the register." },
      { title: "Dissolution date", detail: "Date the company was formally dissolved, where recorded." },
      { title: "Official source", detail: "Extracted directly from the Registrar's official records." },
      { title: "Digital delivery", detail: "Signed PDF delivered by email." },
    ],
    typicalUse: "Estate administration, claim settlement, account closure verification.",
  },
  {
    slug: "memorandum-and-articles-of-association",
    name: "Memorandum and Articles of Association",
    eyebrow: "Registrar certificate",
    headline: "The company's founding constitutional documents",
    tagline: "Statutory document containing the company name, registered office, share capital, shareholders and governance rules.",
    price: 70,
    delivery: "1–2 business days",
    category: "certificate",
    description: [
      "The Memorandum and Articles of Association is a statutory document for registering a company in Cyprus. It contains information including the company's name and registered office as well as details about share capital such as currency, price per share, names of the shareholders and the amount of shares held as well as internal management and governance of a company.",
    ],
    includes: [
      { title: "Company name and registered office", detail: "Legal name and official address as filed with the Registrar." },
      { title: "Share capital details", detail: "Currency, price per share, authorised and issued capital." },
      { title: "Shareholders", detail: "Names of shareholders and the amount of shares held." },
      { title: "Governance rules", detail: "Internal management, directors' powers and meeting procedures." },
      { title: "Digital delivery", detail: "Certified PDF delivered by email." },
    ],
    typicalUse: "Due diligence, shareholder agreements, corporate restructuring, legal reviews.",
  },

  {
    slug: "sanctions-risk-snapshot",
    name: "Sanctions Risk Snapshot",
    eyebrow: "Screening",
    headline: "Entity screening against official sanctions sources",
    tagline: "We check a Cyprus company's legal name against the official EU, UN, UK and US sanctions lists and give you a timestamped, explainable report.",
    price: 29,
    delivery: "Same day",
    category: "report",
    description: [
      "This product screens a Cyprus company against the official sanctions lists published by the European Union (EU FSF), the United Nations Security Council, the United Kingdom (UKSL) and the United States (OFAC SDN).",
      "We screen the company's current legal name, its previous names and available corporate shareholders (legal entities only). Each source is checked separately and the report shows the result per source, so you can see exactly what was checked, when, and what was found.",
      "Where a candidate appears, the report shows why it was flagged: which attributes match (name, registration number, jurisdiction, LEI) and which do not, with a confidence band and a plain-language rationale — no hidden scores, no black box.",
      "Legal entities only. Directors, individual shareholders and other natural persons are not screened in this version.",
    ],
    includes: [
      { title: "Four official sources", detail: "EU FSF, UN Consolidated, UKSL and OFAC SDN — each checked and reported separately." },
      { title: "Current & previous names", detail: "The company's legal name and previous names, screened as separate runs." },
      { title: "Official identifiers", detail: "Registration number, jurisdiction and LEI used as reliable identifiers where available." },
      { title: "Corporate shareholders", detail: "Screened separately where their legal-entity status is established." },
      { title: "Explainable results", detail: "Matching and conflicting attributes, confidence band and rationale for every candidate." },
      { title: "Timestamped report", detail: "Downloadable document stating sources checked, their versions and the screening time." },
    ],
    typicalUse: "Counterparty onboarding, payment screening files, tender and banking documentation.",
  },
  {
    slug: "cyprus-company-profile",
    name: "Cyprus Company Profile (Structure Report)",
    eyebrow: "Intelligence report",
    headline: "The full registry picture in one document",
    tagline: "Consolidated profile: status, officials & owners, address history and filings.",
    price: 65,
    delivery: "1–2 business days",
    category: "report",
    popular: true,
    description: [
      "A structured profile of a Cyprus company assembled from the Registrar's records: legal identity, current status, directors and secretary, shareholders, registered office and filing history.",
      "Written to be attached directly to a compliance or onboarding file — no interpretation required.",
    ],
    includes: [
      { title: "Legal identity & status", detail: "Name, HE number, type, sub-type, status and status date." },
      { title: "Directors & secretary", detail: "Current officials & owners with positions in English and Greek." },
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
    delivery: "4 days",
    category: "report",
    description: [
      "Combines the registry profile with the company's filed financial statements, sector benchmarks and a structured risk assessment for credit and trade-terms decisions.",
    ],
    includes: [
      { title: "Everything in the Company Profile", detail: "Identity, officials & owners, address and filings." },
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
    price: 185,
    delivery: "1–2 business days",
    category: "pack",
    certificateCount: 3,
    vatablePrice: 65,
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
    certificateCount: 4,
    // Certificates only — no report component, so VAT applies to the service fee alone.
    vatablePrice: 0,
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
  {
    slug: "due-diligence-report",
    name: "Due Diligence Report",
    eyebrow: "Bespoke investigation",
    headline: "A researcher-led investigation for complex cases",
    tagline: "Independently assessed, tailored investigations beyond standard registry reports.",
    price: 750,
    delivery: "Scoped after assessment (typically 5–10 business days)",
    category: "report",
    description: [
      "Due Diligence Reports are assessed independently and are recommended for complex cases that require specialised investigations, procedures or data that is not included in other reports.",
      "Prior to a report, our team assesses your information requirements in order to establish what actions are required as part of your due diligence investigation. A member of our research team will be assigned to perform your Due Diligence investigation and will oversee all required activities and then compile the results into one comprehensive report. The same researcher will then review all investigation results to provide you with a concise analysis of the company and our findings.",
    ],
    includes: [
      {
        title: "Relationship check",
        detail:
          "Screens a Cypriot company for both local and international relationships with other entities. Shareholders and directors can also be screened to retrieve other company interests in Cyprus and abroad.",
      },
      { title: "Historical checks", detail: "Recorded changes, prior names, officers and filings over time." },
      { title: "Global KYC screenings", detail: "Sanctions, PEP and watchlist screening across global sources." },
      { title: "Negative & local language media checks", detail: "Adverse media review including Greek-language sources." },
      { title: "Site check", detail: "Physical verification of the operating or registered premises." },
      { title: "Reputation check", detail: "Market, counterparty and public standing enquiries." },
      { title: "Analyst review", detail: "A concise written analysis of the company and our findings by the assigned researcher." },
    ],
    typicalUse: "High-risk onboarding, litigation support, M&A, complex AML escalations.",
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
