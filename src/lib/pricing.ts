import { PRODUCTS, formatPrice } from "./products";

export const VAT_RATE = 0.19;
export const CERTIFICATE_SERVICE_FEE = 50;

export type PriceBreakdown = {
  documentPrice: number;
  serviceFee: number;
  vat: number;
  total: number;
};

export function priceBreakdown(product: { price: number; category: string }, quantity = 1): PriceBreakdown {
  const documentPrice = product.price * quantity;
  const serviceFee = product.category === "certificate" ? CERTIFICATE_SERVICE_FEE * quantity : 0;
  const vat = Math.round((documentPrice + serviceFee) * VAT_RATE * 100) / 100;
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
