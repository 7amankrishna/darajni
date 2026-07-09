"use client";

import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import Link from "next/link";

import { useCart } from "@/components/cart/cart-provider";
import { ProductImage } from "@/components/product/product-image";
import { formatPrice } from "@/config/site";
import type { StoreSettings } from "@/types/commerce";

export function CartPage({ settings }: { settings: StoreSettings }) {
  const {
    items,
    ready,
    subtotal,
    updateQuantity,
    removeItem,
    clearCart,
  } = useCart();
  const shipping = items.length ? settings.shippingCharge : 0;
  const tax = Math.round(subtotal * (settings.taxRate / 100) * 100) / 100;
  const total = subtotal + shipping + tax;

  if (!ready) {
    return (
      <main className="grid min-h-[65vh] place-items-center">
        <p className="eyebrow">Loading your cart…</p>
      </main>
    );
  }

  if (!items.length) {
    return (
      <main className="grid min-h-[65vh] place-items-center px-4 text-center">
        <div>
          <ShoppingBag className="mx-auto h-10 w-10 text-[#caaa70]" />
          <h1 className="font-display mt-5 text-5xl">Your cart is empty.</h1>
          <p className="mt-4 text-sm text-white/80">
            Find a piece you love and it will appear here.
          </p>
          <Link href="/#collection" className="primary-button mt-7">
            Browse collection
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="py-12 sm:py-16">
      <div className="section-shell">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Your selection</p>
            <h1 className="font-display mt-3 text-5xl sm:text-6xl">Shopping cart</h1>
          </div>
          <button
            type="button"
            onClick={clearCart}
            className="text-xs font-bold uppercase tracking-wider text-white/75 hover:text-red-300"
          >
            Clear cart
          </button>
        </div>

        <div className="mt-9 grid gap-8 lg:grid-cols-[1fr_380px]">
          <div className="space-y-4">
            {items.map((item) => (
              <article
                key={item.key}
                className="glass-panel flex gap-4 p-4 sm:gap-6 sm:p-5"
              >
                <Link
                  href={`/design/${item.slug}`}
                  className="relative h-36 w-24 shrink-0 overflow-hidden rounded-xl bg-black sm:h-44 sm:w-32"
                >
                  <ProductImage
                    src={item.image}
                    alt={item.name}
                    sizes="128px"
                    className="object-cover"
                  />
                </Link>
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Link
                        href={`/design/${item.slug}`}
                        className="font-display text-2xl leading-tight hover:text-[#dfc184]"
                      >
                        {item.name}
                      </Link>
                      <p className="mt-2 text-xs text-white/75">Size: {item.size}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(item.key)}
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-white/75 hover:bg-red-400/10 hover:text-red-300"
                      aria-label={`Remove ${item.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-auto flex items-end justify-between gap-3">
                    <div className="flex items-center rounded-full border border-white/12">
                      <button
                        type="button"
                        onClick={() =>
                          updateQuantity(item.key, item.quantity - 1)
                        }
                        className="grid h-10 w-10 place-items-center"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="min-w-8 text-center text-sm">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          updateQuantity(item.key, item.quantity + 1)
                        }
                        className="grid h-10 w-10 place-items-center"
                        aria-label="Increase quantity"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <p className="font-display text-xl text-[#dfc184]">
                      {formatPrice(item.unitPrice * item.quantity)}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <aside className="glass-panel h-fit p-6 lg:sticky lg:top-24">
            <p className="eyebrow">Order summary</p>
            <div className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between text-white/55">
                <span>Subtotal</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between text-white/55">
                <span>Shipping</span>
                <span>{shipping ? formatPrice(shipping) : "Free"}</span>
              </div>
              <div className="flex justify-between text-white/55">
                <span>Tax ({settings.taxRate}%)</span>
                <span>{formatPrice(tax)}</span>
              </div>
            </div>
            <div className="my-5 h-px bg-white/10" />
            <div className="flex items-end justify-between">
              <span className="text-sm font-semibold">Estimated total</span>
              <span className="font-display text-3xl text-[#dfc184]">
                {formatPrice(total)}
              </span>
            </div>
            <p className="mt-3 text-xs leading-5 text-white/75">
              Inventory and final totals are verified securely during checkout.
            </p>
            <Link href="/checkout" className="primary-button mt-6 w-full">
              Continue to checkout
            </Link>
            <Link href="/#collection" className="secondary-button mt-3 w-full">
              Continue shopping
            </Link>
          </aside>
        </div>
      </div>
    </main>
  );
}
