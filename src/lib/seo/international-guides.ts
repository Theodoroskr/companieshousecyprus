/**
 * International company-registry guides.
 *
 * One definition per country page drives the route content AND its head
 * metadata (title, description, canonical, hreflang, JSON-LD), so nothing can
 * drift between the rendered page and what crawlers read.
 *
 * Nothing here claims official status: every page states that the official
 * register is kept by the Cyprus Registrar of Companies and that this site is
 * an independent search and document-ordering service. Foreign registry names
 * are used only to explain the local equivalent.
 */

export const SITE_URL = "https://companieshousecyprus.com";

export const INTERNATIONAL_HUB_PATH = "/international";

export type GuideFaq = { question: string; answer: string };

export type GuideDocument = {
  /** Product slug that already exists on /report/$type. */
  slug: string;
  label: string;
};

export type InternationalGuide = {
  key: string;
  path: string;
  /** hreflang value for this page. */
  hreflang: string;
  /** lang attribute for the localized content. */
  lang: string;
  country: string;
  flag: string;
  /** Registry term people search for in that country. */
  localTerm: string;
  /** One-sentence English explanation, shown on the hub card. */
  hubBlurb: string;

  title: string;
  description: string;
  h1: string;
  hero: string;
  ctaSearch: string;
  ctaOrder: string;
  searchPlaceholder: string;
  searchLabel: string;

  breadcrumb: { home: string; hub: string; current: string };
  hubLinkLabel: string;

  compare: { heading: string; paragraphs: string[] };
  info: { heading: string; body: string; items: string[] };
  docs: {
    heading: string;
    body: string;
    items: GuideDocument[];
    orderLabel: string;
    supportHeading: string;
    supportBody: string;
    supportCta: string;
  };
  useCases: { heading: string; items: string[] };
  legalise: { heading: string; body: string; cta: string };
  faq: { heading: string; items: GuideFaq[] };
  finalCta: { heading: string; body: string; primary: string; secondary: string };
  relatedHeading: string;
  disclaimer: string;
};

const CERTIFICATE_SLUGS = {
  incorporation: "certificate-of-incorporation",
  directors: "certificate-of-directors-and-secretary",
  shareholders: "certificate-of-shareholders",
  office: "certificate-of-registered-office",
  goodStanding: "certificate-of-good-standing",
  memorandum: "memorandum-and-articles-of-association",
  profile: "cyprus-company-profile",
} as const;

export const INTERNATIONAL_GUIDES: InternationalGuide[] = [
  {
    key: "gr",
    path: "/gr/gemi-kyprou",
    hreflang: "el",
    lang: "el",
    country: "Greece",
    flag: "🇬🇷",
    localTerm: "ΓΕΜΗ Κύπρου",
    hubBlurb:
      "Greek users searching for a Cyprus equivalent of ΓΕΜΗ: the register is kept by the Cyprus Registrar of Companies.",
    title: "ΓΕΜΗ Κύπρου – Αναζήτηση Κυπριακών Εταιρειών",
    description:
      "Αναζητάτε το αντίστοιχο του ΓΕΜΗ στην Κύπρο; Βρείτε κυπριακές εταιρείες και παραγγείλετε επίσημα εταιρικά πιστοποιητικά από τον Έφορο Εταιρειών.",
    h1: "ΓΕΜΗ Κύπρου – Αναζήτηση Κυπριακών Εταιρειών",
    hero: "Αναζητάτε το αντίστοιχο του ΓΕΜΗ στην Κύπρο; Στην Κύπρο, το επίσημο μητρώο εταιρειών τηρείται από τον Έφορο Εταιρειών και Διανοητικής Ιδιοκτησίας. Μέσω του CompaniesHouseCyprus.com μπορείτε να αναζητήσετε κυπριακές εταιρείες και να παραγγείλετε επίσημα εταιρικά πιστοποιητικά και έγγραφα.",
    ctaSearch: "Αναζήτηση εταιρείας",
    ctaOrder: "Παραγγελία πιστοποιητικών",
    searchPlaceholder: "Επωνυμία εταιρείας ή αριθμός εγγραφής",
    searchLabel: "Αναζήτηση κυπριακών εταιρειών",
    breadcrumb: { home: "Αρχική", hub: "Διεθνής Οδηγός", current: "ΓΕΜΗ Κύπρου" },
    hubLinkLabel: "Διεθνής οδηγός εταιρικών μητρώων",
    compare: {
      heading: "Ποιο είναι το αντίστοιχο του ΓΕΜΗ στην Κύπρο;",
      paragraphs: [
        "Στην Ελλάδα, τα στοιχεία των επιχειρήσεων καταχωρίζονται στο Γενικό Εμπορικό Μητρώο, γνωστό ως ΓΕΜΗ. Στην Κύπρο, η αντίστοιχη επίσημη αρμόδια αρχή είναι ο Έφορος Εταιρειών και Διανοητικής Ιδιοκτησίας.",
        "Δεν υπάρχει κυπριακή υπηρεσία με την επίσημη ονομασία «ΓΕΜΗ Κύπρου». Ο όρος χρησιμοποιείται συχνά από χρήστες στην Ελλάδα που αναζητούν πληροφορίες για κυπριακές εταιρείες.",
      ],
    },
    info: {
      heading: "Τι μπορείτε να αναζητήσετε;",
      body: "Κάθε προφίλ εταιρείας βασίζεται στα στοιχεία που δημοσιεύει ο Έφορος Εταιρειών. Εμφανίζονται μόνο τα πεδία που υπάρχουν στο μητρώο.",
      items: [
        "Επωνυμία εταιρείας",
        "Αριθμός εγγραφής",
        "Κατάσταση εταιρείας",
        "Ημερομηνία εγγραφής",
        "Εγγεγραμμένο γραφείο",
        "Διαθέσιμα εταιρικά έγγραφα",
      ],
    },
    docs: {
      heading: "Επίσημα πιστοποιητικά κυπριακής εταιρείας",
      body: "Τα παρακάτω έγγραφα εκδίδονται από τον Έφορο Εταιρειών και παραδίδονται ψηφιακά μετά την παραγγελία.",
      items: [
        { slug: CERTIFICATE_SLUGS.incorporation, label: "Πιστοποιητικό Σύστασης" },
        { slug: CERTIFICATE_SLUGS.directors, label: "Πιστοποιητικό Διευθυντών και Γραμματέα" },
        { slug: CERTIFICATE_SLUGS.shareholders, label: "Πιστοποιητικό Μετόχων" },
        { slug: CERTIFICATE_SLUGS.office, label: "Πιστοποιητικό Εγγεγραμμένου Γραφείου" },
        { slug: CERTIFICATE_SLUGS.goodStanding, label: "Πιστοποιητικό Καλής Λειτουργίας" },
        { slug: CERTIFICATE_SLUGS.memorandum, label: "Ιδρυτικό και Καταστατικό" },
        { slug: CERTIFICATE_SLUGS.profile, label: "Εταιρικό προφίλ με επίσημα στοιχεία" },
      ],
      orderLabel: "Παραγγελία",
      supportHeading: "Apostille και πιστοποιημένη μετάφραση",
      supportBody:
        "Η σφραγίδα Apostille και η πιστοποιημένη μετάφραση διατίθενται κατόπιν αιτήματος για τα έγγραφα που παραγγέλνετε. Επικοινωνήστε μαζί μας για να τα προσθέσουμε στην παραγγελία σας.",
      supportCta: "Ζητήστε Apostille ή μετάφραση",
    },
    useCases: {
      heading: "Γιατί μπορεί να χρειαστείτε στοιχεία κυπριακής εταιρείας;",
      items: [
        "Έλεγχος πελάτη ή προμηθευτή",
        "Νομικός ή οικονομικός έλεγχος",
        "Τραπεζική ή κανονιστική διαδικασία",
        "Δικαστική ή συμβατική χρήση",
        "Επιβεβαίωση διευθυντών ή μετόχων",
        "Διασυνοριακή επιχειρηματική συναλλαγή",
        "Προετοιμασία εγγράφων για χρήση στην Ελλάδα",
      ],
    },
    legalise: {
      heading: "Χρήση κυπριακών εγγράφων στην Ελλάδα",
      body: "Ανάλογα με τη χρήση και τον φορέα στον οποίο θα υποβληθούν, τα κυπριακά εταιρικά έγγραφα μπορεί να χρειάζονται πιστοποίηση, Apostille ή επίσημη μετάφραση στα ελληνικά. Πριν από την παραγγελία, επιβεβαιώστε τις απαιτήσεις της αρμόδιας υπηρεσίας, τράπεζας, δικηγόρου ή άλλου αποδέκτη.",
      cta: "Ζητήστε υποστήριξη για πιστοποιητικά",
    },
    faq: {
      heading: "Συχνές ερωτήσεις",
      items: [
        {
          question: "Υπάρχει ΓΕΜΗ στην Κύπρο;",
          answer:
            "Όχι με αυτή την επίσημη ονομασία. Το αντίστοιχο εταιρικό μητρώο στην Κύπρο τηρείται από τον Έφορο Εταιρειών και Διανοητικής Ιδιοκτησίας.",
        },
        {
          question: "Πώς μπορώ να αναζητήσω μια κυπριακή εταιρεία;",
          answer:
            "Μπορείτε να χρησιμοποιήσετε την αναζήτηση του CompaniesHouseCyprus.com εισάγοντας την επωνυμία ή τον αριθμό εγγραφής της εταιρείας.",
        },
        {
          question: "Μπορώ να παραγγείλω επίσημο πιστοποιητικό;",
          answer:
            "Ναι. Επιλέξτε την εταιρεία και στη συνέχεια το διαθέσιμο πιστοποιητικό ή εταιρικό έγγραφο που χρειάζεστε.",
        },
        {
          question: "Μπορούν τα κυπριακά πιστοποιητικά να χρησιμοποιηθούν στην Ελλάδα;",
          answer:
            "Αυτό εξαρτάται από τον σκοπό και τον φορέα που θα τα παραλάβει. Ενδέχεται να απαιτείται Apostille και επίσημη μετάφραση.",
        },
        {
          question: "Μπορώ να αναζητήσω εταιρεία με τον αριθμό εγγραφής;",
          answer:
            "Ναι. Η αναζήτηση υποστηρίζει τον κυπριακό αριθμό εγγραφής, για παράδειγμα HE123456.",
        },
        {
          question: "Είναι το CompaniesHouseCyprus.com κυβερνητική υπηρεσία;",
          answer:
            "Όχι. Το CompaniesHouseCyprus.com είναι ανεξάρτητη πλατφόρμα αναζήτησης εταιρειών και παραγγελίας εγγράφων. Το επίσημο μητρώο τηρείται από τον Έφορο Εταιρειών της Κυπριακής Δημοκρατίας.",
        },
      ],
    },
    finalCta: {
      heading: "Αναζητήστε μια κυπριακή εταιρεία",
      body: "Βρείτε την εταιρεία που σας ενδιαφέρει και δείτε τα διαθέσιμα στοιχεία, πιστοποιητικά και εταιρικά έγγραφα.",
      primary: "Αναζήτηση τώρα",
      secondary: "Παραγγελία πιστοποιητικού",
    },
    relatedHeading: "Οδηγοί για άλλες χώρες",
    disclaimer:
      "Το CompaniesHouseCyprus.com είναι ανεξάρτητη υπηρεσία πληροφόρησης και παραγγελίας εγγράφων. Δεν είναι ο επίσημος ιστότοπος του Εφόρου Εταιρειών της Κύπρου και δεν συνδέεται ούτε υποστηρίζεται από οποιαδήποτε κρατική αρχή.",
  },
  {
    key: "uk",
    path: "/uk/cyprus-companies-house",
    hreflang: "en-GB",
    lang: "en",
    country: "United Kingdom",
    flag: "🇬🇧",
    localTerm: "Cyprus Companies House",
    hubBlurb:
      "UK users know the register as Companies House; in Cyprus the equivalent record is kept by the Registrar of Companies.",
    title: "Cyprus Companies House – Search Cyprus Companies",
    description:
      "The Cyprus equivalent of Companies House. Search Cyprus companies by name or registration number and order official Registrar certificates and documents.",
    h1: "Cyprus Companies House – Search Cyprus Companies",
    hero: "\u201CCompanies House\u201D is the familiar UK term for the corporate register. In Cyprus, the official register is maintained by the Registrar of Companies and Intellectual Property. CompaniesHouseCyprus.com lets you search registered Cyprus entities and order official company certificates and documents.",
    ctaSearch: "Search companies",
    ctaOrder: "Order certificates",
    searchPlaceholder: "Search by company name or registration number",
    searchLabel: "Search Cyprus companies",
    breadcrumb: { home: "Home", hub: "International", current: "Cyprus Companies House" },
    hubLinkLabel: "International company registry guide",
    compare: {
      heading: "What is the Cyprus equivalent of Companies House?",
      paragraphs: [
        "In the United Kingdom, company records are filed with Companies House, an executive agency of the Department for Business and Trade. Cyprus has no body using that name: the equivalent authority is the Department of Registrar of Companies and Intellectual Property.",
        "The practical difference matters when you request documents. A UK certified certificate has no Cyprus counterpart with the same title, but the Cyprus Registrar issues its own certificates covering incorporation, directors and secretary, shareholders, registered office and good standing.",
      ],
    },
    info: {
      heading: "What you can look up",
      body: "Every profile is built from fields published by the Cyprus Registrar. Nothing is estimated, and fields that were never filed are left out.",
      items: [
        "Registered company name",
        "Registration number, such as HE123456",
        "Registry status and organisation type",
        "Registration date",
        "Registered office address",
        "Directors and secretary on record",
      ],
    },
    docs: {
      heading: "Official Cyprus company certificates",
      body: "These documents are issued by the Cyprus Registrar and delivered digitally once your order is processed.",
      items: [
        { slug: CERTIFICATE_SLUGS.incorporation, label: "Certificate of Incorporation" },
        { slug: CERTIFICATE_SLUGS.directors, label: "Certificate of Directors and Secretary" },
        { slug: CERTIFICATE_SLUGS.shareholders, label: "Certificate of Shareholders" },
        { slug: CERTIFICATE_SLUGS.office, label: "Certificate of Registered Office" },
        { slug: CERTIFICATE_SLUGS.goodStanding, label: "Certificate of Good Standing" },
        { slug: CERTIFICATE_SLUGS.memorandum, label: "Memorandum and Articles of Association" },
        { slug: CERTIFICATE_SLUGS.profile, label: "Cyprus company profile report" },
      ],
      orderLabel: "Order",
      supportHeading: "Apostille and certified translation",
      supportBody:
        "Apostille legalisation and certified translation are available on request for the documents you order. Ask us to add them before the order is dispatched.",
      supportCta: "Request apostille or translation",
    },
    useCases: {
      heading: "Why UK businesses request Cyprus company records",
      items: [
        "Onboarding a Cyprus customer or supplier",
        "KYB and anti-money-laundering checks",
        "Legal, tax or audit review",
        "Bank account opening and regulatory filings",
        "Litigation, contracts and enforcement",
        "Confirming directors, secretary or shareholders",
        "Preparing Cyprus documents for use in the UK",
      ],
    },
    legalise: {
      heading: "Using Cyprus documents in the United Kingdom",
      body: "Depending on the recipient, Cyprus corporate documents may need certification, an apostille under the Hague Convention, or a certified English translation. Confirm the requirements with the bank, court, solicitor or authority receiving the document before you order.",
      cta: "Ask about certificate support",
    },
    faq: {
      heading: "Frequently asked questions",
      items: [
        {
          question: "Is there a Companies House in Cyprus?",
          answer:
            "Not under that name. The Cyprus register is maintained by the Department of Registrar of Companies and Intellectual Property.",
        },
        {
          question: "How do I search a Cyprus company from the UK?",
          answer:
            "Enter the company name or its Cyprus registration number in the search on this page. Searching and viewing profiles is free.",
        },
        {
          question: "Can I order an official Cyprus certificate?",
          answer:
            "Yes. Choose the company, then the certificate or corporate document you need. Documents are issued by the Registrar and delivered digitally.",
        },
        {
          question: "Will a Cyprus certificate be accepted in the UK?",
          answer:
            "That depends on the recipient. Many UK banks and courts ask for an apostille and, occasionally, a certified translation.",
        },
        {
          question: "Is CompaniesHouseCyprus.com a government service?",
          answer:
            "No. It is an independent company-search and document-ordering platform. The official register is maintained by the Cyprus Registrar of Companies.",
        },
      ],
    },
    finalCta: {
      heading: "Search a Cyprus company",
      body: "Find the company you need and see the available registry information, certificates and corporate documents.",
      primary: "Search now",
      secondary: "Order a certificate",
    },
    relatedHeading: "Guides for other countries",
    disclaimer:
      "CompaniesHouseCyprus.com is an independent information and document-ordering service. It is not the official website of the Cyprus Registrar of Companies and is not affiliated with or endorsed by any government authority.",
  },
  {
    key: "de",
    path: "/de/handelsregister-zypern",
    hreflang: "de",
    lang: "de",
    country: "Germany",
    flag: "🇩🇪",
    localTerm: "Handelsregister Zypern",
    hubBlurb:
      "German users look for a Handelsregister; in Cyprus the register is kept by the Registrar of Companies.",
    title: "Handelsregister Zypern – Zypriotische Firmen suchen",
    description:
      "Handelsregister Zypern: zypriotische Firmen nach Name oder Registernummer suchen und offizielle Firmendokumente sowie Handelsregisterauszüge bestellen.",
    h1: "Handelsregister Zypern – Zypriotische Firmen suchen",
    hero: "Sie suchen das Handelsregister für Zypern? Das offizielle Unternehmensregister Zyperns wird vom Registrar of Companies and Intellectual Property geführt. Über CompaniesHouseCyprus.com können Sie eingetragene zypriotische Firmen suchen und offizielle Firmendokumente bestellen.",
    ctaSearch: "Firma suchen",
    ctaOrder: "Dokumente bestellen",
    searchPlaceholder: "Firmenname oder Registernummer suchen",
    searchLabel: "Zypriotische Firmen suchen",
    breadcrumb: { home: "Startseite", hub: "International", current: "Handelsregister Zypern" },
    hubLinkLabel: "Internationaler Registerleitfaden",
    compare: {
      heading: "Was entspricht dem Handelsregister in Zypern?",
      paragraphs: [
        "In Deutschland werden Unternehmensdaten beim Handelsregister der Amtsgerichte geführt und über das gemeinsame Registerportal veröffentlicht. In Zypern übernimmt diese Aufgabe eine einzige zentrale Behörde: der Registrar of Companies and Intellectual Property.",
        "Einen Handelsregisterauszug im deutschen Format gibt es in Zypern nicht. Stattdessen stellt der zypriotische Registrar eigene Bescheinigungen aus, etwa zur Eintragung, zu Direktoren und Sekretär, zu Gesellschaftern und zum eingetragenen Sitz.",
      ],
    },
    info: {
      heading: "Welche Angaben Sie abrufen können",
      body: "Jedes Firmenprofil basiert auf den vom zypriotischen Registrar veröffentlichten Feldern. Nicht eingetragene Angaben werden nicht ergänzt.",
      items: [
        "Eingetragener Firmenname",
        "Registernummer, zum Beispiel HE123456",
        "Registerstatus und Rechtsform",
        "Datum der Eintragung",
        "Eingetragener Geschäftssitz",
        "Direktoren und Sekretär laut Register",
      ],
    },
    docs: {
      heading: "Offizielle Firmendokumente aus Zypern",
      body: "Diese Dokumente werden vom zypriotischen Registrar ausgestellt und nach Bearbeitung digital zugestellt.",
      items: [
        { slug: CERTIFICATE_SLUGS.incorporation, label: "Gründungsbescheinigung" },
        { slug: CERTIFICATE_SLUGS.directors, label: "Bescheinigung über Direktoren und Sekretär" },
        { slug: CERTIFICATE_SLUGS.shareholders, label: "Gesellschafterbescheinigung" },
        { slug: CERTIFICATE_SLUGS.office, label: "Bescheinigung über den eingetragenen Sitz" },
        { slug: CERTIFICATE_SLUGS.goodStanding, label: "Bescheinigung über den guten Bestand" },
        { slug: CERTIFICATE_SLUGS.memorandum, label: "Gesellschaftsvertrag und Satzung" },
        { slug: CERTIFICATE_SLUGS.profile, label: "Firmenprofil Zypern" },
      ],
      orderLabel: "Bestellen",
      supportHeading: "Apostille und beglaubigte Übersetzung",
      supportBody:
        "Apostille und beglaubigte Übersetzung sind für bestellte Dokumente auf Anfrage möglich. Teilen Sie uns Ihren Bedarf vor Versand der Bestellung mit.",
      supportCta: "Apostille oder Übersetzung anfragen",
    },
    useCases: {
      heading: "Wann Sie zypriotische Firmendokumente benötigen",
      items: [
        "Prüfung von Kunden oder Lieferanten",
        "KYB- und Geldwäscheprüfungen",
        "Rechtliche, steuerliche oder Prüfungszwecke",
        "Kontoeröffnung und aufsichtsrechtliche Verfahren",
        "Gerichts- und Vertragsunterlagen",
        "Bestätigung von Direktoren oder Gesellschaftern",
        "Vorbereitung von Unterlagen zur Verwendung in Deutschland",
      ],
    },
    legalise: {
      heading: "Verwendung zypriotischer Dokumente in Deutschland",
      body: "Je nach Verwendungszweck und Empfänger können zypriotische Firmendokumente eine Beglaubigung, eine Apostille oder eine beglaubigte Übersetzung ins Deutsche erfordern. Klären Sie die Anforderungen vor der Bestellung mit Behörde, Bank, Notar oder Anwalt.",
      cta: "Unterstützung anfragen",
    },
    faq: {
      heading: "Häufige Fragen",
      items: [
        {
          question: "Gibt es in Zypern ein Handelsregister?",
          answer:
            "Nicht unter diesem Namen. Das zypriotische Unternehmensregister wird vom Registrar of Companies and Intellectual Property geführt.",
        },
        {
          question: "Wie suche ich eine Firma in Zypern?",
          answer:
            "Geben Sie den Firmennamen oder die zypriotische Registernummer in die Suche auf dieser Seite ein. Suche und Firmenprofile sind kostenlos.",
        },
        {
          question: "Kann ich einen Handelsregisterauszug für Zypern bestellen?",
          answer:
            "Ein Auszug im deutschen Format existiert nicht. Sie können jedoch die offiziellen zypriotischen Bescheinigungen bestellen, die dieselben Angaben belegen.",
        },
        {
          question: "Wird ein zypriotisches Dokument in Deutschland anerkannt?",
          answer:
            "Das hängt vom Empfänger ab. Häufig werden eine Apostille und eine beglaubigte Übersetzung verlangt.",
        },
        {
          question: "Ist CompaniesHouseCyprus.com eine Behörde?",
          answer:
            "Nein. Es handelt sich um einen unabhängigen Such- und Dokumentenbestelldienst. Das offizielle Register führt der zypriotische Registrar of Companies.",
        },
      ],
    },
    finalCta: {
      heading: "Zypriotische Firma suchen",
      body: "Finden Sie das Unternehmen und sehen Sie verfügbare Registerangaben, Bescheinigungen und Firmendokumente.",
      primary: "Jetzt suchen",
      secondary: "Dokument bestellen",
    },
    relatedHeading: "Leitfäden für andere Länder",
    disclaimer:
      "CompaniesHouseCyprus.com ist ein unabhängiger Informations- und Dokumentenbestelldienst. Es ist nicht die offizielle Website des zypriotischen Registrar of Companies und steht in keiner Verbindung zu einer Behörde.",
  },
  {
    key: "fr",
    path: "/fr/registre-commerce-chypre",
    hreflang: "fr",
    lang: "fr",
    country: "France",
    flag: "🇫🇷",
    localTerm: "Registre du commerce / Kbis Chypre",
    hubBlurb:
      "French users search for a Kbis; Cyprus issues its own Registrar certificates instead.",
    title: "Registre du commerce Chypre – Société chypriote",
    description:
      "Registre du commerce à Chypre : rechercher une société chypriote par nom ou numéro et commander les documents officiels équivalents à un extrait Kbis.",
    h1: "Registre du commerce à Chypre – Rechercher une société chypriote",
    hero: "Vous cherchez le registre du commerce chypriote ? À Chypre, le registre officiel des sociétés est tenu par le Registrar of Companies and Intellectual Property. CompaniesHouseCyprus.com vous permet de rechercher les sociétés chypriotes enregistrées et de commander des documents officiels de société.",
    ctaSearch: "Rechercher une société",
    ctaOrder: "Commander des documents",
    searchPlaceholder: "Nom de la société ou numéro d'immatriculation",
    searchLabel: "Rechercher des sociétés chypriotes",
    breadcrumb: { home: "Accueil", hub: "International", current: "Registre du commerce Chypre" },
    hubLinkLabel: "Guide international des registres",
    compare: {
      heading: "L'équivalent chypriote du registre du commerce et du Kbis",
      paragraphs: [
        "En France, les informations légales des sociétés figurent au registre du commerce et des sociétés, et l'extrait Kbis en constitue la carte d'identité officielle. À Chypre, l'autorité équivalente est le Registrar of Companies and Intellectual Property.",
        "Chypre ne délivre pas d'extrait Kbis : ce document est propre au droit français. Le registre chypriote délivre en revanche ses propres certificats officiels — constitution, dirigeants et secrétaire, actionnaires, siège social et bonne situation — qui couvrent les mêmes informations.",
      ],
    },
    info: {
      heading: "Informations disponibles",
      body: "Chaque fiche société reprend les champs publiés par le registre chypriote. Aucune donnée n'est estimée ou reconstituée.",
      items: [
        "Dénomination sociale enregistrée",
        "Numéro d'immatriculation, par exemple HE123456",
        "Statut au registre et forme juridique",
        "Date d'immatriculation",
        "Siège social enregistré",
        "Dirigeants et secrétaire inscrits",
      ],
    },
    docs: {
      heading: "Documents officiels de société chypriote",
      body: "Ces documents sont délivrés par le registre chypriote et transmis au format numérique après traitement de la commande.",
      items: [
        { slug: CERTIFICATE_SLUGS.incorporation, label: "Certificat de constitution" },
        { slug: CERTIFICATE_SLUGS.directors, label: "Certificat des dirigeants et du secrétaire" },
        { slug: CERTIFICATE_SLUGS.shareholders, label: "Certificat des actionnaires" },
        { slug: CERTIFICATE_SLUGS.office, label: "Certificat de siège social" },
        { slug: CERTIFICATE_SLUGS.goodStanding, label: "Certificat de bonne situation" },
        { slug: CERTIFICATE_SLUGS.memorandum, label: "Statuts de la société" },
        { slug: CERTIFICATE_SLUGS.profile, label: "Rapport de profil de société chypriote" },
      ],
      orderLabel: "Commander",
      supportHeading: "Apostille et traduction certifiée",
      supportBody:
        "L'apostille et la traduction certifiée sont disponibles sur demande pour les documents commandés. Signalez-nous votre besoin avant l'envoi de la commande.",
      supportCta: "Demander une apostille ou une traduction",
    },
    useCases: {
      heading: "Pourquoi demander des informations sur une société chypriote",
      items: [
        "Vérification d'un client ou d'un fournisseur",
        "Contrôles KYB et lutte anti-blanchiment",
        "Audit juridique, fiscal ou comptable",
        "Ouverture de compte bancaire et démarches réglementaires",
        "Procédures judiciaires et contractuelles",
        "Confirmation des dirigeants ou des actionnaires",
        "Préparation de documents destinés à la France",
      ],
    },
    legalise: {
      heading: "Utiliser des documents chypriotes en France",
      body: "Selon l'usage et l'organisme destinataire, les documents de société chypriotes peuvent nécessiter une certification, une apostille ou une traduction assermentée en français. Vérifiez les exigences auprès de l'administration, de la banque, du notaire ou de l'avocat concerné avant de commander.",
      cta: "Demander un accompagnement",
    },
    faq: {
      heading: "Questions fréquentes",
      items: [
        {
          question: "Existe-t-il un Kbis à Chypre ?",
          answer:
            "Non. Le Kbis est un document français. Le registre chypriote délivre ses propres certificats officiels couvrant les mêmes informations.",
        },
        {
          question: "Comment rechercher une société chypriote ?",
          answer:
            "Saisissez la dénomination ou le numéro d'immatriculation chypriote dans la recherche de cette page. La recherche est gratuite.",
        },
        {
          question: "Puis-je commander un document officiel ?",
          answer:
            "Oui. Sélectionnez la société, puis le certificat ou le document de société souhaité.",
        },
        {
          question: "Ces documents sont-ils acceptés en France ?",
          answer:
            "Cela dépend du destinataire. Une apostille et une traduction assermentée sont souvent demandées.",
        },
        {
          question: "CompaniesHouseCyprus.com est-il un service public ?",
          answer:
            "Non. C'est une plateforme indépendante de recherche et de commande de documents. Le registre officiel est tenu par le Registrar of Companies chypriote.",
        },
      ],
    },
    finalCta: {
      heading: "Rechercher une société chypriote",
      body: "Trouvez la société concernée et consultez les informations, certificats et documents disponibles.",
      primary: "Rechercher maintenant",
      secondary: "Commander un certificat",
    },
    relatedHeading: "Guides pour d'autres pays",
    disclaimer:
      "CompaniesHouseCyprus.com est un service indépendant d'information et de commande de documents. Ce n'est pas le site officiel du Registrar of Companies de Chypre et il n'est ni affilié ni approuvé par une autorité publique.",
  },
  {
    key: "it",
    path: "/it/registro-imprese-cipro",
    hreflang: "it",
    lang: "it",
    country: "Italy",
    flag: "🇮🇹",
    localTerm: "Registro Imprese Cipro",
    hubBlurb:
      "Italian users look for a visura camerale; Cyprus issues Registrar certificates instead.",
    title: "Registro Imprese Cipro – Ricerca società cipriote",
    description:
      "Registro imprese a Cipro: ricerca società cipriote per nome o numero di registrazione e richiedi certificati societari ufficiali equivalenti alla visura.",
    h1: "Registro Imprese Cipro – Ricerca società cipriote",
    hero: "Cerchi il registro imprese di Cipro? A Cipro il registro societario ufficiale è tenuto dal Registrar of Companies and Intellectual Property. Con CompaniesHouseCyprus.com puoi cercare società cipriote registrate e richiedere certificati e documenti societari ufficiali.",
    ctaSearch: "Cerca società",
    ctaOrder: "Richiedi certificati",
    searchPlaceholder: "Denominazione o numero di registrazione",
    searchLabel: "Cerca società cipriote",
    breadcrumb: { home: "Home", hub: "Internazionale", current: "Registro Imprese Cipro" },
    hubLinkLabel: "Guida internazionale ai registri",
    compare: {
      heading: "Qual è l'equivalente del Registro Imprese a Cipro?",
      paragraphs: [
        "In Italia i dati societari sono depositati presso il Registro Imprese tenuto dalle Camere di Commercio, e la visura camerale ne è l'estratto tipico. A Cipro l'autorità corrispondente è un unico ente centrale, il Registrar of Companies and Intellectual Property.",
        "Cipro non rilascia una visura camerale in formato italiano. Il registro cipriota emette però i propri certificati ufficiali su costituzione, amministratori e segretario, azionisti, sede legale e regolarità, che documentano le stesse informazioni.",
      ],
    },
    info: {
      heading: "Quali informazioni puoi consultare",
      body: "Ogni scheda società riporta i campi pubblicati dal registro cipriota. I dati non depositati non vengono integrati.",
      items: [
        "Denominazione registrata",
        "Numero di registrazione, ad esempio HE123456",
        "Stato nel registro e forma giuridica",
        "Data di registrazione",
        "Sede legale registrata",
        "Amministratori e segretario risultanti",
      ],
    },
    docs: {
      heading: "Certificati societari ufficiali di Cipro",
      body: "I documenti sono emessi dal registro cipriota e consegnati in formato digitale al termine della lavorazione dell'ordine.",
      items: [
        { slug: CERTIFICATE_SLUGS.incorporation, label: "Certificato di costituzione" },
        { slug: CERTIFICATE_SLUGS.directors, label: "Certificato di amministratori e segretario" },
        { slug: CERTIFICATE_SLUGS.shareholders, label: "Certificato degli azionisti" },
        { slug: CERTIFICATE_SLUGS.office, label: "Certificato di sede legale" },
        { slug: CERTIFICATE_SLUGS.goodStanding, label: "Certificato di regolarità (good standing)" },
        { slug: CERTIFICATE_SLUGS.memorandum, label: "Atto costitutivo e statuto" },
        { slug: CERTIFICATE_SLUGS.profile, label: "Report profilo società cipriota" },
      ],
      orderLabel: "Richiedi",
      supportHeading: "Apostille e traduzione certificata",
      supportBody:
        "Apostille e traduzione certificata sono disponibili su richiesta per i documenti ordinati. Segnalaci l'esigenza prima dell'invio dell'ordine.",
      supportCta: "Richiedi apostille o traduzione",
    },
    useCases: {
      heading: "Quando servono i dati di una società cipriota",
      items: [
        "Verifica di clienti o fornitori",
        "Controlli KYB e antiriciclaggio",
        "Due diligence legale, fiscale o contabile",
        "Apertura di conti bancari e adempimenti regolamentari",
        "Contenzioso e rapporti contrattuali",
        "Conferma di amministratori o azionisti",
        "Preparazione di documenti da usare in Italia",
      ],
    },
    legalise: {
      heading: "Usare documenti ciprioti in Italia",
      body: "A seconda dell'uso e dell'ente destinatario, i documenti societari ciprioti possono richiedere certificazione, apostille o traduzione giurata in italiano. Verifica i requisiti con l'ufficio, la banca, il notaio o l'avvocato destinatario prima di ordinare.",
      cta: "Chiedi assistenza sui certificati",
    },
    faq: {
      heading: "Domande frequenti",
      items: [
        {
          question: "Esiste la visura camerale a Cipro?",
          answer:
            "No. La visura è un documento italiano. Il registro cipriota rilascia certificati ufficiali che coprono le stesse informazioni.",
        },
        {
          question: "Come cerco una società cipriota?",
          answer:
            "Inserisci la denominazione o il numero di registrazione cipriota nella ricerca di questa pagina. La ricerca è gratuita.",
        },
        {
          question: "Posso ordinare un certificato ufficiale?",
          answer: "Sì. Seleziona la società e poi il certificato o il documento societario necessario.",
        },
        {
          question: "I certificati ciprioti sono validi in Italia?",
          answer:
            "Dipende dal destinatario. Spesso sono richieste apostille e traduzione giurata.",
        },
        {
          question: "CompaniesHouseCyprus.com è un ente pubblico?",
          answer:
            "No. È una piattaforma indipendente di ricerca e ordine documenti. Il registro ufficiale è tenuto dal Registrar of Companies di Cipro.",
        },
      ],
    },
    finalCta: {
      heading: "Cerca una società cipriota",
      body: "Trova la società di interesse e consulta informazioni, certificati e documenti disponibili.",
      primary: "Cerca ora",
      secondary: "Ordina un certificato",
    },
    relatedHeading: "Guide per altri paesi",
    disclaimer:
      "CompaniesHouseCyprus.com è un servizio indipendente di informazione e ordine di documenti. Non è il sito ufficiale del Registrar of Companies di Cipro e non è affiliato né approvato da alcuna autorità pubblica.",
  },
  {
    key: "ro",
    path: "/ro/registrul-comertului-cipru",
    hreflang: "ro",
    lang: "ro",
    country: "Romania",
    flag: "🇷🇴",
    localTerm: "Registrul Comerțului Cipru",
    hubBlurb:
      "Romanian users search for the registrul comerțului; Cyprus keeps a single central register.",
    title: "Registrul Comerțului Cipru – Căutare firme cipriote",
    description:
      "Registrul comerțului din Cipru: caută companii cipriote după nume sau număr de înregistrare și comandă certificate oficiale ale firmei cipriote.",
    h1: "Registrul Comerțului din Cipru – Căutare companii cipriote",
    hero: "Căutați registrul comerțului din Cipru? Registrul oficial al societăților este ținut de Registrar of Companies and Intellectual Property. Prin CompaniesHouseCyprus.com puteți căuta companii cipriote înregistrate și puteți comanda certificate și documente oficiale ale firmei.",
    ctaSearch: "Caută firmă",
    ctaOrder: "Comandă certificate",
    searchPlaceholder: "Denumirea firmei sau numărul de înregistrare",
    searchLabel: "Caută companii cipriote",
    breadcrumb: { home: "Acasă", hub: "Internațional", current: "Registrul Comerțului Cipru" },
    hubLinkLabel: "Ghid internațional al registrelor",
    compare: {
      heading: "Care este echivalentul Registrului Comerțului în Cipru?",
      paragraphs: [
        "În România, datele firmelor sunt înregistrate la Oficiul Național al Registrului Comerțului. În Cipru, autoritatea echivalentă este Registrar of Companies and Intellectual Property, o instituție centrală unică pentru toate societățile.",
        "Nu există un certificat constatator în format românesc. Registrul cipriot emite propriile certificate oficiale privind înregistrarea, administratorii și secretarul, acționarii și sediul social, care confirmă aceleași informații.",
      ],
    },
    info: {
      heading: "Ce informații puteți verifica",
      body: "Fiecare profil de companie este construit din câmpurile publicate de registrul cipriot. Datele care nu au fost depuse nu sunt completate.",
      items: [
        "Denumirea înregistrată a firmei",
        "Numărul de înregistrare, de exemplu HE123456",
        "Statutul în registru și forma juridică",
        "Data înregistrării",
        "Sediul social înregistrat",
        "Administratorii și secretarul din registru",
      ],
    },
    docs: {
      heading: "Certificate oficiale ale companiilor cipriote",
      body: "Documentele sunt emise de registrul cipriot și livrate digital după procesarea comenzii.",
      items: [
        { slug: CERTIFICATE_SLUGS.incorporation, label: "Certificat de înregistrare" },
        { slug: CERTIFICATE_SLUGS.directors, label: "Certificat privind administratorii și secretarul" },
        { slug: CERTIFICATE_SLUGS.shareholders, label: "Certificat privind acționarii" },
        { slug: CERTIFICATE_SLUGS.office, label: "Certificat privind sediul social" },
        { slug: CERTIFICATE_SLUGS.goodStanding, label: "Certificat de bună funcționare" },
        { slug: CERTIFICATE_SLUGS.memorandum, label: "Act constitutiv și statut" },
        { slug: CERTIFICATE_SLUGS.profile, label: "Raport de profil al companiei cipriote" },
      ],
      orderLabel: "Comandă",
      supportHeading: "Apostilă și traducere autorizată",
      supportBody:
        "Apostila și traducerea autorizată sunt disponibile la cerere pentru documentele comandate. Spuneți-ne de ce aveți nevoie înainte de expedierea comenzii.",
      supportCta: "Solicitați apostilă sau traducere",
    },
    useCases: {
      heading: "Când aveți nevoie de date despre o firmă cipriotă",
      items: [
        "Verificarea unui client sau furnizor",
        "Controale KYB și prevenirea spălării banilor",
        "Analiză juridică, fiscală sau de audit",
        "Deschidere de cont bancar și proceduri de reglementare",
        "Litigii și relații contractuale",
        "Confirmarea administratorilor sau acționarilor",
        "Pregătirea documentelor pentru utilizare în România",
      ],
    },
    legalise: {
      heading: "Folosirea documentelor cipriote în România",
      body: "În funcție de scop și de instituția destinatară, documentele cipriote pot necesita legalizare, apostilă sau traducere autorizată în limba română. Confirmați cerințele cu instituția, banca, notarul sau avocatul destinatar înainte de a comanda.",
      cta: "Cereți asistență pentru certificate",
    },
    faq: {
      heading: "Întrebări frecvente",
      items: [
        {
          question: "Există un registru al comerțului în Cipru?",
          answer:
            "Da, dar cu altă denumire. Registrul este ținut de Registrar of Companies and Intellectual Property.",
        },
        {
          question: "Cum caut o companie cipriotă?",
          answer:
            "Introduceți denumirea sau numărul de înregistrare cipriot în căutarea de pe această pagină. Căutarea este gratuită.",
        },
        {
          question: "Pot comanda un certificat oficial?",
          answer: "Da. Alegeți compania, apoi certificatul sau documentul de care aveți nevoie.",
        },
        {
          question: "Certificatele cipriote sunt acceptate în România?",
          answer:
            "Depinde de destinatar. De regulă se solicită apostilă și traducere autorizată.",
        },
        {
          question: "CompaniesHouseCyprus.com este o instituție publică?",
          answer:
            "Nu. Este o platformă independentă de căutare și comandă de documente. Registrul oficial este ținut de Registrar of Companies din Cipru.",
        },
      ],
    },
    finalCta: {
      heading: "Căutați o companie cipriotă",
      body: "Găsiți compania dorită și consultați informațiile, certificatele și documentele disponibile.",
      primary: "Caută acum",
      secondary: "Comandă un certificat",
    },
    relatedHeading: "Ghiduri pentru alte țări",
    disclaimer:
      "CompaniesHouseCyprus.com este un serviciu independent de informare și comandă de documente. Nu este site-ul oficial al Registrar of Companies din Cipru și nu este afiliat sau aprobat de vreo autoritate publică.",
  },
  {
    key: "bg",
    path: "/bg/cyprus-company-register",
    hreflang: "bg",
    lang: "bg",
    country: "Bulgaria",
    flag: "🇧🇬",
    localTerm: "Търговски регистър на Кипър",
    hubBlurb:
      "Bulgarian users search for a търговски регистър; Cyprus keeps its register with the Registrar of Companies.",
    title: "Търговски регистър на Кипър – Търсене на фирми",
    description:
      "Търговски регистър на Кипър: търсене на кипърски компании по име или регистрационен номер и заявка на официални фирмени удостоверения.",
    h1: "Търговски регистър на Кипър – Търсене на кипърски компании",
    hero: "Търсите търговския регистър на Кипър? Официалният регистър на дружествата в Кипър се води от Registrar of Companies and Intellectual Property. Чрез CompaniesHouseCyprus.com можете да търсите регистрирани кипърски дружества и да заявявате официални фирмени удостоверения и документи.",
    ctaSearch: "Търсене на фирма",
    ctaOrder: "Заявка на удостоверения",
    searchPlaceholder: "Име на фирмата или регистрационен номер",
    searchLabel: "Търсене на кипърски компании",
    breadcrumb: { home: "Начало", hub: "Международно", current: "Търговски регистър на Кипър" },
    hubLinkLabel: "Международен справочник за регистри",
    compare: {
      heading: "Кой е кипърският еквивалент на Търговския регистър?",
      paragraphs: [
        "В България данните за дружествата се вписват в Търговския регистър и регистъра на юридическите лица с нестопанска цел към Агенцията по вписванията. В Кипър съответният орган е Registrar of Companies and Intellectual Property.",
        "Кипър не издава удостоверение за актуално състояние в български формат. Кипърският регистър обаче издава собствени официални удостоверения за учредяване, директори и секретар, акционери и седалище, които съдържат същата информация.",
      ],
    },
    info: {
      heading: "Каква информация можете да проверите",
      body: "Всеки фирмен профил се изгражда от полетата, публикувани от кипърския регистър. Липсващи в регистъра данни не се добавят.",
      items: [
        "Регистрирано наименование на дружеството",
        "Регистрационен номер, например HE123456",
        "Статус в регистъра и правна форма",
        "Дата на регистрация",
        "Регистриран адрес на управление",
        "Директори и секретар по регистър",
      ],
    },
    docs: {
      heading: "Официални удостоверения за кипърски дружества",
      body: "Документите се издават от кипърския регистър и се доставят дигитално след обработка на заявката.",
      items: [
        { slug: CERTIFICATE_SLUGS.incorporation, label: "Удостоверение за учредяване" },
        { slug: CERTIFICATE_SLUGS.directors, label: "Удостоверение за директори и секретар" },
        { slug: CERTIFICATE_SLUGS.shareholders, label: "Удостоверение за акционери" },
        { slug: CERTIFICATE_SLUGS.office, label: "Удостоверение за седалище" },
        { slug: CERTIFICATE_SLUGS.goodStanding, label: "Удостоверение за добро състояние" },
        { slug: CERTIFICATE_SLUGS.memorandum, label: "Учредителен акт и устав" },
        { slug: CERTIFICATE_SLUGS.profile, label: "Профил на кипърско дружество" },
      ],
      orderLabel: "Заявете",
      supportHeading: "Апостил и заверен превод",
      supportBody:
        "Апостил и заверен превод са възможни при заявка за поръчаните документи. Уведомете ни преди изпращане на поръчката.",
      supportCta: "Заявете апостил или превод",
    },
    useCases: {
      heading: "Кога са нужни данни за кипърско дружество",
      items: [
        "Проверка на клиент или доставчик",
        "KYB проверки и мерки срещу изпиране на пари",
        "Правен, данъчен или одиторски преглед",
        "Откриване на банкова сметка и регулаторни процедури",
        "Съдебни и договорни цели",
        "Потвърждаване на директори или акционери",
        "Подготовка на документи за използване в България",
      ],
    },
    legalise: {
      heading: "Използване на кипърски документи в България",
      body: "В зависимост от целта и институцията получател, кипърските фирмени документи може да изискват заверка, апостил или официален превод на български език. Уточнете изискванията с институцията, банката, нотариуса или адвоката преди да заявите документа.",
      cta: "Поискайте съдействие за удостоверения",
    },
    faq: {
      heading: "Често задавани въпроси",
      items: [
        {
          question: "Има ли търговски регистър в Кипър?",
          answer:
            "Да, но под друго наименование. Регистърът се води от Registrar of Companies and Intellectual Property.",
        },
        {
          question: "Как да търся кипърска компания?",
          answer:
            "Въведете наименованието или кипърския регистрационен номер в търсачката на тази страница. Търсенето е безплатно.",
        },
        {
          question: "Мога ли да заявя официално удостоверение?",
          answer: "Да. Изберете дружеството и след това необходимото удостоверение или документ.",
        },
        {
          question: "Признават ли се кипърските документи в България?",
          answer:
            "Зависи от получателя. Често се изискват апостил и официален превод.",
        },
        {
          question: "CompaniesHouseCyprus.com държавна услуга ли е?",
          answer:
            "Не. Това е независима платформа за търсене на фирми и заявка на документи. Официалният регистър се води от кипърския Registrar of Companies.",
        },
      ],
    },
    finalCta: {
      heading: "Потърсете кипърска компания",
      body: "Намерете дружеството и вижте наличната регистрова информация, удостоверения и документи.",
      primary: "Търсете сега",
      secondary: "Заявете удостоверение",
    },
    relatedHeading: "Справочници за други държави",
    disclaimer:
      "CompaniesHouseCyprus.com е независима услуга за информация и заявка на документи. Не е официалният сайт на кипърския Registrar of Companies и не е свързан с или одобрен от държавен орган.",
  },
  {
    key: "il",
    path: "/il/cyprus-company-registry",
    hreflang: "en-IL",
    lang: "en",
    country: "Israel",
    flag: "🇮🇱",
    localTerm: "Cyprus company registry",
    hubBlurb:
      "Israeli businesses checking Cyprus counterparties: registry data plus certificates for banks and regulators.",
    title: "Cyprus Company Registry – Search from Israel",
    description:
      "Search the Cyprus company registry from Israel by name or registration number, and order official Cyprus company certificates with apostille on request.",
    h1: "Cyprus Company Registry – Search Cyprus Companies",
    hero: "Checking a Cyprus company from Israel? The official Cyprus register is maintained by the Registrar of Companies and Intellectual Property. CompaniesHouseCyprus.com lets you search registered Cyprus entities and order official company certificates and documents, with apostille available on request.",
    ctaSearch: "Search companies",
    ctaOrder: "Order certificates",
    searchPlaceholder: "Search by company name or registration number",
    searchLabel: "Search Cyprus companies",
    breadcrumb: { home: "Home", hub: "International", current: "Cyprus company registry" },
    hubLinkLabel: "International company registry guide",
    compare: {
      heading: "The Cyprus registry compared with the Israeli Registrar of Companies",
      paragraphs: [
        "In Israel, companies are recorded by the Registrar of Companies (רשם החברות) within the Corporations Authority. Cyprus operates a comparable single national body, the Department of Registrar of Companies and Intellectual Property.",
        "Both registers publish the entity name, number, status and registered address, and both issue certificates on request. Cyprus numbers carry a letter prefix such as HE for limited companies, which is worth noting when transposing a company number from an Israeli file.",
      ],
    },
    info: {
      heading: "What you can look up",
      body: "Profiles reflect the fields published by the Cyprus Registrar. Nothing is inferred, and unfiled details are simply absent.",
      items: [
        "Registered company name",
        "Registration number, such as HE123456",
        "Registry status and organisation type",
        "Registration date",
        "Registered office address",
        "Directors and secretary on record",
      ],
    },
    docs: {
      heading: "Official Cyprus company certificates",
      body: "Issued by the Cyprus Registrar and delivered digitally once the order is processed.",
      items: [
        { slug: CERTIFICATE_SLUGS.incorporation, label: "Certificate of Incorporation" },
        { slug: CERTIFICATE_SLUGS.directors, label: "Certificate of Directors and Secretary" },
        { slug: CERTIFICATE_SLUGS.shareholders, label: "Certificate of Shareholders" },
        { slug: CERTIFICATE_SLUGS.office, label: "Certificate of Registered Office" },
        { slug: CERTIFICATE_SLUGS.goodStanding, label: "Certificate of Good Standing" },
        { slug: CERTIFICATE_SLUGS.memorandum, label: "Memorandum and Articles of Association" },
        { slug: CERTIFICATE_SLUGS.profile, label: "Cyprus company profile report" },
      ],
      orderLabel: "Order",
      supportHeading: "Apostille and certified translation",
      supportBody:
        "Apostille legalisation and certified translation, including Hebrew, are available on request for the documents you order.",
      supportCta: "Request apostille or translation",
    },
    useCases: {
      heading: "Why Israeli businesses request Cyprus company records",
      items: [
        "Screening a Cyprus customer, supplier or investor",
        "KYB and anti-money-laundering files",
        "Legal, tax and audit review",
        "Bank onboarding and regulatory submissions",
        "Litigation and contract enforcement",
        "Confirming directors, secretary or shareholders",
        "Preparing Cyprus documents for use in Israel",
      ],
    },
    legalise: {
      heading: "Using Cyprus documents in Israel",
      body: "Israeli banks, courts and authorities usually require an apostille under the Hague Convention, and often a certified Hebrew translation (תרגום נוטריוני). Confirm the exact requirements with the receiving institution before ordering.",
      cta: "Ask about certificate support",
    },
    faq: {
      heading: "Frequently asked questions",
      items: [
        {
          question: "How do I search the Cyprus company registry from Israel?",
          answer:
            "Use the search on this page with the company name or Cyprus registration number. Searching and viewing profiles is free.",
        },
        {
          question: "מהו מרשם החברות בקפריסין?",
          answer:
            "מרשם החברות הרשמי בקפריסין מנוהל על ידי רשם החברות והקניין הרוחני. אתר זה הוא שירות חיפוש והזמנת מסמכים עצמאי.",
        },
        {
          question: "Can I order an official Cyprus certificate with apostille?",
          answer:
            "Yes. Order the certificate you need and ask us to add apostille legalisation, and a certified translation if required.",
        },
        {
          question: "Will a Cyprus certificate be accepted by an Israeli bank?",
          answer:
            "That depends on the bank. Most require an apostille and many also ask for a notarised Hebrew translation.",
        },
        {
          question: "Is CompaniesHouseCyprus.com a government service?",
          answer:
            "No. It is an independent company-search and document-ordering platform. The official register is maintained by the Cyprus Registrar of Companies.",
        },
      ],
    },
    finalCta: {
      heading: "Search a Cyprus company",
      body: "Find the company you need and review the available registry information, certificates and corporate documents.",
      primary: "Search now",
      secondary: "Order a certificate",
    },
    relatedHeading: "Guides for other countries",
    disclaimer:
      "CompaniesHouseCyprus.com is an independent information and document-ordering service. It is not the official website of the Cyprus Registrar of Companies and is not affiliated with or endorsed by any government authority.",
  },
];

export const INTERNATIONAL_HUB = {
  path: INTERNATIONAL_HUB_PATH,
  title: "Cyprus Company Register – International Search Guide",
  description:
    "Search Cyprus companies and order official company certificates. Find the Cyprus equivalent of Companies House, ΓΕΜΗ, Handelsregister, Kbis and other national business registers.",
  h1: "Find Cyprus Companies from Your Country",
  intro:
    "Looking for information about a Cyprus company? The official Cyprus company register is maintained by the Registrar of Companies. CompaniesHouseCyprus.com helps international users search registered Cyprus entities and request official company certificates and documents.",
  searchPlaceholder: "Search by company name or registration number",
  primaryCta: "Search Cyprus Companies",
  secondaryCta: "Order Official Certificates",
  cardCta: "View Cyprus Registry Guide",
  breadcrumb: { home: "Home", current: "International Company Registry Guide" },
  disclaimer:
    "CompaniesHouseCyprus.com is an independent information and document-ordering service. It is not the official website of the Cyprus Registrar of Companies and is not affiliated with or endorsed by any government authority.",
} as const;

export function getGuideByPath(path: string): InternationalGuide | undefined {
  return INTERNATIONAL_GUIDES.find((guide) => guide.path === path);
}

export function guideCanonical(guide: InternationalGuide): string {
  return `${SITE_URL}${guide.path}`;
}

export const HUB_CANONICAL = `${SITE_URL}${INTERNATIONAL_HUB_PATH}`;

type MetaTag = { title: string } | { name: string; content: string } | { property: string; content: string };
type LinkTag = { rel: string; href: string; hrefLang?: string };
type ScriptTag = { type: string; children: string };

function hreflangLinks(): LinkTag[] {
  return [
    ...INTERNATIONAL_GUIDES.map((guide) => ({
      rel: "alternate",
      hrefLang: guide.hreflang,
      href: guideCanonical(guide),
    })),
    { rel: "alternate", hrefLang: "en", href: HUB_CANONICAL },
    { rel: "alternate", hrefLang: "x-default", href: HUB_CANONICAL },
  ];
}

function faqSchema(items: GuideFaq[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };
}

function webPageSchema(input: { url: string; name: string; description: string; lang: string }) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": input.url,
    url: input.url,
    name: input.name,
    description: input.description,
    inLanguage: input.lang,
    isPartOf: { "@type": "WebSite", url: `${SITE_URL}/`, name: "Companies House Cyprus" },
  };
}

export function buildHubHead(): { meta: MetaTag[]; links: LinkTag[]; scripts: ScriptTag[] } {
  return {
    meta: [
      { title: INTERNATIONAL_HUB.title },
      { name: "description", content: INTERNATIONAL_HUB.description },
      { property: "og:title", content: INTERNATIONAL_HUB.title },
      { property: "og:description", content: INTERNATIONAL_HUB.description },
      { property: "og:type", content: "website" },
      { property: "og:url", content: HUB_CANONICAL },
      { property: "og:locale", content: "en" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: INTERNATIONAL_HUB.title },
      { name: "twitter:description", content: INTERNATIONAL_HUB.description },
    ],
    links: [{ rel: "canonical", href: HUB_CANONICAL }, ...hreflangLinks()],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
            {
              "@type": "ListItem",
              position: 2,
              name: INTERNATIONAL_HUB.breadcrumb.current,
              item: HUB_CANONICAL,
            },
          ],
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify(
          webPageSchema({
            url: HUB_CANONICAL,
            name: INTERNATIONAL_HUB.title,
            description: INTERNATIONAL_HUB.description,
            lang: "en",
          }),
        ),
      },
    ],
  };
}

export function buildGuideHead(guide: InternationalGuide): {
  meta: MetaTag[];
  links: LinkTag[];
  scripts: ScriptTag[];
} {
  const canonical = guideCanonical(guide);
  return {
    meta: [
      { title: guide.title },
      { name: "description", content: guide.description },
      { property: "og:title", content: guide.title },
      { property: "og:description", content: guide.description },
      { property: "og:type", content: "website" },
      { property: "og:url", content: canonical },
      { property: "og:locale", content: guide.hreflang.replace("-", "_") },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: guide.title },
      { name: "twitter:description", content: guide.description },
    ],
    links: [{ rel: "canonical", href: canonical }, ...hreflangLinks()],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: guide.breadcrumb.home, item: `${SITE_URL}/` },
            { "@type": "ListItem", position: 2, name: guide.breadcrumb.hub, item: HUB_CANONICAL },
            { "@type": "ListItem", position: 3, name: guide.breadcrumb.current, item: canonical },
          ],
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify(
          webPageSchema({
            url: canonical,
            name: guide.title,
            description: guide.description,
            lang: guide.lang,
          }),
        ),
      },
      { type: "application/ld+json", children: JSON.stringify(faqSchema(guide.faq.items)) },
    ],
  };
}
