"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

interface WishlistContextValue {
  ids: string[];
  ready: boolean;
  count: number;
  isWishlisted: (productId: string) => boolean;
  toggle: (productId: string) => boolean;
}

const STORAGE_KEY = "darajni-wishlist-v1";
const WishlistContext = createContext<WishlistContextValue | null>(null);

function readWishlist() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]") as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    return [];
  }
}

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [ids, setIds] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setIds(readWishlist());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  }, [ids, ready]);

  const isWishlisted = useCallback(
    (productId: string) => ids.includes(productId),
    [ids],
  );

  const toggle = useCallback((productId: string) => {
    let nextValue = false;
    setIds((current) => {
      if (current.includes(productId)) {
        nextValue = false;
        return current.filter((id) => id !== productId);
      }
      nextValue = true;
      return [...current, productId];
    });
    return nextValue;
  }, []);

  const value = useMemo<WishlistContextValue>(
    () => ({
      ids,
      ready,
      count: ids.length,
      isWishlisted,
      toggle,
    }),
    [ids, isWishlisted, ready, toggle],
  );

  return (
    <WishlistContext.Provider value={value}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) throw new Error("useWishlist must be used inside WishlistProvider");
  return context;
}
