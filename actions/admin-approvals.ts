"use server";

import { revalidatePath, revalidateTag } from "next/cache";

import { requireAdminPage } from "@/lib/auth/admin";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export async function approveRequestedDress(id: string) {
  await requireAdminPage();
  const supabase = createSupabaseServiceClient();
  if (!supabase) throw new Error("Supabase service role is not configured.");

  const { error } = await supabase
    .from("requested_dresses")
    .update({ status: "published" })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidateTag("requested-dresses");
  revalidatePath("/admin");
  revalidatePath("/requested-dresses");
  revalidatePath("/");
}

export async function rejectRequestedDress(id: string) {
  await requireAdminPage();
  const supabase = createSupabaseServiceClient();
  if (!supabase) throw new Error("Supabase service role is not configured.");

  // Fetch storage_path to delete file from Supabase storage bucket
  const { data: dress } = await supabase
    .from("requested_dresses")
    .select("storage_path")
    .eq("id", id)
    .maybeSingle();

  if (dress?.storage_path) {
    const { error: storageError } = await supabase.storage
      .from("requested-dresses")
      .remove([dress.storage_path]);
    if (storageError) {
      console.error("Failed to delete dress image from storage:", storageError.message);
    }
  }

  // Delete database record permanently
  const { error } = await supabase
    .from("requested_dresses")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);

  revalidateTag("requested-dresses");
  revalidatePath("/admin");
  revalidatePath("/requested-dresses");
  revalidatePath("/");
}

export async function approveDressComment(id: string) {
  await requireAdminPage();
  const supabase = createSupabaseServiceClient();
  if (!supabase) throw new Error("Supabase service role is not configured.");

  const { error } = await supabase
    .from("requested_dress_comments")
    .update({ status: "approved" })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}

export async function rejectDressComment(id: string) {
  await requireAdminPage();
  const supabase = createSupabaseServiceClient();
  if (!supabase) throw new Error("Supabase service role is not configured.");

  const { error } = await supabase
    .from("requested_dress_comments")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}
