import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL, assertSupabaseEnv } from "@/lib/env";

// Client theo phiên đăng nhập (đọc cookie). Chỉ gọi bên trong <Suspense>, Route Handler hoặc Server Action.
export async function createClient() {
  assertSupabaseEnv();
  const cookieStore = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(toSet) {
        try {
          toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Gọi từ Server Component thì không ghi được cookie; proxy.ts đã làm mới phiên.
        }
      },
    },
  });
}
