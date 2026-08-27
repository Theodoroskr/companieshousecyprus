import { createContext } from "react";

export type CartItem = {
  productSlug: string;
  companySlug: string | null;
  companyName: string | null;
  companyNumber: string | null;
  quantity: number;
  /** Optional apostille certification — certificates only. */
  apostille?: boolean;
};

export type CartContextValue = {
  items: CartItem[];
  count: number;
  subtotal: number;
  serviceFee: number;
  apostilleFee: number;
  vat: number;
  total: number;
  setApostille: (index: number, apostille: boolean) => void;
  addItem: (item: Omit<CartItem, "quantity">) => void;
  removeItem: (index: number) => void;
  updateQuantity: (index: number, quantity: number) => void;
  clear: () => void;
};

export const CART_STORAGE_KEY = "chc.cart.v1";

/**
 * Lives in a component-free module so react-refresh never re-creates the
 * context identity when the provider component is edited (which would make
 * consumers read a different context and throw "must be used inside").
 */
export const CartContext = createContext<CartContextValue | null>(null);
