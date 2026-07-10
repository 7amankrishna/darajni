import "server-only";

import { createClient } from "@supabase/supabase-js";

import { getSupabaseServiceEnvironment } from "@/lib/config/server-env";

export function createSupabaseServiceClient() {
  const environment = getSupabaseServiceEnvironment();
  if (!environment) return null;

  return createClient(environment.url, environment.serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
