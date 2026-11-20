import "server-only";
import type { AdminCourse } from "@/lib/course-admin";
import { createClient } from "@/lib/supabase/server";

export async function getAdminCourses(): Promise<{ courses: AdminCourse[]; error: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("course_admin_list").select("*").order("updated_at", { ascending: false });
  return {
    courses: ((data ?? []) as AdminCourse[]).map((c) => ({ ...c, hours_min: Number(c.hours_min), hours_max: Number(c.hours_max) })),
    error: error?.message ?? "",
  };
}

export function canPublish(roles: string[]) {
  return roles.includes("admin") || roles.includes("content_manager");
}
export function canCreateCourse(roles: string[]) {
  return canPublish(roles) || roles.includes("khbd_editor");
}
