import "server-only";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL, assertSupabaseEnv } from "@/lib/env";

// Client không có phiên (vai trò anon). Dùng cho dữ liệu công khai, đặt được trong "use cache".
export function createPublicClient() {
  assertSupabaseEnv();
  return createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
