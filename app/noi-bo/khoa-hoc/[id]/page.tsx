import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CourseStudio, type EditorMaterial, type LibraryItem, type StudioCourse, type StudioModule } from "@/components/courses/CourseStudio";
import { getCurrentUser } from "@/lib/auth";
import { canPublish, getAdminCourses } from "@/lib/course-admin-data";
import { LIST_STATUS, type ListStatus } from "@/lib/khbd";
import { asKind, type QuizKey, type StepBody } from "@/lib/steps";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Soạn nội dung khoá học" };

// Màn soạn nội dung một khoá (design/artboards/SoanNoiDung.dc.html).
export default function Page({ params }: PageProps<"/noi-bo/khoa-hoc/[id]">) {
  return (
    <Suspense fallback={<p className="text-muted">Đang tải khoá học…</p>}>
      <Body params={params} />
    </Suspense>
  );
}

const DV_DOC = "documents!document_versions_document_id_fkey";
type DocRef = { title: string; kind: "khbd" | "pbt"; grade: number } | null;
type RawMat = { id: string; label: string | null; position: number; document_id: string; document_versions: { version_no: number; documents: DocRef } | null };
type RawStep = { id: string; title: string; position: number; duration_minutes: number | null; kind: string; ready: boolean; lesson_materials: RawMat[] };
type RawSection = { id: string; title: string; position: number; course_lessons: RawStep[] };
type RawModule = { id: string; title: string; position: number; course_sections: RawSection[] };
const byPos = <T extends { position: number }>(xs: T[] | null | undefined) => [...(xs ?? [])].sort((a, b) => a.position - b.position);

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
        `id, title, position, course_sections(id, title, position, course_lessons(id, title, position, duration_minutes, kind, ready, lesson_materials(id, label, position, document_id, document_versions(version_no, ${DV_DOC}(title, kind, grade)))))`,
      )
      .eq("course_id", id)
      .order("position"),
    supabase.from("lesson_material_updates").select("material_id, latest_version_id, latest_version"),
    supabase.from("document_versions").select(`id, version_no, document_id, ${DV_DOC}(title, kind, grade)`).eq("status", "approved"),
    supabase.from("khbd_list").select("id, title, grade, list_status, version_no"),
  ]);
  if (!course) notFound();

  const raw = (modules ?? []) as unknown as RawModule[];
  const stepIds = raw.flatMap((m) => m.course_sections.flatMap((s) => s.course_lessons.map((l) => l.id)));
  const [{ data: contents }, { data: keys }] = stepIds.length
    ? await Promise.all([
        supabase.from("lesson_contents").select("lesson_id, body, updated_at").in("lesson_id", stepIds),
        supabase.from("quiz_keys").select("lesson_id, answers, explains").in("lesson_id", stepIds),
      ])
    : [{ data: [] }, { data: [] }];
  const body = new Map(((contents ?? []) as { lesson_id: string; body: StepBody; updated_at: string }[]).map((c) => [c.lesson_id, c]));
  const key = new Map(((keys ?? []) as ({ lesson_id: string } & QuizKey)[]).map((k) => [k.lesson_id, { answers: k.answers, explains: k.explains }]));
  const upd = new Map(((updates ?? []) as { material_id: string; latest_version_id: string; latest_version: number }[]).map((u) => [u.material_id, u]));

  const mods: StudioModule[] = byPos(raw).map((m) => ({
    id: m.id,
    title: m.title,
    position: m.position,
    sections: byPos(m.course_sections).map((s) => ({
      id: s.id,
      title: s.title,
      position: s.position,
      steps: byPos(s.course_lessons).map((l) => ({
        id: l.id,
        title: l.title,
        kind: asKind(l.kind),
        mins: l.duration_minutes,
        ready: l.ready,
        position: l.position,
        body: body.get(l.id)?.body ?? {},
        key: key.get(l.id) ?? null,
        stamp: [l.title, l.kind, l.ready, l.duration_minutes, body.get(l.id)?.updated_at ?? "", l.lesson_materials.length].join("|"),
        materials: byPos(l.lesson_materials).map(
          (mt): EditorMaterial => ({
            id: mt.id,
            documentId: mt.document_id,
            kind: mt.document_versions?.documents?.kind ?? "khbd",
            title: mt.document_versions?.documents?.title ?? "Tài liệu",
            grade: mt.document_versions?.documents?.grade ?? null,
            versionNo: mt.document_versions?.version_no ?? 0,
            update: upd.get(mt.id) ? { versionId: upd.get(mt.id)!.latest_version_id, versionNo: upd.get(mt.id)!.latest_version } : null,
          }),
        ),
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
    lib.set(d.id, { documentId: d.id, kind: "khbd", title: d.title, grade: d.grade, versionId: null, versionNo: d.version_no, state: `${LIST_STATUS[d.list_status].label}, chưa gắn được` });
  }

  const roles = user?.roles ?? [];
  const c = course as StudioCourse;
  return (
    <CourseStudio
      course={{ ...c, hours_min: Number(c.hours_min), hours_max: Number(c.hours_max), prerequisites: c.prerequisites ?? [], materials_needed: c.materials_needed ?? [] }}
      modules={mods}
      library={[...lib.values()].sort((a, b) => Number(!!b.versionId) - Number(!!a.versionId) || a.title.localeCompare(b.title, "vi"))}
      canPublish={canPublish(roles)}
      canEdit={canPublish(roles) || (roles.includes("khbd_editor") && c.status === "draft")}
      learnerCount={courses.find((x) => x.id === id)?.learner_count ?? 0}
    />
  );
}
