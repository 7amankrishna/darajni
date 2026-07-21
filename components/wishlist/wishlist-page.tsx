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
      <main className="grid min-h-[65vh] place-items-center bg-[#FFF8EF]">
        <p className="eyebrow">Loading wishlist...</p>
      </main>
    );
  }

  return (
    <main className="min-h-[70vh] bg-[#FFF8EF] py-14 sm:py-20">
      <div className="section-shell">
        <div className="mx-auto max-w-2xl text-center">
          <Heart className="mx-auto h-10 w-10 text-[#B8893B]" />
          <p className="eyebrow mt-5">Wishlist</p>
          <h1 className="font-display mt-4 text-5xl leading-none text-[#171717] sm:text-6xl">
            Saved designs
          </h1>
          <p className="mt-5 text-sm leading-7 text-[#6F6255]">
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
          <div className="mx-auto mt-10 max-w-xl rounded-2xl border border-[#E9DCCB] bg-[#FFFDF8] p-8 text-center">
            <ShoppingBag className="mx-auto h-10 w-10 text-[#B8893B]" />
            <h2 className="font-display mt-5 text-4xl leading-none text-[#171717]">
              No saved designs yet.
            </h2>
            <p className="mt-4 text-sm leading-7 text-[#6F6255]">
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
