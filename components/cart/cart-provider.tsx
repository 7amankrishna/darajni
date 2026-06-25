"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import type { CartItem } from "@/types/commerce";

interface AddCartItem
  extends Omit<CartItem, "key" | "quantity"> {
  quantity?: number;
}

interface CartContextValue {
  items: CartItem[];
  ready: boolean;
  itemCount: number;
  subtotal: number;
  addItem: (item: AddCartItem) => void;
  updateQuantity: (key: string, quantity: number) => void;
  removeItem: (key: string) => void;
  clearCart: () => void;
}

const STORAGE_KEY = "darajni-cart-v1";
const CartContext = createContext<CartContextValue | null>(null);

function safeCart(value: unknown): CartItem[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is CartItem => {
    if (!item || typeof item !== "object") return false;
    const candidate = item as Partial<CartItem>;
    return (
      typeof candidate.key === "string" &&
      typeof candidate.productId === "string" &&
      typeof candidate.name === "string" &&
      typeof candidate.size === "string" &&
      typeof candidate.quantity === "number" &&
      typeof candidate.unitPrice === "number" &&
      typeof candidate.stock === "number"
    );
  });
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      setItems(stored ? safeCart(JSON.parse(stored)) : []);
    } catch {
      setItems([]);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    if (!ready) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, ready]);

  const addItem = useCallback((item: AddCartItem) => {
    const key = `${item.productId}:${item.size}`;
    const quantity = Math.max(1, Math.min(item.quantity ?? 1, item.stock));

    setItems((current) => {
      const existing = current.find((entry) => entry.key === key);
      if (!existing) return [...current, { ...item, key, quantity }];
      return current.map((entry) =>
        entry.key === key
          ? {
              ...entry,
              quantity: Math.min(entry.quantity + quantity, entry.stock),
            }
          : entry,
      );
    });
  }, []);

  const updateQuantity = useCallback((key: string, quantity: number) => {
    setItems((current) =>
      current
        .map((item) =>
          item.key === key
            ? {
                ...item,
                quantity: Math.max(0, Math.min(quantity, item.stock)),
              }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );
  }, []);

  const removeItem = useCallback((key: string) => {
    setItems((current) => current.filter((item) => item.key !== key));
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      ready,
      itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
      subtotal: items.reduce(
        (sum, item) => sum + item.quantity * item.unitPrice,
        0,
      ),
      addItem,
      updateQuantity,
      removeItem,
      clearCart,
    }),
    [addItem, clearCart, items, ready, removeItem, updateQuantity],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside CartProvider");
  return context;
}
