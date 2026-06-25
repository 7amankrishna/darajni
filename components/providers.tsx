"use client";

import { ThemeProvider } from "next-themes";

import { CartProvider } from "@/components/cart/cart-provider";
import { Toaster } from "@/components/ui/sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <CartProvider>{children}</CartProvider>
      <Toaster richColors position="top-right" />
    </ThemeProvider>
  );
}
