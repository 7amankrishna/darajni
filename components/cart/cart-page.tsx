"use client";

import {
  Loader2,
  MessageCircle,
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type MouseEvent, useState } from "react";

import { useCart } from "@/components/cart/cart-provider";
import { ProductImage } from "@/components/product/product-image";
import { formatPrice } from "@/config/site";
import type { StoreSettings } from "@/types/commerce";

declare global {
  interface Window {
    HeadlessCheckout?: {
      addToCart: (
        event: Event,
        token: string,
        options: { fallbackUrl: string },
      ) => void;
    };
  }
}

function prepareShiprocketCheckout() {
  let sellerDomain = document.getElementById("sellerDomain") as
    | HTMLInputElement
    | null;
  if (!sellerDomain) {
    sellerDomain = document.createElement("input");
    sellerDomain.type = "hidden";
    sellerDomain.id = "sellerDomain";
    document.body.appendChild(sellerDomain);
  }
  sellerDomain.value = window.location.host;

  if (!document.querySelector('link[data-shiprocket-checkout="styles"]')) {
    const styles = document.createElement("link");
    styles.rel = "stylesheet";
    styles.href = "https://checkout-ui.shiprocket.com/assets/styles/shopify.css";
    styles.dataset.shiprocketCheckout = "styles";
    document.head.appendChild(styles);
  }

  if (window.HeadlessCheckout) return Promise.resolve();
  const existing = document.querySelector(
    'script[data-shiprocket-checkout="script"]',
  ) as HTMLScriptElement | null;
  if (existing) {
    return new Promise<void>((resolve, reject) => {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Script failed.")), {
        once: true,
      });
    });
  }

  return new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout-ui.shiprocket.com/assets/js/channels/custom.js";
    script.async = true;
    script.dataset.shiprocketCheckout = "script";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Script failed."));
    document.body.appendChild(script);
  });
}

export function CartPage({ settings }: { settings: StoreSettings }) {
  const router = useRouter();
  const {
    items,
    ready,
    subtotal,
    updateQuantity,
    removeItem,
    clearCart,
  } = useCart();
  const [shiprocketBusy, setShiprocketBusy] = useState(false);
  const shipping = items.length ? settings.shippingCharge : 0;
  const tax = Math.round(subtotal * (settings.taxRate / 100) * 100) / 100;
  const total = subtotal + shipping + tax;

  const useManualCheckout = () => router.push("/checkout?shiprocket=fallback");

  const startShiprocketCheckout = async (event: MouseEvent<HTMLButtonElement>) => {
    if (shiprocketBusy) return;
    setShiprocketBusy(true);
    try {
      const response = await fetch("/api/shiprocket/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((item) => ({
            productId: item.productId,
            size: item.size,
            quantity: item.quantity,
          })),
        }),
      });
      const result = (await response.json()) as { token?: string };
      if (!response.ok || !result.token) {
        console.error(
          "[shiprocket-checkout] token request failed",
          response.status,
          result,
        );
        throw new Error(`Checkout unavailable (HTTP ${response.status}).`);
      }

      await prepareShiprocketCheckout();
      if (!window.HeadlessCheckout) {
        throw new Error("HeadlessCheckout SDK unavailable.");
      }

      window.HeadlessCheckout.addToCart(event.nativeEvent, result.token, {
        fallbackUrl: `${window.location.origin}/checkout?shiprocket=fallback`,
      });
      setShiprocketBusy(false);
    } catch (error) {
      console.error("[shiprocket-checkout] failed, falling back to manual", error);
      useManualCheckout();
    }
  };

  if (!ready) {
    return (
      <main className="grid min-h-[65vh] place-items-center bg-background">
        <p className="eyebrow">Loading your cart...</p>
      </main>
    );
  }

  if (!items.length) {
    return (
      <main className="grid min-h-[65vh] place-items-center bg-background px-4 text-center">
        <div className="max-w-xl">
          <ShoppingBag className="mx-auto h-11 w-11 text-accent" />
          <h1 className="font-display mt-5 text-5xl leading-none text-text-primary sm:text-6xl">
            Your cart is waiting for something beautiful.
          </h1>
          <p className="mt-4 text-sm leading-7 text-text-secondary">
            Browse DARAJNI&apos;s current collection and choose your
            custom-fit outfit.
          </p>
          <Link href="/collection" className="primary-button mt-7">
            Shop Collection
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="bg-background py-12 sm:py-16">
      <div className="section-shell">
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
          <div>
            <p className="eyebrow">Your selection</p>
            <h1 className="font-display mt-3 text-5xl leading-none text-text-primary sm:text-6xl">
              Shopping cart
            </h1>
          </div>
          <button
            type="button"
            onClick={clearCart}
            className="text-xs font-extrabold uppercase text-text-secondary hover:text-red-700"
          >
            Clear cart
          </button>
        </div>

        <div className="mt-9 grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)]">
          <div className="space-y-4">
            {items.map((item) => (
              <article
                key={item.key}
                className="rounded-2xl border border-border bg-surface p-4 shadow-[0_18px_50px_rgba(83,54,22,0.07)] sm:flex sm:gap-6 sm:p-5"
              >
                <Link
                  href={`/design/${item.slug}`}
                  className="relative shrink-0 flex-shrink-0 w-24 h-24 sm:w-32 sm:h-32 overflow-hidden rounded-xl bg-surface-alt mx-4"
                >
                  <ProductImage
                    src={item.image}
                    alt={item.name}
                    sizes="(max-width: 640px) 100vw, 80px"
                    className="object-cover w-full h-full"
                  />
                </Link>
                <div className="mt-4 flex min-w-0 flex-1 flex-col sm:mt-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        href={`/design/${item.slug}`}
                        className="font-display text-3xl leading-tight text-text-primary hover:text-accent"
                      >
                        {item.name}
                      </Link>
                      <p className="mt-2 text-xs font-semibold text-text-secondary">
                        Size: {item.size}
                      </p>
                      <p className="mt-2 rounded-xl bg-surface-alt px-3 py-2 text-xs leading-5 text-text-secondary">
                        Measurements will be collected after order.
                      </p>
                      <p className="mt-2 text-xs font-semibold text-accent">
                        Only {item.stock} available
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(item.key)}
                      className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-text-secondary hover:bg-red-50 hover:text-red-700"
                      aria-label={`Remove ${item.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-5 flex items-end justify-between gap-3 sm:mt-auto">
                    <div className="flex items-center rounded-xl border border-border bg-white">
                      <button
                        type="button"
                        onClick={() =>
                          updateQuantity(item.key, item.quantity - 1)
                        }
                        className="grid h-11 w-11 place-items-center text-text-secondary"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="min-w-8 text-center text-sm font-semibold">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          updateQuantity(item.key, item.quantity + 1)
                        }
                        className="grid h-11 w-11 place-items-center text-text-secondary"
                        aria-label="Increase quantity"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <p className="shrink-0 font-display text-2xl font-semibold text-text-primary">
                      {formatPrice(item.unitPrice * item.quantity)}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <aside className="h-fit rounded-2xl border border-border bg-surface p-6 shadow-[0_18px_50px_rgba(83,54,22,0.08)] lg:sticky lg:top-32">
            <p className="eyebrow">Order summary</p>
            <div className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between text-text-secondary">
                <span>Subtotal</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between text-text-secondary">
                <span>Shipping</span>
                <span>{shipping ? formatPrice(shipping) : "Free"}</span>
              </div>
              <div className="flex justify-between text-text-secondary">
                <span>Discount/coupon</span>
                <span>Apply at checkout</span>
              </div>
              <div className="flex justify-between text-text-secondary">
                <span>Tax ({settings.taxRate}%)</span>
                <span>{formatPrice(tax)}</span>
              </div>
            </div>
            <div className="my-5 h-px bg-[#E9DCCB]" />
            <div className="flex items-end justify-between">
              <span className="text-sm font-semibold text-text-primary">Estimated total</span>
              <span className="font-display text-3xl font-semibold text-text-primary">
                {formatPrice(total)}
              </span>
            </div>
            <p className="mt-3 text-xs leading-5 text-text-secondary">
              COD/online payment availability and final totals are verified
              securely during checkout.
            </p>
            <button
              type="button"
              onClick={(event) => void startShiprocketCheckout(event)}
              disabled={shiprocketBusy}
              className="primary-button mt-6 w-full"
            >
              {shiprocketBusy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Opening secure checkout...
                </>
              ) : (
                "Checkout with Shiprocket"
              )}
            </button>
            <Link href="/checkout" className="secondary-button mt-3 w-full">
              Checkout manually
            </Link>
            <Link href="/collection" className="secondary-button mt-3 w-full">
              Continue shopping
            </Link>
            <div className="mt-5 rounded-xl bg-surface-alt p-4 text-center text-xs font-semibold text-text-secondary">
              Secure checkout | Pan-India delivery | WhatsApp support
            </div>
            <Link href="/support" className="secondary-button mt-3 w-full">
              <MessageCircle className="h-4 w-4" />
              Need help?
            </Link>
          </aside>
        </div>
      </div>
    </main>
  );
}
