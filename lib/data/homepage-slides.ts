import "server-only";

import { createClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";

import type { HomepageSlide } from "@/types/commerce";
import { normalizeMediaUrl } from "@/lib/media-url";

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

export function mapHomepageSlide(row: Record<string, unknown>): HomepageSlide {
  return {
    id: String(row.id),
    title: String(row.title),
    eyebrow: row.eyebrow ? String(row.eyebrow) : null,
    description: row.description ? String(row.description) : null,
    imageUrl: String(row.image_url),
    videoUrl: normalizeMediaUrl(row.video_url ? String(row.video_url) : null),
    linkUrl: String(row.link_url),
    ctaLabel: String(row.cta_label),
    sortOrder: Number(row.sort_order),
    startsAt: row.starts_at ? String(row.starts_at) : null,
    endsAt: row.ends_at ? String(row.ends_at) : null,
    isActive: Boolean(row.is_active),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export const getActiveHomepageSlides = unstable_cache(
  async (): Promise<HomepageSlide[]> => {
    const supabase = createPublicClient();
    if (!supabase) return [];

    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("homepage_slides")
      .select(
        "id, title, eyebrow, description, image_url, video_url, link_url, cta_label, sort_order, starts_at, ends_at, is_active, created_at, updated_at",
      )
      .eq("is_active", true)
      .or(`starts_at.is.null,starts_at.lte.${now}`)
      .or(`ends_at.is.null,ends_at.gt.${now}`)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    // Deployments made before the accompanying migration should keep the
    // storefront available; the slider simply remains hidden until it exists.
    if (error) return [];

    return (data ?? []).map((row) =>
      mapHomepageSlide(row as unknown as Record<string, unknown>),
    );
  },
  ["homepage-slides"],
  { revalidate: 60, tags: ["homepage-slides"] },
);
