import { PRODUCTS_BY_SLUG, type Product } from "./products";
import type { CartItem } from "./cart-context";

/** Products that are commonly ordered together, keyed by the product in the cart. */
const RELATED: Record<string, string[]> = {
  "sanctions-risk-snapshot": ["cyprus-company-profile", "cyprus-credit-report"],
  "cyprus-company-profile": ["sanctions-risk-snapshot", "cyprus-credit-report"],
  "cyprus-credit-report": ["cyprus-company-profile", "sanctions-risk-snapshot"],
};

const REASON: Record<string, string> = {
  "cyprus-company-profile":
    "Adds the registry structure — directors, secretary, shareholders and registered office — behind the screened entity.",
  "cyprus-credit-report":
    "Adds financial standing, payment behaviour and credit assessment for the same company.",
  "sanctions-risk-snapshot":
    "Screens the same legal entity against the official EU, UN, UK and US sanctions lists.",
};

export type CrossSellSuggestion = {
  product: Product;
  reason: string;
  /** Company the suggestion should be ordered for. */
  companySlug: string | null;
  companyName: string | null;
  companyNumber: string | null;
};

/** Suggestions for the current cart: related products not already in it, per company. */
export function crossSellSuggestions(items: CartItem[]): CrossSellSuggestion[] {
  const inCart = new Set(items.map((i) => `${i.productSlug}::${i.companySlug ?? ""}`));
  const out: CrossSellSuggestion[] = [];
  const seen = new Set<string>();

  for (const item of items) {
    for (const slug of RELATED[item.productSlug] ?? []) {
      const key = `${slug}::${item.companySlug ?? ""}`;
      if (inCart.has(key) || seen.has(key)) continue;
      const product = PRODUCTS_BY_SLUG[slug];
      if (!product) continue;
      seen.add(key);
      out.push({
        product,
        reason: REASON[slug] ?? product.tagline,
        companySlug: item.companySlug,
        companyName: item.companyName,
        companyNumber: item.companyNumber,
      });
    }
  }

  return out.slice(0, 3);
}
