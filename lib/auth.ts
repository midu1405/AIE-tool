import "server-only";
import { createClient } from "@/lib/supabase/server";

export type Role = "admin" | "content_manager" | "khbd_editor" | "reviewer";
export type CurrentUser = { id: string; email: string; name: string; roles: Role[] };

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Quản trị",
  content_manager: "Academic lead",
  khbd_editor: "Soạn KHBD",
  reviewer: "Duyệt bài",
};

/** Người đang đăng nhập (đã xác thực với Supabase Auth), hoặc null. Đọc cookie: gọi trong <Suspense>. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  const u = data.user;
  const [{ data: profile }, { data: roles }] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", u.id).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", u.id),
  ]);
  const meta = u.user_metadata as { full_name?: string; name?: string } | undefined;
  return {
    id: u.id,
    email: u.email ?? "",
    name: profile?.full_name || meta?.full_name || meta?.name || u.email || "Người dùng",
    roles: (roles ?? []).map((r: { role: Role }) => r.role),
  };
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  const pick = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : parts[0].slice(0, 2);
  return pick.toUpperCase();
}
