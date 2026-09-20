import { priceBreakdown } from "@/lib/pricing";
import { CURRENCY, type Product } from "@/lib/products";

const SITE = "https://companieshousecyprus.com";

export const PUBLISHER_JSONLD = {
  "@type": "Organization",
  "@id": `${SITE}/#organization`,
  name: "Companies House Cyprus",
  url: SITE,
};

/** ISO date one year out — offers stay valid while the catalogue price holds. */
function priceValidUntil(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

/**
 * Product + Offer schema for a purchasable document page.
 * The advertised price is the full checkout total for one copy
 * (document + Registrar service fee + VAT) so Google never shows
 * a price lower than the customer actually pays.
 */
export function productJsonLd(product: Product) {
  const url = `${SITE}/report/${product.slug}`;
  const breakdown = priceBreakdown(product);

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${url}#product`,
    name: product.name,
    description: product.tagline,
    url,
    category: product.category,
    brand: PUBLISHER_JSONLD,
    offers: {
      "@type": "Offer",
      url,
      price: breakdown.total.toFixed(2),
      priceCurrency: CURRENCY,
      priceValidUntil: priceValidUntil(),
      availability: "https://schema.org/InStock",
      itemCondition: "https://schema.org/NewCondition",
      seller: PUBLISHER_JSONLD,
      areaServed: "CY",
      deliveryLeadTime: { "@type": "QuantitativeValue", unitCode: "DAY", minValue: 1, maxValue: 3 },
    },
    additionalProperty: [
      { "@type": "PropertyValue", name: "Delivery", value: product.delivery },
      { "@type": "PropertyValue", name: "Format", value: "Digital PDF" },
      { "@type": "PropertyValue", name: "Typical use", value: product.typicalUse },
    ],
    isRelatedTo: product.includes.slice(0, 4).map((item) => ({
      "@type": "Thing",
      name: item.title,
      description: item.detail,
    })),
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${SITE}${item.path}`,
    })),
  };
}
