import "server-only";

import type { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export interface AdminSession {
  user: User;
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const authClient = await createSupabaseServerClient();
  if (!authClient) return null;

  const {
    data: { user },
    error,
  } = await authClient.auth.getUser();
  if (error || !user) return null;

  const serviceClient = createSupabaseServiceClient();
  if (!serviceClient) return null;

  const { data: admin } = await serviceClient
    .from("admin_users")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  return admin ? { user } : null;
}

export async function requireAdminPage(): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  return session;
}

export async function requireAdminApi(): Promise<AdminSession | null> {
  return getAdminSession();
}
