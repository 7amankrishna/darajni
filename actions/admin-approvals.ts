"use server";

import { revalidatePath } from "next/cache";

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
  revalidatePath("/admin");
}

export async function rejectRequestedDress(id: string) {
  await requireAdminPage();
  const supabase = createSupabaseServiceClient();
  if (!supabase) throw new Error("Supabase service role is not configured.");
  
  const { error } = await supabase
    .from("requested_dresses")
    .update({ status: "rejected" })
    .eq("id", id);
    
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
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
    .update({ status: "rejected" })
    .eq("id", id);
    
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}
