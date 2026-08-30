// Homepage JSON-LD builders. Single source of truth consumed by
// src/routes/index.tsx and guarded by src/lib/__tests__/home-jsonld.test.ts
// so the structured data can never drift from the canonical URL or the
// title/description snippet.

import { HOME_CANONICAL_URL } from "./home-head";

export function homeWebsiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${HOME_CANONICAL_URL}#website`,
    name: "Companies House Cyprus",
    url: HOME_CANONICAL_URL,
    publisher: { "@id": `${HOME_CANONICAL_URL}#organization` },
    description:
      "Free Cyprus company register search and online ordering of official certificates, reports and KYB documents with digital delivery.",
    inLanguage: "en",
    keywords: [
      "Companies House Cyprus",
      "Cyprus company register",
      "Cyprus company search",
      "certificate of good standing Cyprus",
      "Cyprus company report",
    ],
    potentialAction: {
      "@type": "SearchAction",
      name: "Search Cyprus companies",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${HOME_CANONICAL_URL}search?q={search_term_string}&page=1`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export function homeOrganizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${HOME_CANONICAL_URL}#organization`,
    name: "Companies House Cyprus",
    alternateName: "CHC",
    url: HOME_CANONICAL_URL,
    logo: {
      "@type": "ImageObject",
      url: `${HOME_CANONICAL_URL}favicon.png`,
    },
    description:
      "Search and browse Cyprus companies from the official Registrar of Companies. Company profiles, officials & owners, addresses, statuses, and certified documents delivered digitally.",
    foundingDate: "2024",
    parentOrganization: {
      "@type": "Organization",
      name: "Infocredit Group Limited",
      identifier: "HE4404",
    },
    areaServed: { "@type": "Country", name: "Cyprus" },
    knowsAbout: [
      "Cyprus company register",
      "Department of Registrar of Companies and Intellectual Property",
      "Cyprus company search",
      "certificates of good standing",
      "KYB due diligence",
    ],
    sameAs: [
      "https://companieshousecyprus.com/contact",
      "https://companieshousecyprus.com/pricing",
    ],
    contactPoint: {
      "@type": "ContactPoint",
      telephone: "+35722398241",
      contactType: "customer service",
      email: "info@companieshousecyprus.com",
      availableLanguage: ["English", "Greek"],
      areaServed: "CY",
    },
    address: {
      "@type": "PostalAddress",
      streetAddress: "1 Agiou Andreou Street",
      addressLocality: "Limassol",
      postalCode: "3036",
      addressCountry: "CY",
    },
  };
}
