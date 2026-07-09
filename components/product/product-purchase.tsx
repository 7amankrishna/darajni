"use client";

import { Minus, Plus, ShoppingBag, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { useCart } from "@/components/cart/cart-provider";
import { formatPrice } from "@/config/site";
import { getProductPrice } from "@/lib/commerce";
import type { Product } from "@/types/commerce";

export function ProductPurchase({ product }: { product: Product }) {
  const router = useRouter();
  const { addItem } = useCart();
  const [size, setSize] = useState(product.sizes[0] ?? "Custom");
  const [quantity, setQuantity] = useState(1);
  const price = getProductPrice(product);
  const soldOut = product.stock < 1;

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
    <div>
      <div>
        <span className="field-label">Select size</span>
        <div className="flex flex-wrap gap-2">
          {product.sizes.map((option) => (
            <button
              type="button"
              key={option}
              onClick={() => setSize(option)}
              className={`min-h-10 rounded-full border px-4 text-xs font-semibold transition ${
                option === size
                  ? "border-[#caaa70] bg-[#caaa70] text-black"
                  : "border-white/12 text-white/60 hover:border-[#caaa70]/55"
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6">
        <span className="field-label">Quantity</span>
        <div className="flex w-fit items-center rounded-full border border-white/12">
          <button
            type="button"
            onClick={() => setQuantity((value) => Math.max(1, value - 1))}
            className="grid h-11 w-11 place-items-center"
            aria-label="Decrease quantity"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="min-w-10 text-center text-sm">{quantity}</span>
          <button
            type="button"
            onClick={() =>
              setQuantity((value) => Math.min(product.stock, value + 1))
            }
            className="grid h-11 w-11 place-items-center"
            aria-label="Increase quantity"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={add}
          disabled={soldOut}
          className="secondary-button"
        >
          <ShoppingBag className="h-4 w-4" />
          Add to cart
        </button>
        <button
          type="button"
          onClick={buyNow}
          disabled={soldOut}
          className="primary-button"
        >
          <Zap className="h-4 w-4" />
          Buy now
        </button>
      </div>

      <p className="mt-4 text-center text-xs text-white/75">
        {soldOut
          ? "This product is currently sold out."
          : `${product.stock} available · ${formatPrice(price * quantity)} total`}
      </p>
    </div>
  );
}
