"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { refreshCatalog } from "@/app/noi-bo/khoa-hoc/actions";
import { CourseForm } from "@/components/courses/CourseForm";
import { AddRow, Row } from "@/components/courses/rows";
import { StepEditor } from "@/components/courses/StepEditor";
import { Icon } from "@/components/Icon";
import { Notice, StatusChip } from "@/components/khbd/StatusChip";
import { FORMATS, TOPICS, hoursText, type Audience, type Format, type Level, type Topic } from "@/lib/catalog";
import { COURSE_STATUS, audienceShort, courseSaveError, formToRow, publishHint, type CourseStatus } from "@/lib/course-admin";
import { rpcErrorText } from "@/lib/khbd";
import { STEP_ICON, hoursOf, readinessChecks, type QuizKey, type StepBody, type StepKind } from "@/lib/steps";
import { getBrowserClient } from "@/lib/supabase/client";
import { btnPrimary, btnSecondary, card, pageTitle } from "@/lib/ui";

export type StudioCourse = {
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
  prerequisites: string[];
  materials_needed: string[];
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
export type LibraryItem = {
  documentId: string;
  kind: "khbd" | "pbt";
  title: string;
  grade: number | null;
  versionId: string | null;
  versionNo: number | null;
  state: string;
};
export type StudioStep = {
  id: string;
  title: string;
  kind: StepKind;
  mins: number | null;
  ready: boolean;
  position: number;
  body: StepBody;
  key: QuizKey | null;
  materials: EditorMaterial[];
  /** Đổi khi bước được lưu: làm mới ô soạn sau router.refresh(). */
  stamp: string;
};
export type StudioSection = { id: string; title: string; position: number; steps: StudioStep[] };
export type StudioModule = { id: string; title: string; position: number; sections: StudioSection[] };
type Tab = "info" | "content" | "check";

const READY = { label: "Sẵn sàng", bg: "#E2F3EA", ink: "#1D6E47" };
const DRAFT = { label: "Nháp", bg: "#EEF0F3", ink: "#4B5565" };
const CHECK = {
  ok: { d: "M5 12l5 5L19 7", bg: "bg-ok-soft", ink: "#1D6E47", label: "Đạt" },
  bad: { d: "M6 6l12 12M18 6L6 18", bg: "bg-err-soft", ink: "#8A3A0C", label: "Cần sửa" },
  warn: { d: "M12 7v6M12 17h.01", bg: "bg-warn-soft", ink: "#7A4B00", label: "Nhắc nhở" },
};
const nextPos = (list: { position: number }[]) => (list.length ? Math.max(...list.map((x) => x.position)) + 1 : 0);

// Màn soạn nội dung một khoá (design/artboards/SoanNoiDung.dc.html): 3 tab Thông tin trang khoá / Nội dung /
// Kiểm tra trước khi xuất bản. Quyền thật nằm ở RLS + trigger; ở đây chỉ ẩn nút cho dễ hiểu.
export function CourseStudio(p: {
  course: StudioCourse;
  modules: StudioModule[];
  library: LibraryItem[];
  canPublish: boolean;
  canEdit: boolean;
  learnerCount: number;
  /** Số người đã hoàn thành khoá: sửa cấu trúc khoá thì báo trước để người soạn biết ảnh hưởng (chốt 26/11). */
  completedCount: number;
}) {
  const { course, modules, canEdit } = p;
  const router = useRouter();
  const supabase = getBrowserClient();
  const allSteps = modules.flatMap((m) => m.sections.flatMap((s) => s.steps));
  const [tab, setTab] = useState<Tab>(allSteps.length ? "content" : "info");
  const [sel, setSel] = useState<string | null>(allSteps.find((s) => !s.ready)?.id ?? allSteps[0]?.id ?? null);
  const [openMods, setOpenMods] = useState<string[]>(() => {
    const m = modules.find((x) => x.sections.some((s) => s.steps.some((st) => st.id === sel)));
    return m ? [m.id] : modules[0] ? [modules[0].id] : [];
  });
  const [renaming, setRenaming] = useState<{ id: string; value: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [adding, setAdding] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

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

  const selStep = allSteps.find((s) => s.id === sel) ?? null;
  const selPath = (() => {
    for (const [mi, m] of modules.entries()) for (const s of m.sections) if (s.steps.some((x) => x.id === sel)) return `Học phần ${mi + 1} › ${s.title}`;
    return "";
  })();
  const totalMins = allSteps.reduce((n, s) => n + (s.mins ?? 0), 0);
  const drafts = allSteps.filter((s) => !s.ready).length;
  const checks = readinessChecks({
    course,
    modules: modules.map((m) => ({ title: m.title, sections: m.sections.map((s) => ({ title: s.title, steps: s.steps.map((x) => ({ ...x })) })) })),
    outdatedMaterials: allSteps.reduce((n, s) => n + s.materials.filter((x) => x.update).length, 0),
  });
  const bad = checks.filter((c) => c.state === "bad").length;
  const previewHref = (id: string) => `/khoa-hoc/${course.slug}/buoc/${id}`;
  const pick = (id: string) => {
    setSel(id);
    const m = modules.find((x) => x.sections.some((s) => s.steps.some((st) => st.id === id)));
    if (m && !openMods.includes(m.id)) setOpenMods((o) => [...o, m.id]);
  };

  const rowProps = (id: string, title: string, first: boolean, last: boolean, onMove: (d: -1 | 1) => void, table: "course_modules" | "course_sections", deleteHint: string) => ({
    plainTitle: title,
    canEdit,
    busy,
    first,
    last,
    renaming: renaming?.id === id ? renaming.value : null,
    confirmDelete: confirmDelete === id,
    deleteHint,
    onMove,
    onRenameStart: () => setRenaming({ id, value: title }),
    onRenameChange: (v: string) => setRenaming({ id, value: v }),
    onRenameCancel: () => setRenaming(null),
    onRenameSave: async () => {
      if (await run(() => supabase.from(table).update({ title: renaming!.value.trim() }).eq("id", id))) setRenaming(null);
    },
    onDelete: async () => {
      if (confirmDelete !== id) return setConfirmDelete(id);
      setConfirmDelete(null);
      await run(() => supabase.from(table).delete().eq("id", id));
    },
  });

  return (
    <div className="flex flex-col gap-5">
      <nav aria-label="Đường dẫn" className="flex flex-wrap gap-2 text-sm text-muted">
        <Link href="/noi-bo/khoa-hoc" className="text-muted">
          Quản lý khoá học
        </Link>
        <span aria-hidden="true">›</span>
        <span>{course.title}</span>
      </nav>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-[1_1_420px] flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className={pageTitle}>{course.title}</h1>
            <StatusChip chip={COURSE_STATUS[course.status]} />
          </div>
          <p className="text-sm text-muted">
            {modules.length} học phần · {allSteps.length} bước · {hoursOf(totalMins)} · {p.learnerCount} người học · /khoa-hoc/{course.slug}
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          {course.status === "published" && (
            <Link href={`/khoa-hoc/${course.slug}`} className={btnSecondary} target="_blank">
              Xem trang khoá
            </Link>
          )}
          {allSteps[0] && (
            <a href={previewHref(selStep?.id ?? allSteps[0].id)} target="_blank" rel="noreferrer" className={btnSecondary}>
              Xem trước như giáo viên
            </a>
          )}
          <button type="button" onClick={() => setTab("check")} className={btnPrimary}>
            {course.status === "published" ? "Kiểm tra nội dung" : "Kiểm tra để xuất bản"}
          </button>
        </div>
      </div>

      {!canEdit && (
        <Notice tone="info">
          {course.status === "draft"
            ? "Bạn đang xem ở chế độ chỉ đọc."
            : "Khoá đã xuất bản hoặc đã ẩn: chỉ Academic lead (Quản lý nội dung) sửa được. Bạn đang xem ở chế độ chỉ đọc."}
        </Notice>
      )}
      {course.status === "published" && bad > 0 && (
        <Notice tone="warn">
          Khoá đang hiện với giáo viên nhưng còn {bad} mục cần sửa.{" "}
          {p.canPublish ? "Sửa các mục đỏ ở tab “Kiểm tra trước khi xuất bản”, hoặc ẩn khoá cho tới khi xong." : "Báo Academic lead sửa hoặc ẩn khoá."}{" "}
          {tab !== "check" && (
            <button type="button" onClick={() => setTab("check")} className="font-semibold underline">
              Xem các mục cần sửa
            </button>
          )}
        </Notice>
      )}
      {canEdit && p.completedCount > 0 && tab === "content" && (
        <Notice tone="info">
          Khoá có {p.completedCount} người đã hoàn thành. Thêm bước không ảnh hưởng giấy đã cấp; họ giữ “Đã hoàn thành” và thấy nhãn “Có bước
          mới”. Xoá bước không làm ai mất “Đã hoàn thành”. Đổi lớn (chương trình theo văn bản mới, đổi mục tiêu khoá) thì tạo khoá mới và ẩn khoá
          này; người đã học giữ khoá cũ và giấy cũ.
        </Notice>
      )}
      {error && <Notice tone="err">{error}</Notice>}

      <div role="tablist" aria-label="Phần soạn" className="flex flex-wrap gap-1 border-b border-line">
        {(
          [
            ["info", "Thông tin trang khoá", 0],
            ["content", "Nội dung", drafts],
            ["check", "Kiểm tra trước khi xuất bản", bad],
          ] as [Tab, string, number][]
        ).map(([k, label, n]) => (
          <button
            key={k}
            id={`tab-${k}`}
            type="button"
            role="tab"
            aria-selected={tab === k}
            aria-controls={`panel-${k}`}
            onClick={() => setTab(k)}
            className={
              "flex min-h-12 cursor-pointer items-center gap-2 border-b-[3px] px-4 text-[15px] " +
              (tab === k ? "border-accent font-bold text-ink" : "border-transparent font-medium text-muted")
            }
          >
            {label}
            {n > 0 && <span className="rounded-full bg-warn-soft px-2 py-0.5 text-xs font-bold text-warn">{n}</span>}
          </button>
        ))}
      </div>

      {tab === "info" && (
        <div id="panel-info" role="tabpanel" aria-labelledby="tab-info" className="flex flex-wrap items-start gap-6">
          <div className={`${card} min-w-0 flex-[999_1_560px] p-5 sm:p-6`}>
            <p className="mb-4 text-sm text-muted">Các mục này hiện trên trang chi tiết khoá, theo thứ tự từ trên xuống.</p>
            {canEdit ? (
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
                  prerequisites: course.prerequisites.join("\n"),
                  materials_needed: course.materials_needed.join("\n"),
                  audience_note: course.audience_note,
                }}
                slugLocked={course.status !== "draft" || p.learnerCount > 0}
                submitLabel="Lưu thông tin"
                onSubmit={async (f) => {
                  const { error } = await supabase.from("courses").update(formToRow(f)).eq("id", course.id).select("id").single();
                  if (error) return courseSaveError(error);
                  if (course.status === "published") await refreshCatalog();
                  router.refresh();
                }}
              />
            ) : (
              <p className="text-sm">{course.summary}</p>
            )}
          </div>
          <aside className={`${card} flex w-full max-w-[360px] flex-[1_1_280px] flex-col gap-3 p-5`}>
            <h2 className="text-base font-bold">Thông tin nhanh</h2>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted">Chủ đề</dt>
              <dd>{TOPICS[course.topic].label}</dd>
              <dt className="text-muted">Đối tượng</dt>
              <dd>{audienceShort(course.audiences)}</dd>
              <dt className="text-muted">Trang khoá ghi</dt>
              <dd>
                {hoursText(course.hours_min, course.hours_max)} · {FORMATS[course.format]}
              </dd>
              <dt className="text-muted">Các bước cộng lại</dt>
              <dd>{hoursOf(totalMins)}</dd>
              <dt className="text-muted">Chứng nhận</dt>
              <dd>Chưa cấp ở bản đầu</dd>
            </dl>
          </aside>
        </div>
      )}

      {tab === "content" && (
        <div id="panel-content" role="tabpanel" aria-labelledby="tab-content" className="flex flex-wrap items-start gap-6">
          <section aria-label="Cấu trúc khoá học" className={`${card} w-full min-w-0 flex-[1_1_340px] overflow-hidden lg:max-w-[440px]`}>
            <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3.5">
              <h2 className="text-base font-bold">Cấu trúc</h2>
              <span className="text-[13px] text-muted">
                {allSteps.length - drafts} / {allSteps.length} bước sẵn sàng
              </span>
            </div>
            {modules.length === 0 && <p className="px-4 py-4 text-sm text-muted">Khoá chưa có học phần. Thêm học phần đầu tiên ở dưới.</p>}
            <ol>
              {modules.map((m, mi) => {
                const open = openMods.includes(m.id);
                const steps = m.sections.flatMap((s) => s.steps);
                const mDrafts = steps.filter((s) => !s.ready).length;
                return (
                  <li key={m.id} className={mi ? "border-t border-line" : ""}>
                    <div className="flex items-start gap-1 px-2 py-1.5">
                      <button
                        type="button"
                        onClick={() => setOpenMods((o) => (open ? o.filter((x) => x !== m.id) : [...o, m.id]))}
                        aria-expanded={open}
                        aria-label={`${open ? "Thu gọn" : "Mở"} học phần ${mi + 1}`}
                        className="mt-1 flex h-10 w-10 flex-none cursor-pointer items-center justify-center rounded-lg hover:bg-bg"
                      >
                        <Icon d="M9 6l6 6-6 6" size={14} stroke="#4B5565" width={2.4} className={open ? "rotate-90" : ""} />
                      </button>
                      <div className="min-w-0 flex-1 py-1">
                        <span className="block text-xs font-semibold text-muted">
                          Học phần {mi + 1} · {steps.length} bước · {steps.reduce((n, s) => n + (s.mins ?? 0), 0)} phút{mDrafts ? ` · ${mDrafts} nháp` : ""}
                        </span>
                        <Row
                          title={m.title}
                          meta=""
                          bold
                          {...rowProps(
                            m.id,
                            m.title,
                            mi === 0,
                            mi === modules.length - 1,
                            (dir) => run(() => supabase.rpc("move_course_item", { p_kind: "module", p_id: m.id, p_dir: dir })),
                            "course_modules",
                            steps.length ? `Xoá cả ${steps.length} bước?` : "Xoá học phần?",
                          )}
                        />
                      </div>
                    </div>
                    {open && (
                      <div className="flex flex-col gap-2 pr-2.5 pb-3 pl-6">
                        {m.sections.map((s, si) => (
                          <div key={s.id} className="flex flex-col gap-0.5 border-l-2 border-line-soft pl-2.5">
                            <Row
                              title={`Phần: ${s.title}`}
                              meta=""
                              {...rowProps(
                                s.id,
                                s.title,
                                si === 0,
                                si === m.sections.length - 1,
                                (dir) => run(() => supabase.rpc("move_course_item", { p_kind: "section", p_id: s.id, p_dir: dir })),
                                "course_sections",
                                s.steps.length ? `Xoá cả ${s.steps.length} bước?` : "Xoá phần?",
                              )}
                            />
                            {s.steps.map((st, ti) => {
                              const active = st.id === sel;
                              return (
                                <div key={st.id} className={`flex items-center gap-1 rounded-lg ${active ? "bg-accent-soft" : ""}`}>
                                  <button
                                    type="button"
                                    onClick={() => pick(st.id)}
                                    aria-pressed={active}
                                    className="flex min-h-10 min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-lg px-2 py-1 text-left"
                                  >
                                    <Icon d={STEP_ICON[st.kind]} size={15} stroke="#4B5565" className="flex-none" />
                                    <span className={`min-w-0 flex-1 text-[13px] leading-snug ${active ? "font-semibold" : ""}`}>{st.title}</span>
                                    <StatusChip chip={st.ready ? READY : DRAFT} size="sm" />
                                  </button>
                                  {canEdit && active && (
                                    <span className="flex flex-none">
                                      <MiniBtn label={`Chuyển ${st.title} lên`} d="M12 19V5M6 11l6-6 6 6" disabled={busy || ti === 0} onClick={() => run(() => supabase.rpc("move_course_item", { p_kind: "lesson", p_id: st.id, p_dir: -1 }))} />
                                      <MiniBtn
                                        label={`Chuyển ${st.title} xuống`}
                                        d="M12 5v14M6 13l6 6 6-6"
                                        disabled={busy || ti === s.steps.length - 1}
                                        onClick={() => run(() => supabase.rpc("move_course_item", { p_kind: "lesson", p_id: st.id, p_dir: 1 }))}
                                      />
                                      <button
                                        type="button"
                                        disabled={busy}
                                        onClick={async () => {
                                          if (confirmDelete !== st.id) return setConfirmDelete(st.id);
                                          setConfirmDelete(null);
                                          if (await run(() => supabase.from("course_lessons").delete().eq("id", st.id))) setSel(null);
                                        }}
                                        aria-label={confirmDelete === st.id ? `Bấm lần nữa để xoá ${st.title}` : `Xoá ${st.title}`}
                                        className={"flex h-9 cursor-pointer items-center justify-center rounded-lg " + (confirmDelete === st.id ? "bg-err-soft px-2 text-xs font-semibold text-err" : "w-9")}
                                      >
                                        {confirmDelete === st.id ? "Xoá?" : <Icon d="M5 7h14M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" size={14} stroke="#4B5565" />}
                                      </button>
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                            {canEdit && (
                              <AddRow
                                id={`buoc-moi-${s.id}`}
                                label={`Thêm bước vào phần ${s.title}`}
                                placeholder="Tên bước mới"
                                value={adding[s.id] ?? ""}
                                busy={busy}
                                buttonLabel="+ Bước"
                                onChange={(v) => setAdding((a) => ({ ...a, [s.id]: v }))}
                                onAdd={async () => {
                                  const title = (adding[s.id] ?? "").trim();
                                  if (!title) return;
                                  let newId = "";
                                  const ok = await run(async () => {
                                    const r = await supabase.from("course_lessons").insert({ section_id: s.id, title, kind: "doc", position: nextPos(s.steps) }).select("id").single();
                                    newId = (r.data as { id: string } | null)?.id ?? "";
                                    return r;
                                  });
                                  if (ok) {
                                    setAdding((a) => ({ ...a, [s.id]: "" }));
                                    if (newId) setSel(newId);
                                  }
                                }}
                              />
                            )}
                          </div>
                        ))}
                        {canEdit && (
                          <AddRow
                            id={`phan-moi-${m.id}`}
                            label={`Thêm phần vào học phần ${mi + 1}`}
                            placeholder="Tên phần mới"
                            value={adding[m.id] ?? ""}
                            busy={busy}
                            buttonLabel="+ Phần"
                            onChange={(v) => setAdding((a) => ({ ...a, [m.id]: v }))}
                            onAdd={async () => {
                              const title = (adding[m.id] ?? "").trim();
                              if (!title) return;
                              const ok = await run(() => supabase.from("course_sections").insert({ module_id: m.id, title, position: nextPos(m.sections) }));
                              if (ok) setAdding((a) => ({ ...a, [m.id]: "" }));
                            }}
                          />
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
            {canEdit && (
              <div className="border-t border-line px-4 py-3">
                <AddRow
                  id="hoc-phan-moi"
                  label="Thêm học phần"
                  placeholder="Tên học phần mới"
                  value={adding.course ?? ""}
                  busy={busy}
                  buttonLabel="+ Học phần"
                  onChange={(v) => setAdding((a) => ({ ...a, course: v }))}
                  onAdd={async () => {
                    const title = (adding.course ?? "").trim();
                    if (!title) return;
                    let newId = "";
                    const ok = await run(async () => {
                      const r = await supabase.from("course_modules").insert({ course_id: course.id, title, position: nextPos(modules) }).select("id").single();
                      if (r.error) return r;
                      newId = (r.data as { id: string }).id;
                      return supabase.from("course_sections").insert({ module_id: newId, title: "Phần 1", position: 0 });
                    });
                    if (ok) {
                      setAdding((a) => ({ ...a, course: "" }));
                      setOpenMods((o) => [...o, newId]);
                    }
                  }}
                />
              </div>
            )}
          </section>

          {selStep ? (
            <StepEditor
              key={`${selStep.id}:${selStep.stamp}`}
              step={selStep}
              path={selPath}
              canEdit={canEdit}
              library={p.library}
              busy={busy}
              run={(fn) => run(fn)}
              previewHref={previewHref(selStep.id)}
            />
          ) : (
            <section className={`${card} min-w-0 flex-[999_1_480px] p-6 text-sm text-muted`}>
              {allSteps.length ? "Chọn một bước ở cột Cấu trúc để soạn." : "Thêm học phần, phần rồi bước ở cột Cấu trúc. Mỗi học phần nên kết thúc bằng quiz và bước tổng kết."}
            </section>
          )}
        </div>
      )}

      {tab === "check" && (
        <div id="panel-check" role="tabpanel" aria-labelledby="tab-check" className="flex flex-wrap items-start gap-6">
          <section aria-label="Danh sách kiểm tra" className={`${card} min-w-0 flex-[999_1_560px] p-5 sm:p-6`}>
            <h2 className="text-lg font-bold">Kiểm tra trước khi xuất bản</h2>
            <p className="mt-1 mb-3.5 text-sm text-muted">Tự kiểm mỗi lần lưu. Xuất bản được khi không còn mục đỏ; mục vàng là nhắc nhở.</p>
            <ul className="overflow-hidden rounded-[10px] border border-line">
              {checks.map((c, i) => {
                const st = CHECK[c.state];
                return (
                  <li key={c.title} className={`flex items-start gap-3 px-4 py-3 ${i ? "border-t border-line" : ""}`}>
                    <span aria-hidden="true" className={`mt-px flex h-6 w-6 flex-none items-center justify-center rounded-full ${st.bg}`}>
                      <Icon d={st.d} size={14} stroke={st.ink} width={2.6} />
                    </span>
                    <span className="flex flex-1 flex-col gap-0.5">
                      <span className="text-[15px] font-semibold">
                        {c.title}
                        <span className="sr-only-label"> – {st.label}</span>
                      </span>
                      <span className="text-[13px] text-muted">{c.detail}</span>
                    </span>
                    {c.state !== "ok" && c.tab && (
                      <button
                        type="button"
                        onClick={() => {
                          setTab(c.tab!);
                          if (c.stepId) pick(c.stepId);
                        }}
                        className="min-h-10 flex-none cursor-pointer text-sm font-semibold text-accent"
                      >
                        Sửa
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
          <aside className={`${card} flex w-full max-w-[360px] flex-[1_1_280px] flex-col gap-3 p-5`}>
            <h2 className="text-base font-bold">Xuất bản</h2>
            <p className="text-sm leading-relaxed">
              {course.status === "published"
                ? publishHint(course.status)
                : bad
                  ? `Còn ${bad} mục cần sửa trước khi xuất bản. Bấm “Sửa” để tới đúng chỗ.`
                  : "Khoá đã sẵn sàng. Xuất bản thì giáo viên thấy khoá ở danh mục ngay."}
            </p>
            {p.canPublish && course.status !== "published" && (
              <button
                type="button"
                disabled={busy || bad > 0}
                onClick={() => run(() => supabase.from("courses").update({ status: "published" }).eq("id", course.id), { catalog: true })}
                className={btnPrimary}
              >
                {course.status === "hidden" ? "Xuất bản lại" : "Xuất bản"}
              </button>
            )}
            {p.canPublish && course.status === "published" && (
              <button
                type="button"
                disabled={busy}
                onClick={() => run(() => supabase.from("courses").update({ status: "hidden" }).eq("id", course.id), { catalog: true })}
                className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-[10px] bg-muted px-4 text-sm font-semibold text-white"
              >
                Ẩn khỏi trang giáo viên
              </button>
            )}
            {p.canPublish && course.status !== "published" && (
              <button
                type="button"
                disabled={busy || p.learnerCount > 0}
                title={p.learnerCount > 0 ? "Khoá đã có người học, chỉ ẩn được" : undefined}
                onClick={async () => {
                  if (confirmDelete !== course.id) return setConfirmDelete(course.id);
                  setBusy(true);
                  // Database chỉ cho xoá khoá chưa có người học (kể cả khoá đã ẩn); bị chặn thì không lỗi mà 0 dòng.
                  const { data, error } = await supabase.from("courses").delete().eq("id", course.id).select("id");
                  setBusy(false);
                  if (error) return setError(courseSaveError(error));
                  if (!data?.length) return setError("Chưa xoá được: khoá đã có người học hoặc bạn không có quyền xoá. Khoá có người học chỉ ẩn được.");
                  router.push("/noi-bo/khoa-hoc");
                  router.refresh();
                }}
                className="min-h-11 cursor-pointer self-start px-1 text-sm font-semibold text-err disabled:cursor-not-allowed disabled:opacity-50"
              >
                {confirmDelete === course.id ? "Bấm lần nữa để xoá hẳn khoá" : "Xoá khoá"}
              </button>
            )}
            {!p.canPublish && <p className="text-[13px] text-muted">Chỉ Academic lead (Quản lý nội dung) xuất bản được.</p>}
          </aside>
        </div>
      )}
    </div>
  );
}

function MiniBtn({ label, d, disabled, onClick }: { label: string; d: string; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg hover:bg-bg disabled:cursor-not-allowed disabled:opacity-30"
    >
      <Icon d={d} size={14} stroke="#4B5565" />
    </button>
  );
}
