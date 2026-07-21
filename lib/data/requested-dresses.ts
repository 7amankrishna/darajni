import "server-only";

import { createClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";

import type { RequestedDress } from "@/types/commerce";

function createPublicClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) return null;

  return createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function mapRequestedDress(
  row: Record<string, unknown>,
): RequestedDress {
  return {
    id: String(row.id),
    imageUrl: String(row.image_url),
    description: row.description ? String(row.description) : null,
    createdAt: String(row.created_at),
  };
}

export const getRequestedDresses = unstable_cache(
  async (): Promise<RequestedDress[]> => {
    const supabase = createPublicClient();
    if (!supabase) return [];

    const { data, error } = await supabase
      .from("requested_dresses")
      .select("id, image_url, description, created_at")
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(12);

    // Keep the homepage available before the migration is applied.
    if (error) return [];
    return (data ?? []).map((row) =>
      mapRequestedDress(row as unknown as Record<string, unknown>),
    );
  },
  ["requested-dresses"],
  { revalidate: 60, tags: ["requested-dresses"] },
);
