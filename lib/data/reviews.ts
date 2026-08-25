import "server-only";

import { createClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";

import type { ProductReview } from "@/types/commerce";

function createPublicClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) return null;

  return createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function mapProductReview(row: Record<string, unknown>): ProductReview {
  return {
    id: String(row.id),
    productId: String(row.product_id),
    userName: String(row.user_name || "DARAJNI Customer"),
    rating: Math.min(5, Math.max(1, Number(row.rating) || 0)),
    comment: row.comment ? String(row.comment) : null,
    createdAt: String(row.created_at),
  };
}

export const getProductReviews = unstable_cache(
  async (productId: string): Promise<ProductReview[]> => {
    if (!/^[0-9a-f-]{36}$/i.test(productId)) return [];

    const supabase = createPublicClient();
    if (!supabase) return [];

    const { data, error } = await supabase
      .from("product_reviews")
      .select("id, product_id, user_name, rating, comment, created_at")
      .eq("product_id", productId)
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Product reviews query failed", error.message);
      return [];
    }

    return (data ?? []).map((row) =>
      mapProductReview(row as unknown as Record<string, unknown>),
    );
  },
  ["product-reviews"],
  { revalidate: 60, tags: ["product-reviews"] },
);
