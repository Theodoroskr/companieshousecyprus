const SITE = "https://companieshousecyprus.com";

export type CompanyJsonLdInput = {
  name: string;
  officialNo?: string | null;
  status?: string | null;
  statusGroup?: string | null;
  typeEn?: string | null;
  registrationIso?: string | null;
  district_en?: string | null;
  addressFull?: string | null;
  building?: string | null;
  street?: string | null;
  locality?: string | null;
  postcode?: string | null;
  isForeignAddress?: boolean;
};

/**
 * Organization / LegalEntity schema for a company profile page.
 * Only emits fields that actually have registry values so no empty
 * properties are published.
 */
export function companyOrganizationJsonLd(company: CompanyJsonLdInput, canonicalSlug: string) {
  const url = `${SITE}/company/${canonicalSlug}`;
  const streetAddress = [company.building, company.street].filter(Boolean).join(" ").trim();

  const address =
    streetAddress || company.locality || company.postcode || company.district_en || company.addressFull
      ? {
          "@type": "PostalAddress",
          ...(streetAddress ? { streetAddress } : company.addressFull ? { streetAddress: company.addressFull } : {}),
          ...(company.locality ? { addressLocality: company.locality } : {}),
          ...(company.district_en ? { addressRegion: company.district_en } : {}),
          ...(company.postcode ? { postalCode: company.postcode } : {}),
          ...(company.isForeignAddress ? {} : { addressCountry: "CY" }),
        }
      : undefined;

  const identifiers = company.officialNo
    ? [
        {
          "@type": "PropertyValue",
          name: "Cyprus Registrar of Companies registration number",
          propertyID: "CY-ROC",
          value: company.officialNo,
        },
      ]
    : undefined;

  return {
    "@context": "https://schema.org",
    "@type": ["Organization", "LegalEntity"],
    "@id": `${url}#organization`,
    name: company.name,
    legalName: company.name,
    url,
    mainEntityOfPage: url,
    ...(identifiers ? { identifier: identifiers } : {}),
    ...(company.typeEn ? { additionalType: company.typeEn } : {}),
    ...(company.registrationIso ? { foundingDate: company.registrationIso } : {}),
    ...(company.registrationIso || company.district_en
      ? {
          foundingLocation: {
            "@type": "Place",
            ...(company.district_en ? { name: `${company.district_en}, Cyprus` } : { name: "Cyprus" }),
            address: {
              "@type": "PostalAddress",
              ...(company.district_en ? { addressRegion: company.district_en } : {}),
              addressCountry: "CY",
            },
          },
        }
      : {}),
    ...(address ? { address } : {}),
    
    ...(company.status
      ? {
          additionalProperty: [
            {
              "@type": "PropertyValue",
              name: "Registry status",
              value: company.status,
            },
          ],
        }
      : {}),
    subjectOf: {
      "@type": "WebPage",
      "@id": url,
      url,
      name: company.name,
    },
  };
}

/**
 * ProfilePage wrapper for a company page: tells Google what the page is,
 * who publishes it and when the registry data was last refreshed.
 */
export function companyProfilePageJsonLd(
  company: { name: string; officialNo?: string | null; updatedAt?: string | null },
  canonicalSlug: string,
) {
  const url = `${SITE}/company/${canonicalSlug}`;
  return {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    "@id": url,
    url,
    name: company.officialNo ? `${company.name} (${company.officialNo})` : company.name,
    inLanguage: "en",
    isPartOf: { "@type": "WebSite", "@id": `${SITE}/#website`, url: SITE, name: "Companies House Cyprus" },
    mainEntity: { "@id": `${url}#organization` },
    ...(company.updatedAt ? { dateModified: company.updatedAt } : {}),
    publisher: { "@type": "Organization", "@id": `${SITE}/#organization`, name: "Companies House Cyprus", url: SITE },
    about: { "@id": `${url}#organization` },
  };
}
