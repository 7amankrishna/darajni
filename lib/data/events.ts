import "server-only";

import { createClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";

import type { EventBanner } from "@/types/commerce";

function createPublicClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) return null;

  return createClient(supabaseUrl, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export function mapEventBanner(row: Record<string, unknown>): EventBanner {
  return {
    id: String(row.id),
    title: String(row.title),
    imageUrl: String(row.image_url),
    linkUrl: String(row.link_url),
    sortOrder: Number(row.sort_order),
    isActive: Boolean(row.is_active),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export const getActiveEventBanners = unstable_cache(
  async (): Promise<EventBanner[]> => {
    const supabase = createPublicClient();
    if (!supabase) return [];

    const { data, error } = await supabase
      .from("event_banners")
      .select(
        "id, title, image_url, link_url, sort_order, is_active, created_at, updated_at",
      )
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Failed to fetch event banners:", error);
      return [];
    }

    return (data ?? []).map((row) =>
      mapEventBanner(row as unknown as Record<string, unknown>),
    );
  },
  ["event-banners"],
  { revalidate: 60, tags: ["event-banners"] },
);
