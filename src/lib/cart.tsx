import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { PRODUCTS_BY_SLUG } from "./products";
import { CERTIFICATE_SERVICE_FEE, VAT_RATE } from "./pricing";

export type CartItem = {
  productSlug: string;
  companySlug: string | null;
  companyName: string | null;
  companyNumber: string | null;
  quantity: number;
};

type CartContextValue = {
  items: CartItem[];
  count: number;
  subtotal: number;
  serviceFee: number;
  vat: number;
  total: number;
  addItem: (item: Omit<CartItem, "quantity">) => void;
  removeItem: (index: number) => void;
  updateQuantity: (index: number, quantity: number) => void;
  clear: () => void;
};

const STORAGE_KEY = "chc.cart.v1";

const CartContext = createContext<CartContextValue | null>(null);

export const CART_VAT_RATE = VAT_RATE;
export const CART_SERVICE_FEE = CERTIFICATE_SERVICE_FEE;

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw) as CartItem[]);
    } catch {
      /* ignore malformed cart */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* storage unavailable */
    }
  }, [items, hydrated]);

  const value = useMemo<CartContextValue>(() => {
    const subtotal = items.reduce((sum, item) => {
      const product = PRODUCTS_BY_SLUG[item.productSlug];
      return sum + (product ? product.price * item.quantity : 0);
    }, 0);
    const serviceFee = items.reduce((sum, item) => {
      const product = PRODUCTS_BY_SLUG[item.productSlug];
      return sum + (product && product.category === "certificate" ? CERTIFICATE_SERVICE_FEE * item.quantity : 0);
    }, 0);
    const vat = Math.round((subtotal + serviceFee) * VAT_RATE * 100) / 100;

    return {
      items,
      count: hydrated ? items.reduce((sum, item) => sum + item.quantity, 0) : 0,
      subtotal,
      serviceFee,
      vat,
      total: subtotal + serviceFee + vat,
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

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside CartProvider");
  return context;
}
