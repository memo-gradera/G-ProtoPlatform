import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export interface SupabaseClientConfig {
  url: string;
  anonKey: string;
}

export function createSupabaseClient(
  config: SupabaseClientConfig,
): SupabaseClient {
  return createClient(config.url, config.anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
}
