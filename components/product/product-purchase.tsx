"use client";

import {
  type LucideIcon,
  MessageCircle,
  Minus,
  Plus,
  Ruler,
  ShieldCheck,
  ShoppingBag,
  Truck,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { useCart } from "@/components/cart/cart-provider";
import { formatPrice, whatsappSupportLink } from "@/config/site";
import { getProductPrice } from "@/lib/commerce";
import type { Product, StoreSettings } from "@/types/commerce";

export function ProductPurchase({
  product,
  supportNumber,
  settings,
}: {
  product: Product;
  supportNumber: string;
  settings: StoreSettings;
}) {
  const router = useRouter();
  const { addItem } = useCart();
  const sizeOptions = useMemo(
    () => (product.sizes.length ? product.sizes : ["Custom Size"]),
    [product.sizes],
  );
  const [size, setSize] = useState(sizeOptions[0]);
  const [quantity, setQuantity] = useState(1);
  const price = getProductPrice(product);
  const soldOut = product.stock < 1;
  const whatsappHref = whatsappSupportLink(
    supportNumber,
    `Hello DARAJNI, I need measurement help for ${product.name}.`,
  );
  const trustItems: Array<[string, LucideIcon]> = [
    ["Secure payment", ShieldCheck],
    [settings.codEnabled ? "COD available" : "Online payment", ShoppingBag],
    ["Exchange policy", Ruler],
    [
      settings.shippingCharge > 0
        ? `${formatPrice(settings.shippingCharge)} shipping`
        : "Free shipping",
      Truck,
    ],
  ];

  useEffect(() => {
    if (soldOut) return;

    window.dispatchEvent(
      new CustomEvent("darajni:mobile-purchase-bar", { detail: true }),
    );
    return () => {
      window.dispatchEvent(
        new CustomEvent("darajni:mobile-purchase-bar", { detail: false }),
      );
    };
  }, [soldOut]);

  const add = () => {
    addItem({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      image: product.images[0] || "/logo.webp",
      size,
      quantity,
      unitPrice: price,
      stock: product.stock,
    });
    toast.success(`${product.name} added to your cart`);
  };

  const buyNow = () => {
    add();
    router.push("/checkout");
  };

  return (
    <div className={!soldOut ? "pb-36 md:pb-0" : undefined}>
      <div className="rounded-2xl border border-border bg-surface p-5">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface-alt text-accent">
            <Ruler className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-display text-3xl leading-none text-text-primary">
              Select Your Size
            </h2>
            <p className="mt-2 text-sm leading-6 text-text-secondary">
              After placing your order, our team will contact you for
              measurements. You can also share them directly on WhatsApp.
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {sizeOptions.map((option) => (
            <button
              type="button"
              key={option}
              onClick={() => setSize(option)}
              className={`min-h-11 rounded-xl border px-4 text-xs font-extrabold transition ${
                option === size
                  ? "border-text-primary bg-text-primary text-surface text-white"
                  : "border-border bg-white text-text-secondary hover:border-[#B8893B]"
              }`}
            >
              {option}
            </button>
          ))}
          <Link href="/size-guide" className="secondary-button !min-h-11 !py-2">
            Open Size Guide
          </Link>
          <a href={whatsappHref} className="whatsapp-button !min-h-11 !py-2">
            WhatsApp Measurement Help
          </a>
        </div>

        <div className="mt-5 rounded-xl border border-border bg-background p-4">
          <p className="text-xs font-extrabold uppercase text-accent">
            Custom size measurements to keep ready
          </p>
          <ul className="mt-3 grid gap-2 text-xs leading-5 text-text-secondary sm:grid-cols-2">
            {[
              "Shoulder tip to shoulder tip",
              "Bust, waist and hip around the body",
              "Sleeve length from shoulder point",
              "Blouse or lehenga length to desired hem",
            ].map((item) => (
              <li key={item} className="flex gap-2">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#B8893B]" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-6">
        <span className="field-label">Quantity</span>
        <div className="flex w-fit items-center rounded-xl border border-border bg-surface">
          <button
            type="button"
            onClick={() => setQuantity((value) => Math.max(1, value - 1))}
            className="grid h-11 w-11 place-items-center text-text-secondary"
            aria-label="Decrease quantity"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="min-w-10 text-center text-sm font-semibold">{quantity}</span>
          <button
            type="button"
            onClick={() =>
              setQuantity((value) => Math.min(product.stock, value + 1))
            }
            className="grid h-11 w-11 place-items-center text-text-secondary"
            aria-label="Increase quantity"
            disabled={quantity >= product.stock}
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-8 grid gap-3">
        <button
          type="button"
          onClick={buyNow}
          disabled={soldOut}
          className="primary-button w-full"
        >
          <Zap className="h-4 w-4" />
          Buy Now
        </button>
        <button
          type="button"
          onClick={add}
          disabled={soldOut}
          className="secondary-button w-full"
        >
          <ShoppingBag className="h-4 w-4" />
          Add to Cart
        </button>
        <a href={whatsappHref} className="whatsapp-button w-full">
          <MessageCircle className="h-4 w-4" />
          Chat on WhatsApp
        </a>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2 text-[0.68rem] font-bold text-text-secondary sm:grid-cols-4">
        {trustItems.map(([label, Icon]) => (
          <span key={label} className="flex items-center gap-2 rounded-xl bg-surface-alt p-2">
            <Icon className="h-3.5 w-3.5 text-accent" />
            {label}
          </span>
        ))}
      </div>

      <p className="mt-4 text-center text-xs text-text-secondary">
        {soldOut
          ? "This product is currently sold out."
          : `${product.stock} available · ${formatPrice(price * quantity)} total`}
      </p>

      {!soldOut && (
        <div className="mobile-purchase-bar fixed inset-x-0 bottom-[calc(3.85rem+env(safe-area-inset-bottom))] z-[45] border-t border-border bg-background/95 p-3 shadow-[0_-12px_35px_rgba(83,54,22,0.12)] backdrop-blur-xl md:hidden" onClick={() => router.push('/cart')}>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-[0.65rem] font-bold uppercase text-text-secondary">
                {product.name}
              </p>
              <p className="font-display text-xl font-semibold text-text-primary">
                {formatPrice(price * quantity)}
              </p>
            </div>
            <div className="text-xs text-text-secondary">
              Added to Cart
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
