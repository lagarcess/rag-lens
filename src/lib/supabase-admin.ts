import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdminEnv } from "./env";
import { assertServerRuntime } from "./server-runtime";

assertServerRuntime();

export function createSupabaseAdminClient() {
  const env = getSupabaseAdminEnv();

  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
