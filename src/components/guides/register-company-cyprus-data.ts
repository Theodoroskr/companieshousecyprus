/** Editorial content for the "How to Register a Company in Cyprus" guide. */

export const SECTIONS = [
  { id: "overview", label: "Cyprus company overview" },
  { id: "who-can-register", label: "Who can register a company?" },
  { id: "entity-types", label: "Types of business entities" },
  { id: "participants", label: "Key company participants" },
  { id: "documents", label: "Information and documents required" },
  { id: "process", label: "Registration process" },
  { id: "costs", label: "Costs and professional fees" },
  { id: "timeline", label: "Expected timeline" },
  { id: "tax-vat", label: "Tax and VAT registration" },
  { id: "beneficial-owner", label: "Beneficial-owner registration" },
  { id: "banking", label: "Bank-account preparation" },
  { id: "post-incorporation", label: "Post-incorporation requirements" },
  { id: "annual-compliance", label: "Annual compliance" },
  { id: "mistakes", label: "Common mistakes" },
  { id: "faq", label: "Frequently asked questions" },
  { id: "introduction", label: "Request a specialist introduction" },
] as const;

export const ENTITY_TYPES = [
  {
    type: "Private company limited by shares",
    use: "Most trading, holding and service companies; the standard vehicle for local and international founders.",
    liability: "Members' liability limited to unpaid amounts on their shares.",
    personality: "Yes",
    compliance: "Moderate to high — statutory records, annual return, accounts and tax filings.",
    suitable: "Founders wanting a distinct legal entity with limited liability and transferable shares.",
  },
  {
    type: "Public company",
    use: "Larger ventures that may offer shares to the public or seek listing.",
    liability: "Limited by shares, with stricter capital and disclosure rules.",
    personality: "Yes",
    compliance: "High — additional capital, membership and disclosure requirements.",
    suitable: "Projects raising capital broadly or preparing for a regulated market.",
  },
  {
    type: "Partnership (general or limited)",
    use: "Professional collaborations and joint ventures between individuals or entities.",
    liability: "General partners are personally liable; limited partners' liability is capped by law.",
    personality: "No separate legal personality in the company-law sense.",
    compliance: "Lower filing burden, but partners carry direct exposure.",
    suitable: "Partners who accept personal exposure in exchange for a simpler structure.",
  },
  {
    type: "Business name",
    use: "A trading name used by an individual, partnership or company.",
    liability: "Rests entirely with the underlying owner — the name is not an entity.",
    personality: "No",
    compliance: "Low — registration and updates of the recorded particulars.",
    suitable: "Sole traders and existing entities trading under a different name.",
  },
  {
    type: "Branch of an overseas company",
    use: "A foreign company establishing a registered presence in Cyprus.",
    liability: "Retained by the overseas parent company.",
    personality: "No — it is an extension of the foreign entity.",
    compliance: "Filing of parent-company documents, accounts and changes; local tax registrations.",
    suitable: "Groups that want a Cyprus presence without a new subsidiary.",
  },
] as const;

export const PARTICIPANTS = [
  {
    title: "Shareholders",
    body: "The legal owners on the register of members. Shares can be held personally or through a corporate shareholder, and shareholdings are recorded with the Registrar.",
  },
  {
    title: "Directors",
    body: "The people appointed to manage the company and comply with its statutory duties. A director is not automatically an owner, and an owner is not automatically a director.",
  },
  {
    title: "Company secretary",
    body: "Responsible for statutory records, filings, minutes and Registrar correspondence. Commonly provided by the corporate service provider.",
  },
  {
    title: "Beneficial owners",
    body: "The natural persons who ultimately own or control the company, identified through the ownership chain. This can differ from the registered shareholder, for example where shares are held by a company or a nominee.",
  },
  {
    title: "Registered office",
    body: "The official address for service of documents and Registrar correspondence. It is not necessarily where the business actually trades — a trading address may be different.",
  },
  {
    title: "Professional advisers",
    body: "Licensed administrative service providers, lawyers, accountants and auditors who prepare documents, handle filings, advise on structure and support ongoing compliance.",
  },
] as const;

export const DOC_CHECKLISTS = [
  {
    title: "For individual shareholders, directors and beneficial owners",
    items: [
      "Passport or national identity document",
      "Proof of residential address",
      "Contact information (email and telephone)",
      "Occupation and professional background",
      "Source-of-funds information where required",
      "Source-of-wealth information where required",
    ],
  },
  {
    title: "For corporate shareholders",
    items: [
      "Certificate of incorporation",
      "Constitutional documents (memorandum and articles or equivalent)",
      "Registered-office certificate or equivalent",
      "Directors and shareholders information",
      "Ownership structure chart",
      "Ultimate beneficial-owner information",
      "Board resolution approving the participation, where required",
      "Recent company documents (for example latest filings or good-standing evidence)",
    ],
  },
  {
    title: "For the proposed Cyprus company",
    items: [
      "Two or three proposed company names, in order of preference",
      "Description of the intended business activities",
      "Countries of operation",
      "Expected customers and suppliers",
      "Ownership percentages per shareholder",
      "Proposed directors and company secretary",
      "Registered-office arrangements",
      "Expected financial activity (volumes, currencies, banking needs)",
    ],
  },
] as const;

export const STEPS = [
  {
    title: "Choose the appropriate legal structure",
    body: "Compare the private limited company with partnerships, business names and branches against your activity, ownership and liability expectations. Take legal and tax advice before deciding.",
  },
  {
    title: "Select and submit a proposed company name",
    body: "Names must be distinctive and acceptable to the Registrar. Sensitive or misleading words may be refused, so submit alternatives and avoid printing materials before approval.",
  },
  {
    title: "Complete KYC and due-diligence checks",
    body: "The service provider verifies identity and address, screens for sanctions and adverse findings, and assesses the proposed activity. Source-of-funds and source-of-wealth information may be requested.",
  },
  {
    title: "Confirm shareholders, directors and secretary",
    body: "Fix the share capital, shareholdings, appointments, registered-office arrangement and beneficial-ownership chain in writing so the documents can be drafted accurately.",
  },
  {
    title: "Prepare constitutional and incorporation documents",
    body: "The memorandum and articles of association and the statutory incorporation forms are drafted, reviewed and signed. Signatures may need certification, and documents in another language may need translation.",
  },
  {
    title: "Submit the incorporation application",
    body: "The application and supporting documents are filed with the Department of Registrar of Companies and Intellectual Property together with the applicable official fees.",
  },
  {
    title: "Receive the registration number and company documents",
    body: "On approval, the company receives its Registrar number (commonly shown with an HE prefix) and the certificate of incorporation, together with the other certificates you request.",
  },
  {
    title: "Register beneficial-owner information where required",
    body: "Beneficial-ownership details are submitted in line with applicable law and kept up to date when the ownership or control chain changes.",
  },
  {
    title: "Complete tax, VAT and employer registrations where applicable",
    body: "Register with the Tax Department, assess whether VAT registration is required for the activity, and complete employer and social-insurance registrations if staff will be engaged.",
  },
  {
    title: "Arrange banking, accounting and ongoing compliance",
    body: "Prepare the banking file, appoint accounting and audit support where required, and calendar the recurring statutory obligations from day one.",
  },
] as const;

export const TIMELINE_STAGES = [
  {
    stage: "Name approval",
    body: "Submitted to the Registrar; alternatives shorten the cycle if the first choice is refused.",
  },
  {
    stage: "KYC and document collection",
    body: "Usually the biggest variable — driven by how quickly complete documents are supplied.",
  },
  {
    stage: "Preparation and signing",
    body: "Drafting the constitutional documents and obtaining signatures, certification or translations.",
  },
  {
    stage: "Registrar processing",
    body: "Review of the filed application; expedited handling may be available at the Registrar's discretion.",
  },
  {
    stage: "Post-incorporation registrations",
    body: "Tax, VAT, employer, social-insurance and beneficial-ownership submissions where applicable.",
  },
  {
    stage: "Bank onboarding",
    body: "Handled independently by each bank or payment institution and often the longest stage.",
  },
] as const;

export const BANK_CHECKLIST = [
  "Incorporation documents and company certificates",
  "Business plan or detailed activity description",
  "Ownership chart down to the beneficial owners",
  "Director and beneficial-owner identification",
  "Source of funds for the initial deposit and operations",
  "Expected transaction volumes, counterparties and currencies",
  "Contracts, invoices or letters of intent where available",
  "Website and other evidence of commercial presence",
  "Tax registration information",
  "Proof of an operating address where required",
] as const;

export const POST_INCORPORATION_DOCS = [
  { label: "Certificate of incorporation", to: "/report/structure" },
  { label: "Certificate of registered office", to: "/pricing" },
  { label: "Certificate of directors and secretary", to: "/pricing" },
  { label: "Certificate of shareholders", to: "/pricing" },
  { label: "Memorandum and articles of association", to: "/pricing" },
  { label: "Certificate of good standing", to: "/pricing" },
  { label: "Certified copies or apostilled documents", to: "/pricing" },
] as const;

export const COMPLIANCE_CHECKLIST = [
  "Maintain accurate statutory records and registers",
  "Notify the Registrar of changes to officers, address, capital or name",
  "Keep beneficial-owner information current",
  "Maintain proper accounting records throughout the year",
  "Submit applicable tax and VAT filings",
  "Prepare financial statements where required, with audit where applicable",
  "File the annual return with the Registrar",
  "Renew registered-office and company-secretarial arrangements",
  "Maintain licences and permits where the activity is regulated",
] as const;

export const MISTAKES = [
  {
    title: "Choosing a structure without tax or legal advice",
    body: "The cheapest structure to set up is not always the right one for the ownership, activity or exit plan.",
  },
  {
    title: "Using an unsuitable company name",
    body: "Names that are too generic, too similar to an existing entity or contain sensitive words are commonly refused.",
  },
  {
    title: "Providing an unclear business-activity description",
    body: "Vague activity descriptions slow down due diligence and are a frequent reason for banking refusals.",
  },
  {
    title: "Incomplete ownership information",
    body: "Missing intermediate holding entities or unclear percentages force repeated information requests.",
  },
  {
    title: "Delayed KYC documents",
    body: "Incorporation cannot progress while identification, address or source-of-funds evidence is outstanding.",
  },
  {
    title: "Confusing shareholders with beneficial owners",
    body: "The registered shareholder and the ultimate natural-person owner are different concepts and are recorded separately.",
  },
  {
    title: "Underestimating banking requirements",
    body: "Registration does not open an account; banks run their own independent onboarding assessment.",
  },
  {
    title: "Missing post-incorporation registrations",
    body: "Tax, VAT, employer and beneficial-ownership submissions have their own deadlines after incorporation.",
  },
  {
    title: "Ignoring ongoing annual obligations",
    body: "Annual returns, accounts and filings continue every year, including for dormant companies.",
  },
  {
    title: "Assuming incorporation provides regulatory authorisation",
    body: "Licensed activities such as financial services need separate authorisation from the competent authority.",
  },
] as const;

export const FAQS = [
  {
    q: "Can a foreigner register a company in Cyprus?",
    a: "In general, non-residents may hold shares in and act as directors of a Cyprus company, subject to identification and verification, sanctions and compliance screening, and an assessment of the proposed activity. Acceptance is never automatic — each service provider and bank applies its own risk assessment.",
  },
  {
    q: "Is a Cyprus-resident director required?",
    a: "Company law does not, by itself, impose a residency test for every company, but residency of the directors is central to where the company is treated as managed and controlled for tax purposes. Discuss the board composition with a qualified Cyprus tax adviser before appointing directors.",
  },
  {
    q: "How long does Cyprus company registration take?",
    a: "The sequence is name approval, due diligence, document signing, Registrar processing and post-incorporation registrations. Duration depends on document readiness, the complexity of the ownership structure, third-party checks and current Registrar processing times, so no completion date can be guaranteed.",
  },
  {
    q: "How much does it cost to register a company in Cyprus?",
    a: "Total cost combines official Registrar fees with professional fees for formation, registered office, company secretarial work, certified documents and ongoing compliance. Official fees should always be confirmed against the Registrar's current published fees; professional fees are available upon quotation.",
  },
  {
    q: "What documents are required?",
    a: "Typically identification and proof of address for individuals, corporate documents and ownership information for corporate shareholders, and details of the proposed company: names, activities, ownership percentages, officers and registered-office arrangements. Exact requirements depend on the provider and the risk profile.",
  },
  {
    q: "Is a company secretary required?",
    a: "A Cyprus company is expected to have a company secretary responsible for statutory records and filings. The role is very often outsourced to the corporate service provider that maintains the company.",
  },
  {
    q: "Does the company need a registered office?",
    a: "Yes — every Cyprus company must have a registered office address in Cyprus for service of documents and Registrar correspondence. It is separate from any trading or operational address.",
  },
  {
    q: "Can I register a Cyprus company remotely?",
    a: "Formation is commonly handled remotely, with documents signed and returned electronically or by courier. Certification, notarisation, apostille or translation may be required, and some banks still request a call or a personal meeting.",
  },
  {
    q: "Does incorporation guarantee a bank account?",
    a: "No. Banks and payment institutions assess each application independently, based on the activity, ownership, expected flows and supporting evidence. A well-prepared banking file improves the outcome but does not guarantee approval.",
  },
  {
    q: "What is an HE registration number?",
    a: "It is the unique registration number the Registrar assigns to a company, commonly written with an HE prefix. Business names, partnerships and overseas companies use other prefixes. You can look up any registered entity by name or number in our free register search.",
  },
  {
    q: "What is the difference between a shareholder and a UBO?",
    a: "A shareholder is the legal owner recorded in the register of members, which can be an individual or a company. A beneficial owner is the natural person who ultimately owns or controls the company through that chain. Both are recorded, but in different places and for different purposes.",
  },
  {
    q: "What happens after the company is incorporated?",
    a: "You receive the registration number and company documents, then complete beneficial-ownership, tax, VAT and employer registrations where applicable, prepare the banking file, and set up accounting and annual compliance for the recurring statutory obligations.",
  },
] as const;
