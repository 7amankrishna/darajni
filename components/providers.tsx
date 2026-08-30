"use client";

import { ThemeProvider } from "next-themes";

import { CartProvider } from "@/components/cart/cart-provider";
import { Toaster } from "@/components/ui/sonner";
import { WishlistProvider } from "@/components/wishlist/wishlist-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <CartProvider>
        <WishlistProvider>{children}</WishlistProvider>
      </CartProvider>
      <Toaster richColors position="top-right" />
    </ThemeProvider>
  );
}
