import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AdminCourseList } from "@/components/courses/AdminCourseList";
import { CourseEditor, type EditorCourse, type EditorModule, type LibraryItem } from "@/components/courses/CourseEditor";
import { getCurrentUser } from "@/lib/auth";
import { canPublish, getAdminCourses } from "@/lib/course-admin-data";
import { LIST_STATUS, type ListStatus } from "@/lib/khbd";
import { createClient } from "@/lib/supabase/server";
import { pageTitle } from "@/lib/ui";

export const metadata = { title: "Sửa khoá học" };

export default function Page({ params }: PageProps<"/noi-bo/khoa-hoc/[id]">) {
  return (
    <>
      <h1 className={pageTitle}>Quản lý khoá học</h1>
      <Suspense fallback={<p className="text-muted">Đang tải khoá học…</p>}>
        <Body params={params} />
      </Suspense>
    </>
  );
}

const DV_DOC = "documents!document_versions_document_id_fkey";

async function Body({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const [{ courses }, user, { data: course }, { data: modules }, { data: updates }, { data: approved }, { data: others }] = await Promise.all([
    getAdminCourses(),
    getCurrentUser(),
    supabase.from("courses").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("course_modules")
      .select(
        `id, title, position, course_lessons(id, title, position, duration_minutes, lesson_materials(id, label, position, document_version_id, document_id, document_versions(version_no, ${DV_DOC}(title, kind, grade))))`,
      )
      .eq("course_id", id)
      .order("position"),
    supabase.from("lesson_material_updates").select("material_id, latest_version_id, latest_version"),
    supabase.from("document_versions").select(`id, version_no, document_id, ${DV_DOC}(title, kind, grade)`).eq("status", "approved"),
    supabase.from("khbd_list").select("id, title, grade, list_status, version_no"),
  ]);
  if (!course) notFound();

  type DocRef = { title: string; kind: "khbd" | "pbt"; grade: number } | null;
  const upd = new Map(((updates ?? []) as { material_id: string; latest_version_id: string; latest_version: number }[]).map((u) => [u.material_id, u]));
  const mods: EditorModule[] = ((modules ?? []) as unknown as {
    id: string;
    title: string;
    position: number;
    course_lessons: {
      id: string;
      title: string;
      position: number;
      duration_minutes: number | null;
      lesson_materials: { id: string; label: string | null; position: number; document_version_id: string; document_id: string; document_versions: { version_no: number; documents: DocRef } | null }[];
    }[];
  }[]).map((m) => ({
    id: m.id,
    title: m.title,
    position: m.position,
    lessons: [...m.course_lessons]
      .sort((a, b) => a.position - b.position)
      .map((l) => ({
        id: l.id,
        title: l.title,
        position: l.position,
        durationMinutes: l.duration_minutes,
        materials: [...l.lesson_materials]
          .sort((a, b) => a.position - b.position)
          .map((mt) => ({
            id: mt.id,
            documentId: mt.document_id,
            kind: mt.document_versions?.documents?.kind ?? "khbd",
            title: mt.document_versions?.documents?.title ?? "Tài liệu",
            grade: mt.document_versions?.documents?.grade ?? null,
            versionNo: mt.document_versions?.version_no ?? 0,
            update: upd.get(mt.id) ? { versionId: upd.get(mt.id)!.latest_version_id, versionNo: upd.get(mt.id)!.latest_version } : null,
          })),
      })),
  }));

  // Thư viện học liệu: mỗi tài liệu lấy bản đã duyệt mới nhất; tài liệu chưa có bản duyệt thì hiện lý do không gắn được.
  const lib = new Map<string, LibraryItem>();
  for (const v of (approved ?? []) as unknown as { id: string; version_no: number; document_id: string; documents: DocRef }[]) {
    const cur = lib.get(v.document_id);
    if (!cur || (cur.versionNo ?? 0) < v.version_no) {
      lib.set(v.document_id, {
        documentId: v.document_id,
        kind: v.documents?.kind ?? "khbd",
        title: v.documents?.title ?? "Tài liệu",
        grade: v.documents?.grade ?? null,
        versionId: v.id,
        versionNo: v.version_no,
        state: "Đã duyệt",
      });
    }
  }
  for (const d of (others ?? []) as { id: string; title: string; grade: number; list_status: ListStatus; version_no: number | null }[]) {
    if (lib.has(d.id)) continue;
    lib.set(d.id, {
      documentId: d.id,
      kind: "khbd",
      title: d.title,
      grade: d.grade,
      versionId: null,
      versionNo: d.version_no,
      state: `${LIST_STATUS[d.list_status].label}, chưa gắn được`,
    });
  }

  const roles = user?.roles ?? [];
  const c = course as EditorCourse;
  return (
    <div className="flex flex-wrap items-start gap-6">
      <AdminCourseList courses={courses} activeId={id} />
      <CourseEditor
        course={{ ...c, hours_min: Number(c.hours_min), hours_max: Number(c.hours_max) }}
        modules={mods}
        library={[...lib.values()].sort((a, b) => Number(!!b.versionId) - Number(!!a.versionId) || a.title.localeCompare(b.title, "vi"))}
        canPublish={canPublish(roles)}
        canEdit={canPublish(roles) || (roles.includes("khbd_editor") && c.status === "draft")}
        learnerCount={courses.find((x) => x.id === id)?.learner_count ?? 0}
      />
    </div>
  );
}
