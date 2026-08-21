import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

import { requireAdminApi } from "@/lib/auth/admin";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export async function POST(request: Request) {
  try {
    await requireAdminApi();
    const supabase = createSupabaseServiceClient();
    if (!supabase) throw new Error("Supabase service role is not configured.");

    const body = await request.json();
    
    // Convert to snake_case for Supabase
    const payload = {
      title: body.title,
      image_url: body.imageUrl,
      link_url: body.linkUrl,
      sort_order: body.sortOrder,
      is_active: body.isActive,
    };

    const { error } = await supabase.from("event_banners").insert([payload]);
    if (error) throw error;

    revalidateTag("event-banners");
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create event banner" },
      { status: 500 },
    );
  }
}
