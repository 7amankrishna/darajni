import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

import { requireAdminApi } from "@/lib/auth/admin";
import { deleteMediaUrls } from "@/lib/storage";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export async function PUT(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    await requireAdminApi();
    const supabase = createSupabaseServiceClient();
    if (!supabase) throw new Error("Supabase service role is not configured.");

    const { id } = params;
    const body = await request.json();

    const { data: current } = await supabase
      .from("event_banners")
      .select("image_url")
      .eq("id", id)
      .single();

    // Convert to snake_case for Supabase
    const payload = {
      title: body.title,
      image_url: body.imageUrl,
      link_url: body.linkUrl,
      sort_order: body.sortOrder,
      is_active: body.isActive,
    };

    const { error } = await supabase
      .from("event_banners")
      .update(payload)
      .eq("id", id);
    if (error) throw error;

    if (current?.image_url && current.image_url !== payload.image_url) {
      // Clean up orphaned image
      await deleteMediaUrls(supabase, [current.image_url]);
    }

    revalidateTag("event-banners");
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update event banner" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    await requireAdminApi();
    const supabase = createSupabaseServiceClient();
    if (!supabase) throw new Error("Supabase service role is not configured.");

    const { id } = params;
    const { data: current } = await supabase
      .from("event_banners")
      .select("image_url")
      .eq("id", id)
      .single();

    const { error } = await supabase
      .from("event_banners")
      .delete()
      .eq("id", id);
    if (error) throw error;

    if (current?.image_url) {
      await deleteMediaUrls(supabase, [current.image_url]);
    }

    revalidateTag("event-banners");
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete event banner" },
      { status: 500 },
    );
  }
}
