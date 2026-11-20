import { Suspense } from "react";
import { CreateKhbd } from "@/components/khbd/CreateKhbd";
import type { CurriculumLesson } from "@/lib/khbd";
import { createClient } from "@/lib/supabase/server";
import { pageLead, pageTitle } from "@/lib/ui";

export const metadata = { title: "Tạo KHBD" };

export default function Page() {
  return (
    <>
      <div className="flex flex-col gap-2">
        <h1 className={pageTitle}>Tạo kế hoạch bài dạy</h1>
        <p className={pageLead}>
          Claude soạn theo skill aca-khbd-ai12 v6, đối chiếu QĐ 2422 và CV 5588. Giai đoạn 1 tạo KHBD và spec PBT; phiếu bài tập chỉ dựng
          sau khi KHBD được duyệt.
        </p>
      </div>
      <Suspense fallback={<p className="text-muted">Đang tải kho học liệu…</p>}>
        <Body />
      </Suspense>
    </>
  );
}

async function Body() {
  const supabase = await createClient();
  const [{ data: lessons, error }, { data: docs }] = await Promise.all([
    supabase.from("curriculum_lessons").select("id, level, grade, topic_no, topic_name, lesson_no, title, periods"),
    supabase.from("khbd_list").select("curriculum_lesson_id, version_no").not("curriculum_lesson_id", "is", null),
  ]);
  if (error) {
    return (
      <p role="alert" className="rounded-lg bg-err-soft px-4 py-3 text-sm text-err">
        Không tải được kho học liệu: {error.message}. Tải lại trang; nếu vẫn lỗi, báo quản trị.
      </p>
    );
  }
  const latest: Record<string, number> = {};
  for (const d of (docs ?? []) as { curriculum_lesson_id: string; version_no: number | null }[]) {
    if (d.version_no) latest[d.curriculum_lesson_id] = Math.max(latest[d.curriculum_lesson_id] ?? 0, d.version_no);
  }
  return <CreateKhbd lessons={(lessons ?? []) as CurriculumLesson[]} latestVersion={latest} />;
}
