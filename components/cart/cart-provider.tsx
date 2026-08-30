"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
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
const CART_MAX_AGE_MS = 48 * 60 * 60 * 1000;
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

function readStoredCart(raw: string | null): CartItem[] {
  if (!raw) return [];
  const parsed = JSON.parse(raw) as unknown;

  if (Array.isArray(parsed)) {
    return safeCart(parsed);
  }

  if (!parsed || typeof parsed !== "object") return [];
  const candidate = parsed as { savedAt?: unknown; items?: unknown };
  const savedAt =
    typeof candidate.savedAt === "number" ? candidate.savedAt : Date.now();
  if (Date.now() - savedAt > CART_MAX_AGE_MS) {
    window.localStorage.removeItem(STORAGE_KEY);
    return [];
  }

  return safeCart(candidate.items);
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);
  const itemsRef = useRef<CartItem[]>(items);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      setItems(readStoredCart(stored));
    } catch {
      setItems([]);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    if (!ready) return;
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ savedAt: Date.now(), items }),
    );
  }, [items, ready]);

  // Reconcile stored cart items against the live catalog so the cart always
  // shows the current price/stock — the same figures checkout charges from the
  // database. Without this, a price the admin changed after an item was added
  // stays frozen in localStorage, so the cart and the final order disagree.
  const syncPrices = useCallback(async () => {
    const ids = Array.from(
      new Set(itemsRef.current.map((item) => item.productId)),
    );
    if (!ids.length) return;

    let fresh: Array<{
      id: string;
      slug: string;
      name: string;
      image: string;
      unitPrice: number;
      stock: number;
    }>;
    try {
      const response = await fetch("/api/catalog/prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      if (!response.ok) return;
      const data = (await response.json()) as { products?: typeof fresh };
      fresh = Array.isArray(data.products) ? data.products : [];
    } catch {
      // Network hiccup: keep the stored values rather than wiping the cart.
      return;
    }

    // An empty list means the catalog itself was unreachable — inconclusive, so
    // never drop items on it. Only prune when we have a working catalog and a
    // specific product is missing (unpublished or deleted).
    if (!fresh.length) return;

    const map = new Map(fresh.map((entry) => [entry.id, entry]));
    setItems((current) =>
      current
        .filter((item) => map.has(item.productId))
        .map((item) => {
          const next = map.get(item.productId)!;
          return {
            ...item,
            slug: next.slug,
            name: next.name,
            image: next.image,
            unitPrice: next.unitPrice,
            stock: next.stock,
            quantity: Math.min(item.quantity, Math.max(1, next.stock)),
          };
        })
        .filter((item) => item.stock > 0),
    );
  }, []);

  // Refresh when the cart becomes ready and whenever the set of products in it
  // changes (an item added/removed), and again when the tab regains focus — so
  // catalog edits surface without a manual page reload.
  const productKey = items.map((item) => item.productId).join(",");
  useEffect(() => {
    if (!ready) return;
    void syncPrices();
  }, [ready, productKey, syncPrices]);

  useEffect(() => {
    if (!ready) return;
    const onFocus = () => void syncPrices();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [ready, syncPrices]);

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
