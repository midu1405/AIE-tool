import "server-only";
import type { KhbdRow } from "@/lib/khbd";
import { createClient } from "@/lib/supabase/server";

/** Danh sách KHBD (RLS: chỉ nhân viên đọc được). Đọc cookie: gọi trong <Suspense>. */
export async function getKhbdRows(): Promise<{ rows: KhbdRow[]; error: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("khbd_list")
    .select("id, title, grade, topic_name, created_mode, periods, updated_at, current_version_id, version_no, warnings, latest_job_id, list_status")
    .order("updated_at", { ascending: false });
  return { rows: (data ?? []) as KhbdRow[], error: error?.message ?? "" };
}
