"use client";

import { Heart, ShoppingBag } from "lucide-react";
import Link from "next/link";

import DesignCard from "@/components/DesignCard";
import { useWishlist } from "@/components/wishlist/wishlist-provider";
import type { Product } from "@/types/commerce";

export function WishlistPage({ products }: { products: Product[] }) {
  const { ids, ready } = useWishlist();
  const savedProducts = products.filter((product) => ids.includes(product.id));

  if (!ready) {
    return (
      <main className="grid min-h-[65vh] place-items-center bg-white dark:bg-[#100D0B]">
        <p className="eyebrow">Loading wishlist...</p>
      </main>
    );
  }

  return (
    <main className="min-h-[70vh] bg-white dark:bg-[#100D0B] py-14 sm:py-20">
      <div className="section-shell">
        <div className="mx-auto max-w-2xl text-center">
          <Heart className="mx-auto h-10 w-10 text-[#C8A97E]" />
          <p className="eyebrow mt-5">Wishlist</p>
          <h1 className="font-display mt-4 text-5xl leading-none text-[#1E1E1E] dark:text-[#F7EADB] sm:text-6xl">
            Saved designs
          </h1>
          <p className="mt-5 text-sm leading-7 text-[#666666] dark:text-[#B8A898]">
            Your wishlist is saved on this device so you can return to favorite
            designs before ordering.
          </p>
        </div>

        {savedProducts.length ? (
          <div className="mt-10 grid grid-cols-1 gap-5 min-[520px]:grid-cols-2 lg:grid-cols-4">
            {savedProducts.map((product) => (
              <DesignCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="mx-auto mt-10 max-w-xl rounded-2xl border border-[#E8E2DA] dark:border-[#3B3026] bg-white dark:bg-[#1B1612] p-8 text-center">
            <ShoppingBag className="mx-auto h-10 w-10 text-[#C8A97E]" />
            <h2 className="font-display mt-5 text-4xl leading-none text-[#1E1E1E] dark:text-[#F7EADB]">
              No saved designs yet.
            </h2>
            <p className="mt-4 text-sm leading-7 text-[#666666] dark:text-[#B8A898]">
              Tap the heart on any product card to keep it here.
            </p>
            <Link href="/collection" className="primary-button mt-7">
              Browse Collection
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
