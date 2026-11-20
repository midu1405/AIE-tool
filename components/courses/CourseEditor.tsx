"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { refreshCatalog } from "@/app/noi-bo/khoa-hoc/actions";
import { CourseForm } from "@/components/courses/CourseForm";
import { Icon, ICONS } from "@/components/Icon";
import { Notice, StatusChip } from "@/components/khbd/StatusChip";
import { FORMATS, TOPICS, hoursText, type Audience, type Format, type Level, type Topic } from "@/lib/catalog";
import { COURSE_STATUS, audienceShort, courseSaveError, formToRow, publishHint, type CourseStatus } from "@/lib/course-admin";
import { rpcErrorText } from "@/lib/khbd";
import { getBrowserClient } from "@/lib/supabase/client";
import { btnPrimary, btnSecondary, card, field } from "@/lib/ui";

export type EditorCourse = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  description: string;
  topic: Topic;
  audiences: Audience[];
  hours_min: number;
  hours_max: number;
  format: Format;
  level: Level;
  outcomes: string[];
  audience_note: string;
  status: CourseStatus;
};
export type EditorMaterial = {
  id: string;
  documentId: string;
  kind: "khbd" | "pbt";
  title: string;
  grade: number | null;
  versionNo: number;
  update: { versionId: string; versionNo: number } | null;
};
export type EditorLesson = { id: string; title: string; position: number; durationMinutes: number | null; materials: EditorMaterial[] };
export type EditorModule = { id: string; title: string; position: number; lessons: EditorLesson[] };
export type LibraryItem = {
  documentId: string;
  kind: "khbd" | "pbt";
  title: string;
  grade: number | null;
  versionId: string | null;
  versionNo: number | null;
  state: string;
};

const KIND_LABEL = { khbd: "KHBD", pbt: "PBT" } as const;

// Phần sửa một khoá ở màn Quản lý khoá học (design/artboards/QuanLyKhoaHoc.dc.html).
// Quyền thật nằm ở RLS + trigger; ở đây chỉ ẩn nút cho dễ hiểu.
export function CourseEditor({
  course,
  modules,
  library,
  canPublish,
  canEdit,
  learnerCount,
}: {
  course: EditorCourse;
  modules: EditorModule[];
  library: LibraryItem[];
  canPublish: boolean;
  canEdit: boolean;
  learnerCount: number;
}) {
  const router = useRouter();
  const supabase = getBrowserClient();
  const [editing, setEditing] = useState(false);
  const [picker, setPicker] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<{ id: string; value: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [newModule, setNewModule] = useState("");
  const [newLesson, setNewLesson] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const materialCount = modules.reduce((n, m) => n + m.lessons.reduce((k, l) => k + l.materials.length, 0), 0);

  // Chạy một thay đổi; xong thì làm mới trang (và danh mục công khai nếu khoá đang hiện).
  async function run(fn: () => PromiseLike<{ error: { code?: string; message?: string } | null }>, opts: { catalog?: boolean } = {}) {
    setBusy(true);
    setError("");
    const { error } = await fn();
    if (error) {
      setBusy(false);
      setError(courseSaveError(error) || rpcErrorText(error));
      return false;
    }
    if (opts.catalog || course.status === "published") await refreshCatalog();
    setBusy(false);
    router.refresh();
    return true;
  }

  const nextPos = (list: { position?: number }[]) => (list.length ? Math.max(...list.map((x, i) => x.position ?? i)) + 1 : 0);

  return (
    <section aria-label="Chỉnh sửa khoá học" className="flex min-w-0 flex-[999_1_520px] flex-col gap-4">
      {error && <Notice tone="err">{error}</Notice>}
      {!canEdit && (
        <Notice tone="info">
          {course.status === "draft"
            ? "Bạn đang xem ở chế độ chỉ đọc."
            : "Khoá đã xuất bản hoặc đã ẩn: chỉ Academic lead (Quản lý nội dung) sửa được. Bạn đang xem ở chế độ chỉ đọc."}
        </Notice>
      )}

      <div className={`${card} flex flex-col gap-4 p-6`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h2 className="flex-[1_1_320px] text-xl font-bold">{course.title}</h2>
          <StatusChip chip={COURSE_STATUS[course.status]} />
        </div>
        {editing ? (
          <CourseForm
            initial={{
              title: course.title,
              slug: course.slug,
              summary: course.summary,
              description: course.description,
              topic: course.topic,
              audiences: course.audiences,
              hours_min: String(course.hours_min).replace(".", ","),
              hours_max: String(course.hours_max).replace(".", ","),
              format: course.format,
              level: course.level,
              outcomes: course.outcomes.join("\n"),
              audience_note: course.audience_note,
            }}
            slugLocked={course.status !== "draft" || learnerCount > 0}
            submitLabel="Lưu thông tin"
            onCancel={() => setEditing(false)}
            onSubmit={async (f) => {
              const { error } = await supabase.from("courses").update(formToRow(f)).eq("id", course.id).select("id").single();
              if (error) return courseSaveError(error);
              if (course.status === "published") await refreshCatalog();
              setEditing(false);
              router.refresh();
            }}
          />
        ) : (
          <>
            <dl className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-x-5 gap-y-3 text-sm">
              <Info k="Chủ đề" v={TOPICS[course.topic].label} />
              <Info k="Đối tượng" v={audienceShort(course.audiences)} />
              <Info k="Thời lượng · hình thức" v={`${hoursText(course.hours_min, course.hours_max)} · ${FORMATS[course.format]}`} />
              <Info k="Chứng nhận" v="Chưa cấp ở bản đầu" />
              <Info k="Đường dẫn" v={`/khoa-hoc/${course.slug}`} />
              <Info k="Người đang học" v={String(learnerCount)} />
            </dl>
            {canEdit && (
              <button type="button" onClick={() => setEditing(true)} className={`${btnSecondary} self-start`}>
                Sửa thông tin khoá học
              </button>
            )}
          </>
        )}
      </div>

      <div className={`${card} flex flex-col gap-3.5 p-6`}>
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-lg font-bold">Học phần và học liệu</h2>
          <span className="text-[13px] text-muted">{materialCount} học liệu đã gắn</span>
        </div>
        {modules.length === 0 && <p className="text-sm text-muted">Khoá chưa có học phần. Thêm học phần đầu tiên ở dưới.</p>}
        <ol className="flex flex-col gap-3">
          {modules.map((m, mi) => (
            <li key={m.id} className="flex flex-col gap-2.5 rounded-[10px] border border-line p-4">
              <Row
                title={`Học phần ${mi + 1}. ${m.title}`}
                plainTitle={m.title}
                meta={`${m.lessons.length} bài`}
                bold
                canEdit={canEdit}
                busy={busy}
                first={mi === 0}
                last={mi === modules.length - 1}
                renaming={renaming?.id === m.id ? renaming.value : null}
                confirmDelete={confirmDelete === m.id}
                onMove={(dir) => run(() => supabase.rpc("move_course_item", { p_kind: "module", p_id: m.id, p_dir: dir }))}
                onRenameStart={() => setRenaming({ id: m.id, value: m.title })}
                onRenameChange={(v) => setRenaming({ id: m.id, value: v })}
                onRenameCancel={() => setRenaming(null)}
                onRenameSave={async () => {
                  if (await run(() => supabase.from("course_modules").update({ title: renaming!.value.trim() }).eq("id", m.id))) setRenaming(null);
                }}
                onDelete={async () => {
                  if (confirmDelete !== m.id) return setConfirmDelete(m.id);
                  setConfirmDelete(null);
                  await run(() => supabase.from("course_modules").delete().eq("id", m.id));
                }}
                deleteHint={m.lessons.length ? `Xoá cả ${m.lessons.length} bài?` : "Xoá học phần?"}
              />
              <ul className="flex flex-col gap-2 pl-7">
                {m.lessons.map((l, li) => {
                  const open = picker === l.id;
                  const attachedDocs = new Set(l.materials.map((x) => x.documentId));
                  return (
                    <li key={l.id} className="flex flex-col gap-1.5">
                      <Row
                        title={l.title}
                        plainTitle={l.title}
                        meta={l.durationMinutes ? `${l.durationMinutes} phút` : ""}
                        canEdit={canEdit}
                        busy={busy}
                        first={li === 0}
                        last={li === m.lessons.length - 1}
                        renaming={renaming?.id === l.id ? renaming.value : null}
                        confirmDelete={confirmDelete === l.id}
                        onMove={(dir) => run(() => supabase.rpc("move_course_item", { p_kind: "lesson", p_id: l.id, p_dir: dir }))}
                        onRenameStart={() => setRenaming({ id: l.id, value: l.title })}
                        onRenameChange={(v) => setRenaming({ id: l.id, value: v })}
                        onRenameCancel={() => setRenaming(null)}
                        onRenameSave={async () => {
                          if (await run(() => supabase.from("course_lessons").update({ title: renaming!.value.trim() }).eq("id", l.id))) setRenaming(null);
                        }}
                        onDelete={async () => {
                          if (confirmDelete !== l.id) return setConfirmDelete(l.id);
                          setConfirmDelete(null);
                          await run(() => supabase.from("course_lessons").delete().eq("id", l.id));
                        }}
                        deleteHint="Xoá bài?"
                        extra={
                          canEdit ? (
                            <button
                              type="button"
                              onClick={() => setPicker(open ? null : l.id)}
                              aria-expanded={open}
                              className="min-h-10 cursor-pointer px-1 text-[13px] font-semibold text-accent"
                            >
                              + Gắn học liệu
                            </button>
                          ) : null
                        }
                      />
                      {l.materials.map((mt) => (
                        <div key={mt.id} className="flex flex-wrap items-center gap-2 rounded-lg bg-[#F3F6FD] py-1.5 pr-1.5 pl-3 text-[13px]">
                          <span className="font-semibold text-accent-dark">{KIND_LABEL[mt.kind]}</span>
                          <span className="flex-[1_1_200px]">
                            {mt.title}
                            {mt.grade ? ` · Lớp ${mt.grade}` : ""}
                          </span>
                          <span className="rounded-md bg-surface px-2 py-0.5 font-semibold">v{mt.versionNo}</span>
                          {mt.update && (
                            <>
                              <span className="font-semibold text-warn">Có v{mt.update.versionNo} đã duyệt</span>
                              {canEdit && (
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() =>
                                    run(() => supabase.from("lesson_materials").update({ document_version_id: mt.update!.versionId }).eq("id", mt.id))
                                  }
                                  className="min-h-9 cursor-pointer rounded-lg border border-edge bg-surface px-3 font-semibold"
                                >
                                  Gắn v{mt.update.versionNo}
                                </button>
                              )}
                            </>
                          )}
                          {canEdit && (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => run(() => supabase.from("lesson_materials").delete().eq("id", mt.id))}
                              aria-label={`Gỡ ${KIND_LABEL[mt.kind]} ${mt.title}`}
                              className="flex h-10 w-10 cursor-pointer items-center justify-center"
                            >
                              <Icon d={ICONS.close} size={14} stroke="#4B5565" width={2.2} />
                            </button>
                          )}
                        </div>
                      ))}
                      {open && (
                        <div className="flex flex-col gap-1.5 rounded-[10px] border border-accent-edge bg-surface p-3">
                          <span className="text-[13px] font-semibold">Chọn học liệu đã duyệt</span>
                          {library.length === 0 && <span className="text-[13px] text-muted">Chưa có KHBD nào. Tạo và duyệt KHBD ở mục Tạo KHBD.</span>}
                          {library.map((it) => {
                            const already = attachedDocs.has(it.documentId);
                            const label = `${KIND_LABEL[it.kind]} · ${it.title}${it.grade ? ` · Lớp ${it.grade}` : ""}${it.versionNo ? ` · v${it.versionNo}` : ""}`;
                            return (
                              <div key={it.documentId} className={"flex min-h-10 items-center gap-2.5 text-[13px] " + (it.versionId ? "text-ink" : "text-muted")}>
                                <span className="flex-1">{label}</span>
                                <span className="text-xs">{already ? "Đã gắn" : it.state}</span>
                                {it.versionId && !already && (
                                  <button
                                    type="button"
                                    disabled={busy}
                                    onClick={async () => {
                                      const ok = await run(() =>
                                        supabase.from("lesson_materials").insert({
                                          lesson_id: l.id,
                                          document_version_id: it.versionId,
                                          document_id: it.documentId,
                                          position: l.materials.length,
                                        }),
                                      );
                                      if (ok) setPicker(null);
                                    }}
                                    className="min-h-9 cursor-pointer rounded-lg border border-edge bg-surface px-3 font-semibold"
                                    aria-label={`Gắn ${label}`}
                                  >
                                    Gắn
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
              {canEdit && (
                <AddRow
                  id={`bai-moi-${m.id}`}
                  label={`Thêm bài vào học phần ${mi + 1}`}
                  placeholder="Tên bài mới"
                  value={newLesson[m.id] ?? ""}
                  busy={busy}
                  onChange={(v) => setNewLesson((s) => ({ ...s, [m.id]: v }))}
                  onAdd={async () => {
                    const title = (newLesson[m.id] ?? "").trim();
                    if (!title) return;
                    const ok = await run(() => supabase.from("course_lessons").insert({ module_id: m.id, title, position: nextPos(m.lessons) }));
                    if (ok) setNewLesson((s) => ({ ...s, [m.id]: "" }));
                  }}
                  buttonLabel="Thêm bài"
                  className="pl-7"
                />
              )}
            </li>
          ))}
        </ol>
        {canEdit && (
          <AddRow
            id="hoc-phan-moi"
            label="Thêm học phần"
            placeholder="Tên học phần mới"
            value={newModule}
            busy={busy}
            onChange={setNewModule}
            onAdd={async () => {
              if (!newModule.trim()) return;
              const ok = await run(() =>
                supabase.from("course_modules").insert({ course_id: course.id, title: newModule.trim(), position: nextPos(modules) }),
              );
              if (ok) setNewModule("");
            }}
            buttonLabel="Thêm học phần"
          />
        )}
        <p className="text-[13px] text-muted">
          Chỉ gắn được bản đã duyệt. Khi KHBD đã gắn có bản mới được duyệt, dòng học liệu hiện nút cập nhật để bạn chọn.
        </p>
      </div>

      <div className={`${card} flex flex-wrap items-center gap-3 p-5`}>
        <span className="flex-[1_1_240px] text-sm text-muted">{publishHint(course.status)}</span>
        {course.status === "published" && (
          <Link href={`/khoa-hoc/${course.slug}`} className={btnSecondary}>
            Xem trên trang giáo viên
          </Link>
        )}
        {canPublish && course.status !== "published" && (
          <button
            type="button"
            disabled={busy || modules.length === 0}
            title={modules.length === 0 ? "Thêm ít nhất một học phần trước khi xuất bản" : undefined}
            onClick={() => run(() => supabase.from("courses").update({ status: "published" }).eq("id", course.id), { catalog: true })}
            className={btnPrimary}
          >
            {course.status === "hidden" ? "Xuất bản lại" : "Xuất bản"}
          </button>
        )}
        {canPublish && course.status === "published" && (
          <button
            type="button"
            disabled={busy}
            onClick={() => run(() => supabase.from("courses").update({ status: "hidden" }).eq("id", course.id), { catalog: true })}
            className="inline-flex min-h-11 cursor-pointer items-center rounded-[10px] bg-muted px-4 text-sm font-semibold text-white"
          >
            Ẩn khỏi trang giáo viên
          </button>
        )}
        {canPublish && course.status !== "published" && (
          <button
            type="button"
            disabled={busy || learnerCount > 0}
            title={learnerCount > 0 ? "Khoá đã có người học, chỉ ẩn được" : undefined}
            onClick={async () => {
              if (confirmDelete !== course.id) return setConfirmDelete(course.id);
              setBusy(true);
              const { error } = await supabase.from("courses").delete().eq("id", course.id);
              setBusy(false);
              if (error) return setError(courseSaveError(error));
              router.push("/noi-bo/khoa-hoc");
              router.refresh();
            }}
            className="min-h-11 cursor-pointer px-2 text-sm font-semibold text-err disabled:cursor-not-allowed disabled:opacity-50"
          >
            {confirmDelete === course.id ? "Bấm lần nữa để xoá hẳn khoá" : "Xoá khoá"}
          </button>
        )}
        {!canPublish && <span className="text-[13px] text-muted">Chỉ Academic lead xuất bản hoặc ẩn khoá.</span>}
        {canPublish && modules.length === 0 && course.status !== "published" && (
          <span className="w-full text-[13px] text-muted">Thêm ít nhất một học phần trước khi xuất bản.</span>
        )}
      </div>
    </section>
  );
}

function Info({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-muted">{k}</dt>
      <dd>{v}</dd>
    </div>
  );
}

function Row(p: {
  title: string;
  plainTitle: string;
  meta: string;
  bold?: boolean;
  canEdit: boolean;
  busy: boolean;
  first: boolean;
  last: boolean;
  renaming: string | null;
  confirmDelete: boolean;
  deleteHint: string;
  extra?: React.ReactNode;
  onMove: (dir: -1 | 1) => void;
  onRenameStart: () => void;
  onRenameChange: (v: string) => void;
  onRenameCancel: () => void;
  onRenameSave: () => void;
  onDelete: () => void;
}) {
  if (p.renaming !== null) {
    const id = `doi-ten-${p.plainTitle}`.replace(/\s+/g, "-");
    return (
      <form
        className="flex flex-wrap items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (p.renaming!.trim()) p.onRenameSave();
        }}
      >
        <label htmlFor={id} className="sr-only-label">
          Tên mới cho {p.plainTitle}
        </label>
        <input id={id} autoFocus value={p.renaming} onChange={(e) => p.onRenameChange(e.target.value)} className={`${field} flex-1`} />
        <button type="submit" disabled={p.busy || !p.renaming.trim()} className={btnPrimary}>
          Lưu
        </button>
        <button type="button" onClick={p.onRenameCancel} className={btnSecondary}>
          Huỷ
        </button>
      </form>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
      <span className={"flex-[1_1_220px] " + (p.bold ? "text-[15px] font-bold" : "")}>{p.title}</span>
      {p.meta && <span className="text-xs text-muted">{p.meta}</span>}
      {p.extra}
      {p.canEdit && (
        <span className="flex items-center">
          <IconBtn label={`Chuyển ${p.plainTitle} lên`} disabled={p.busy || p.first} onClick={() => p.onMove(-1)} d="M12 19V5M6 11l6-6 6 6" />
          <IconBtn label={`Chuyển ${p.plainTitle} xuống`} disabled={p.busy || p.last} onClick={() => p.onMove(1)} d="M12 5v14M6 13l6 6 6-6" />
          <IconBtn label={`Đổi tên ${p.plainTitle}`} disabled={p.busy} onClick={p.onRenameStart} d="M4 20h4L19 9l-4-4L4 16zM14 6l4 4" />
          <button
            type="button"
            disabled={p.busy}
            onClick={p.onDelete}
            aria-label={p.confirmDelete ? `${p.deleteHint} Bấm lần nữa để xoá ${p.plainTitle}` : `Xoá ${p.plainTitle}`}
            className={"flex h-10 cursor-pointer items-center justify-center rounded-lg " + (p.confirmDelete ? "bg-err-soft px-2 text-xs font-semibold text-err" : "w-10")}
          >
            {p.confirmDelete ? p.deleteHint : <Icon d="M5 7h14M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" size={16} stroke="#4B5565" />}
          </button>
        </span>
      )}
    </div>
  );
}

function IconBtn({ label, d, disabled, onClick }: { label: string; d: string; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg hover:bg-bg disabled:cursor-not-allowed disabled:opacity-30"
    >
      <Icon d={d} size={16} stroke="#4B5565" />
    </button>
  );
}

function AddRow(p: {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  busy: boolean;
  buttonLabel: string;
  className?: string;
  onChange: (v: string) => void;
  onAdd: () => void;
}) {
  return (
    <form
      className={`flex flex-wrap items-center gap-2 ${p.className ?? ""}`}
      onSubmit={(e) => {
        e.preventDefault();
        p.onAdd();
      }}
    >
      <label htmlFor={p.id} className="sr-only-label">
        {p.label}
      </label>
      <input id={p.id} value={p.value} onChange={(e) => p.onChange(e.target.value)} placeholder={p.placeholder} className={`${field} min-w-0 flex-1`} />
      <button type="submit" disabled={p.busy || !p.value.trim()} className={btnSecondary}>
        {p.buttonLabel}
      </button>
    </form>
  );
}
