"use client";

import { MessageCircle, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
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
      <main className="grid min-h-[65vh] place-items-center bg-[#FFF8EF]">
        <p className="eyebrow">Loading your cart...</p>
      </main>
    );
  }

  if (!items.length) {
    return (
      <main className="grid min-h-[65vh] place-items-center bg-[#FFF8EF] px-4 text-center">
        <div className="max-w-xl">
          <ShoppingBag className="mx-auto h-11 w-11 text-[#B8893B]" />
          <h1 className="font-display mt-5 text-5xl leading-none text-[#171717] sm:text-6xl">
            Your cart is waiting for something beautiful.
          </h1>
          <p className="mt-4 text-sm leading-7 text-[#6F6255]">
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
    <main className="bg-[#FFF8EF] py-12 sm:py-16">
      <div className="section-shell">
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
          <div>
            <p className="eyebrow">Your selection</p>
            <h1 className="font-display mt-3 text-5xl leading-none text-[#171717] sm:text-6xl">
              Shopping cart
            </h1>
          </div>
          <button
            type="button"
            onClick={clearCart}
            className="text-xs font-extrabold uppercase text-[#6F6255] hover:text-red-700"
          >
            Clear cart
          </button>
        </div>

        <div className="mt-9 grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)]">
          <div className="space-y-4">
            {items.map((item) => (
              <article
                key={item.key}
                className="rounded-2xl border border-[#E9DCCB] bg-[#FFFDF8] p-4 shadow-[0_18px_50px_rgba(83,54,22,0.07)] sm:flex sm:gap-6 sm:p-5"
              >
                <Link
                  href={`/design/${item.slug}`}
                  className="relative block h-56 w-full overflow-hidden rounded-xl bg-[#F6E9DD] sm:h-44 sm:w-32 sm:shrink-0"
                >
                  <ProductImage
                    src={item.image}
                    alt={item.name}
                    sizes="(max-width: 640px) 100vw, 128px"
                    className="object-cover"
                  />
                </Link>
                <div className="mt-4 flex min-w-0 flex-1 flex-col sm:mt-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        href={`/design/${item.slug}`}
                        className="font-display text-3xl leading-tight text-[#171717] hover:text-[#6E0F1A]"
                      >
                        {item.name}
                      </Link>
                      <p className="mt-2 text-xs font-semibold text-[#6F6255]">
                        Size: {item.size}
                      </p>
                      <p className="mt-2 rounded-xl bg-[#F6E9DD] px-3 py-2 text-xs leading-5 text-[#5F5348]">
                        Measurements will be collected after order.
                      </p>
                      <p className="mt-2 text-xs font-semibold text-[#6E0F1A]">
                        Only {item.stock} available
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(item.key)}
                      className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-[#6F6255] hover:bg-red-50 hover:text-red-700"
                      aria-label={`Remove ${item.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-5 flex items-end justify-between gap-3 sm:mt-auto">
                    <div className="flex items-center rounded-xl border border-[#E9DCCB] bg-white">
                      <button
                        type="button"
                        onClick={() =>
                          updateQuantity(item.key, item.quantity - 1)
                        }
                        className="grid h-11 w-11 place-items-center text-[#5F5348]"
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
                        className="grid h-11 w-11 place-items-center text-[#5F5348]"
                        aria-label="Increase quantity"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <p className="shrink-0 font-display text-2xl font-semibold text-[#171717]">
                      {formatPrice(item.unitPrice * item.quantity)}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <aside className="h-fit rounded-2xl border border-[#E9DCCB] bg-[#FFFDF8] p-6 shadow-[0_18px_50px_rgba(83,54,22,0.08)] lg:sticky lg:top-32">
            <p className="eyebrow">Order summary</p>
            <div className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between text-[#6F6255]">
                <span>Subtotal</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between text-[#6F6255]">
                <span>Shipping</span>
                <span>{shipping ? formatPrice(shipping) : "Free"}</span>
              </div>
              <div className="flex justify-between text-[#6F6255]">
                <span>Discount/coupon</span>
                <span>Apply at checkout</span>
              </div>
              <div className="flex justify-between text-[#6F6255]">
                <span>Tax ({settings.taxRate}%)</span>
                <span>{formatPrice(tax)}</span>
              </div>
            </div>
            <div className="my-5 h-px bg-[#E9DCCB]" />
            <div className="flex items-end justify-between">
              <span className="text-sm font-semibold text-[#171717]">Estimated total</span>
              <span className="font-display text-3xl font-semibold text-[#171717]">
                {formatPrice(total)}
              </span>
            </div>
            <p className="mt-3 text-xs leading-5 text-[#6F6255]">
              COD/online payment availability and final totals are verified
              securely during checkout.
            </p>
            <Link href="/checkout" className="primary-button mt-6 w-full">
              Proceed to Checkout
            </Link>
            <Link href="/collection" className="secondary-button mt-3 w-full">
              Continue shopping
            </Link>
            <div className="mt-5 rounded-xl bg-[#F6E9DD] p-4 text-center text-xs font-semibold text-[#5F5348]">
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
