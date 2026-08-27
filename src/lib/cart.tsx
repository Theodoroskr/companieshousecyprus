import { useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { PRODUCTS_BY_SLUG } from "./products";
import { APOSTILLE_FEE, CERTIFICATE_SERVICE_FEE, VAT_RATE, priceBreakdown, supportsApostille } from "./pricing";
import {
  CartContext,
  CART_STORAGE_KEY as STORAGE_KEY,
  type CartContextValue,
  type CartItem,
} from "./cart-context";

export type { CartItem, CartContextValue } from "./cart-context";

export const CART_VAT_RATE = VAT_RATE;
export const CART_SERVICE_FEE = CERTIFICATE_SERVICE_FEE;
export const CART_APOSTILLE_FEE = APOSTILLE_FEE;

export function CartProvider({ children }: { children: ReactNode }) {
  // Nesting guard: a second CartProvider would hydrate its own empty state and
  // persist it over the outer cart's localStorage, wiping the customer's cart.
  // Nesting is a static tree property, so reading the parent context before the
  // state hooks below cannot violate hook ordering.
  const parent = useContext(CartContext);
  const nested = parent != null;
  if (nested && import.meta.env.DEV) {
    throw new Error(
      "Nested <CartProvider> detected. Only one CartProvider may be mounted (see src/routes/__root.tsx); nesting would reset cart state.",
    );
  }

  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (nested) return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw) as CartItem[]);
    } catch {
      /* ignore malformed cart */
    }
    setHydrated(true);
  }, [nested]);

  useEffect(() => {
    if (nested || !hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* storage unavailable */
    }
  }, [items, hydrated, nested]);

  const value = useMemo<CartContextValue>(() => {
    const subtotal = items.reduce((sum, item) => {
      const product = PRODUCTS_BY_SLUG[item.productSlug];
      return sum + (product ? product.price * item.quantity : 0);
    }, 0);
    const serviceFee = items.reduce((sum, item) => {
      const product = PRODUCTS_BY_SLUG[item.productSlug];
      if (!product) return sum;
      return sum + priceBreakdown(product, item.quantity, { apostille: item.apostille }).serviceFee;
    }, 0);
    const apostilleFee = items.reduce((sum, item) => {
      const product = PRODUCTS_BY_SLUG[item.productSlug];
      if (!product) return sum;
      return sum + priceBreakdown(product, item.quantity, { apostille: item.apostille }).apostilleFee;
    }, 0);
    const vatBase = items.reduce((sum, item) => {
      const product = PRODUCTS_BY_SLUG[item.productSlug];
      if (!product) return sum;
      const breakdown = priceBreakdown(product, item.quantity, { apostille: item.apostille });
      const vatableDocument =
        product.category === "certificate" ? 0 : (product.vatablePrice ?? product.price) * item.quantity;
      return sum + breakdown.serviceFee + breakdown.apostilleFee + vatableDocument;
    }, 0);
    const vat = Math.round(vatBase * VAT_RATE * 100) / 100;


    return {
      items,
      count: hydrated ? items.reduce((sum, item) => sum + item.quantity, 0) : 0,
      subtotal,
      serviceFee,
      apostilleFee,
      vat,
      total: subtotal + serviceFee + apostilleFee + vat,
      setApostille: (index, apostille) =>
        setItems((current) =>
          current.map((item, i) => {
            if (i !== index) return item;
            const product = PRODUCTS_BY_SLUG[item.productSlug];
            if (!product || !supportsApostille(product)) return item;
            return { ...item, apostille };
          }),
        ),
      addItem: (item) =>
        setItems((current) => {
          const index = current.findIndex(
            (existing) =>
              existing.productSlug === item.productSlug && existing.companySlug === item.companySlug,
          );
          if (index >= 0) {
            const next = [...current];
            next[index] = { ...next[index]!, quantity: next[index]!.quantity + 1 };
            return next;
          }
          return [...current, { ...item, quantity: 1 }];
        }),
      removeItem: (index) => setItems((current) => current.filter((_, i) => i !== index)),
      updateQuantity: (index, quantity) =>
        setItems((current) =>
          current.map((item, i) => (i === index ? { ...item, quantity: Math.max(1, quantity) } : item)),
        ),
      clear: () => setItems([]),
    };
  }, [items, hydrated]);

  // In production, degrade gracefully: render children against the outer
  // provider instead of shadowing it with a fresh, cart-wiping instance.
  if (nested) return <>{children}</>;

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside CartProvider");
  return context;
}
