import { PRODUCTS, formatPrice } from "./products";

export const VAT_RATE = 0.19;
export const CERTIFICATE_SERVICE_FEE = 50;
/** Optional apostille certification, charged per certificate. */
export const APOSTILLE_FEE = 100;

export const APOSTILLE_DESCRIPTION =
  "An Apostille certifies the authenticity of signatures and seals on documents issued in Cyprus, enabling their official recognition and use abroad in countries that accept Apostille certification.";

/** Certificates are the only products eligible for the apostille add-on. */
export function supportsApostille(product: { category: string }): boolean {
  return product.category === "certificate";
}

export function certificateUnits(product: { category: string; certificateCount?: number }): number {
  return product.certificateCount ?? (product.category === "certificate" ? 1 : 0);
}

export type PriceBreakdown = {
  documentPrice: number;
  serviceFee: number;
  apostilleFee: number;
  vat: number;
  total: number;
};

export function priceBreakdown(
  product: { price: number; category: string; certificateCount?: number; vatablePrice?: number },
  quantity = 1,
  options: { apostille?: boolean } = {},
): PriceBreakdown {
  const documentPrice = product.price * quantity;
  const certificates = certificateUnits(product);
  const apostilleFee =
    options.apostille && supportsApostille(product) ? APOSTILLE_FEE * Math.max(1, certificates) * quantity : 0;
  const serviceFee = CERTIFICATE_SERVICE_FEE * certificates * quantity;
  // VAT applies to the service fee and to report content — never to the certificate price itself.
  const vatableDocument =
    product.category === "certificate" ? 0 : (product.vatablePrice ?? product.price) * quantity;
  const vatBase = vatableDocument + serviceFee + apostilleFee;
  const vat = Math.round(vatBase * VAT_RATE * 100) / 100;
  return {
    documentPrice,
    serviceFee,
    apostilleFee,
    vat,
    total: documentPrice + serviceFee + apostilleFee + vat,
  };
}

export function formatPriceBreakdown(breakdown: PriceBreakdown): string {
  return `${formatPrice(breakdown.documentPrice)} + ${formatPrice(breakdown.serviceFee)} fee + ${formatPrice(
    breakdown.vat,
  )} VAT = ${formatPrice(breakdown.total)}`;
}

export function getProductBySlug(slug: string) {
  return PRODUCTS.find((product) => product.slug === slug);
}
