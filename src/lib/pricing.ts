import { PRODUCTS, formatPrice } from "./products";

export const VAT_RATE = 0.19;
export const CERTIFICATE_SERVICE_FEE = 50;

export type PriceBreakdown = {
  documentPrice: number;
  serviceFee: number;
  vat: number;
  total: number;
};

export function priceBreakdown(
  product: { price: number; category: string; certificateCount?: number; vatablePrice?: number },
  quantity = 1,
): PriceBreakdown {
  const documentPrice = product.price * quantity;
  const certificates = product.certificateCount ?? (product.category === "certificate" ? 1 : 0);
  const serviceFee = CERTIFICATE_SERVICE_FEE * certificates * quantity;
  // VAT applies to the service fee and to report content — never to the certificate price itself.
  const vatableDocument =
    product.category === "certificate" ? 0 : (product.vatablePrice ?? product.price) * quantity;
  const vatBase = vatableDocument + serviceFee;
  const vat = Math.round(vatBase * VAT_RATE * 100) / 100;
  return {
    documentPrice,
    serviceFee,
    vat,
    total: documentPrice + serviceFee + vat,
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
