"use client";

import { Heart } from "lucide-react";
import { toast } from "sonner";

import { useWishlist } from "@/components/wishlist/wishlist-provider";

export function WishlistButton({ productId, productName }: { productId: string; productName: string }) {
  const { isWishlisted, toggle } = useWishlist();
  const wished = isWishlisted(productId);

  return (
    <button
      type="button"
      onClick={() => {
        const added = toggle(productId);
        toast.success(
          added
            ? `${productName} saved to Wishlist`
            : `${productName} removed from Wishlist`,
        );
      }}
      className={`absolute right-3 top-3 z-10 grid h-10 w-10 place-items-center rounded-full border backdrop-blur-md transition-all duration-200 ${
        wished
          ? "border-[#6E0F1A] bg-[#6E0F1A] text-[#FAF7F2]"
          : "border-white/40 bg-white/70 text-[#111111] hover:bg-white"
      }`}
      aria-label={wished ? `Remove ${productName} from wishlist` : `Add ${productName} to wishlist`}
    >
      <Heart className={`h-4 w-4 ${wished ? "fill-current" : ""}`} />
    </button>
  );
}
