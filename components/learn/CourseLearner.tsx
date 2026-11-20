"use client";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/Icon";
import { Notice } from "@/components/khbd/StatusChip";
import { courseProgress, type LModule } from "@/lib/learning";
import { getBrowserClient } from "@/lib/supabase/client";
import { btnPrimaryLg, btnSecondary } from "@/lib/ui";

type Material = { lesson_id: string; material_id: string; label: string | null; kind: "khbd" | "pbt"; title: string; version_no: number; web_view_link: string };
type State = {
  ready: boolean;
  signedIn: boolean;
  enrolled: boolean;
  completedAt: string | null;
  saved: boolean;
  done: Set<string>;
  materials: Material[];
};

const Ctx = createContext<{
  state: State;
  modules: LModule[];
  busy: boolean;
  error: string;
  enroll: () => void;
  toggleSave: () => void;
  toggleLesson: (id: string) => void;
} | null>(null);

function useLearner() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useLearner ngoài CourseLearner");
  return v;
}

// Trạng thái học của người đang xem một khoá: đăng ký, đã lưu, bài đã học, học liệu. Phần nội dung khoá vẫn
// lấy từ server (lưu đệm); phần này đọc theo phiên trong trình duyệt và RLS chỉ trả dữ liệu của chính người đó.
export function CourseLearner({ courseId, modules, children }: { courseId: string; modules: LModule[]; children: React.ReactNode }) {
  const supabase = getBrowserClient();
  const router = useRouter();
  const path = usePathname();
  const [state, setState] = useState<State>({ ready: false, signedIn: false, enrolled: false, completedAt: null, saved: false, done: new Set(), materials: [] });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const lessonIds = useMemo(() => modules.flatMap((m) => m.lessons.map((l) => l.id)), [modules]);

  const load = useCallback(async () => {
    const { data: s } = await supabase.auth.getSession();
    if (!s.session) {
      setState((x) => ({ ...x, ready: true, signedIn: false }));
      return;
    }
    const [{ data: en }, { data: sv }, { data: lp }, { data: mats }] = await Promise.all([
      supabase.from("enrollments").select("completed_at").eq("course_id", courseId).maybeSingle(),
      supabase.from("saved_courses").select("course_id").eq("course_id", courseId).maybeSingle(),
      lessonIds.length ? supabase.from("lesson_progress").select("lesson_id").in("lesson_id", lessonIds) : Promise.resolve({ data: [] }),
      supabase.rpc("course_material_links", { p_course_id: courseId }),
    ]);
    setState({
      ready: true,
      signedIn: true,
      enrolled: !!en,
      completedAt: (en as { completed_at: string | null } | null)?.completed_at ?? null,
      saved: !!sv,
      done: new Set(((lp ?? []) as { lesson_id: string }[]).map((r) => r.lesson_id)),
      materials: (mats ?? []) as Material[],
    });
  }, [supabase, courseId, lessonIds]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- đồng bộ với dữ liệu ngoài (Supabase)
    void load();
  }, [load]);

  const needLogin = () => router.push(`/dang-nhap?next=${encodeURIComponent(path)}`);

  async function act(fn: () => PromiseLike<{ error: { message: string } | null }>) {
    setBusy(true);
    setError("");
    const { error } = await fn();
    setBusy(false);
    if (error) setError(`Chưa lưu được: ${error.message}. Thử lại sau ít phút.`);
    await load();
  }

  const value = {
    state,
    modules,
    busy,
    error,
    enroll: () => (state.signedIn ? act(() => supabase.from("enrollments").insert({ course_id: courseId })) : needLogin()),
    toggleSave: () =>
      state.signedIn
        ? act(() =>
            state.saved ? supabase.from("saved_courses").delete().eq("course_id", courseId) : supabase.from("saved_courses").insert({ course_id: courseId }),
          )
        : needLogin(),
    toggleLesson: (id: string) => {
      const was = state.done.has(id);
      // Đổi ngay trên màn hình; load() sau khi lưu sẽ trả về đúng trạng thái trong DB (kể cả khi lỗi).
      setState((x) => {
        const done = new Set(x.done);
        if (was) done.delete(id);
        else done.add(id);
        return { ...x, done };
      });
      return act(() => (was ? supabase.from("lesson_progress").delete().eq("lesson_id", id) : supabase.from("lesson_progress").insert({ lesson_id: id })));
    },
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Ô bên phải phần đầu trang: đăng ký / tiến độ / lưu. */
export function EnrollBox() {
  const { state, modules, busy, error, enroll, toggleSave } = useLearner();
  const p = courseProgress(modules, state.done);
  if (!state.ready) return <div className="h-40" aria-hidden="true" />;
  return (
    <>
      {state.enrolled ? (
        <div className="flex flex-col gap-2.5">
          <div className="flex justify-between text-sm">
            <span className="font-semibold">Tiến độ của bạn</span>
            <span>{p.percent}%</span>
          </div>
          <div
            role="progressbar"
            aria-label="Tiến độ khoá học"
            aria-valuenow={p.percent}
            aria-valuemin={0}
            aria-valuemax={100}
            className="h-2.5 overflow-hidden rounded-full bg-line"
          >
            <div className="h-full bg-accent" style={{ width: `${p.percent}%` }} />
          </div>
          <p className="text-sm text-muted">
            {state.completedAt
              ? "Bạn đã hoàn thành khoá học."
              : p.currentIndex >= 0
                ? `Đang học: Học phần ${p.currentIndex + 1}. ${modules[p.currentIndex].title}`
                : "Khoá chưa có bài."}
          </p>
          <a href="#noi-dung" className={btnPrimaryLg}>
            {state.completedAt ? "Xem lại nội dung" : "Tiếp tục học"}
          </a>
        </div>
      ) : (
        <>
          <p className="text-[15px] leading-relaxed text-muted">
            {state.signedIn ? "Đăng ký để lưu tiến độ và đánh dấu bài đã học." : "Đăng nhập để đăng ký học, lưu tiến độ và mở học liệu."}
          </p>
          <button type="button" onClick={enroll} disabled={busy} className={btnPrimaryLg}>
            {state.signedIn ? "Đăng ký học" : "Đăng nhập để đăng ký"}
          </button>
        </>
      )}
      <button type="button" onClick={toggleSave} aria-pressed={state.saved} disabled={busy} className={btnSecondary}>
        {state.saved ? "Đã lưu vào danh sách" : "Lưu để học sau"}
      </button>
      {error && <Notice tone="err">{error}</Notice>}
    </>
  );
}

/** Mục "Nội dung khoá học": học phần mở/đóng, đánh dấu bài đã học, học liệu đã gắn. */
export function CourseContents() {
  const { state, modules, busy, toggleLesson } = useLearner();
  const p = courseProgress(modules, state.done);
  const [open, setOpen] = useState<number[] | null>(null);
  const openList = open ?? [Math.max(0, state.enrolled ? p.currentIndex : 0)];
  const allOpen = openList.length === modules.length;
  const lessonCount = modules.reduce((n, m) => n + m.lessons.length, 0);

  return (
    <section id="noi-dung" className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-7">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-[22px] font-bold">Nội dung khoá học</h2>
        {modules.length > 0 && (
          <button
            type="button"
            onClick={() => setOpen(allOpen ? [] : modules.map((_, i) => i))}
            className="min-h-11 cursor-pointer text-sm font-semibold text-accent"
          >
            {allOpen ? "Thu gọn tất cả" : "Mở tất cả"}
          </button>
        )}
      </div>
      <p className="text-sm text-muted">
        {modules.length} học phần · {lessonCount} bài
      </p>
      {modules.length === 0 ? (
        <p className="text-muted">Nội dung đang được soạn.</p>
      ) : (
        <ol className="flex flex-col overflow-hidden rounded-[10px] border border-line">
          {modules.map((m, i) => {
            const isOpen = openList.includes(i);
            const st = p.moduleState[i];
            const isDone = state.enrolled && st.complete;
            const isCurrent = state.enrolled && st.current;
            const bg = isCurrent ? "bg-[#F3F6FD]" : "bg-surface";
            return (
              <li key={m.id} className={i ? "border-t border-line" : ""}>
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? openList.filter((x) => x !== i) : [...openList, i])}
                  aria-expanded={isOpen}
                  className={`flex min-h-16 w-full cursor-pointer items-center gap-3.5 px-[18px] py-4 text-left text-ink ${bg}`}
                >
                  <span
                    className={
                      "flex h-8 w-8 flex-none items-center justify-center rounded-full text-sm font-bold " +
                      (isDone ? "bg-ok text-white" : isCurrent ? "bg-accent text-white" : "bg-line text-ink")
                    }
                    aria-hidden="true"
                  >
                    {isDone ? "✓" : i + 1}
                  </span>
                  <span className="flex flex-1 flex-col gap-0.5">
                    <span className="text-base font-semibold">
                      Học phần {i + 1}. {m.title}
                    </span>
                    <span className="text-[13px] text-muted">
                      {m.lessons.length} bài
                      {state.enrolled ? ` · ${isDone ? "Đã hoàn thành" : isCurrent ? `Đang học (${st.done}/${st.total})` : st.done ? `${st.done}/${st.total} bài` : ""}` : ""}
                    </span>
                  </span>
                  <Icon d="M6 9l6 6 6-6" stroke="#4B5565" width={2} className={isOpen ? "rotate-180" : ""} />
                </button>
                {isOpen && (
                  <ul className={`flex flex-col gap-2.5 px-[18px] pt-1 pb-4 pl-16 text-[15px] ${bg}`}>
                    {m.lessons.map((l) => {
                      const mats = state.enrolled ? state.materials.filter((x) => x.lesson_id === l.id) : [];
                      const checked = state.done.has(l.id);
                      return (
                        <li key={l.id} className="flex flex-col gap-1">
                          {state.enrolled ? (
                            <label htmlFor={`bai-${l.id}`} className="flex min-h-11 cursor-pointer items-center gap-2.5">
                              <input
                                id={`bai-${l.id}`}
                                type="checkbox"
                                checked={checked}
                                disabled={busy}
                                onChange={() => toggleLesson(l.id)}
                                className="h-[18px] w-[18px] accent-accent"
                              />
                              <span className={checked ? "text-muted line-through decoration-1" : ""}>{l.title}</span>
                              <span className="sr-only">{checked ? "(đã học)" : "(chưa học)"}</span>
                            </label>
                          ) : (
                            <span className="flex items-center gap-2.5">
                              <span aria-hidden="true" className="h-1.5 w-1.5 flex-none rounded-full bg-[#9AA3B2]" />
                              {l.title}
                            </span>
                          )}
                          {mats.map((mt) => (
                            <span key={mt.material_id} className="ml-7 text-sm">
                              {mt.web_view_link ? (
                                <a href={mt.web_view_link} target="_blank" rel="noreferrer">
                                  {mt.kind === "pbt" ? "Phiếu bài tập" : "Kế hoạch bài dạy"}: {mt.label || mt.title} (v{mt.version_no})
                                </a>
                              ) : (
                                <span className="text-muted">
                                  {mt.kind === "pbt" ? "Phiếu bài tập" : "Kế hoạch bài dạy"}: {mt.label || mt.title} (v{mt.version_no}) · bản giả lập, chưa có
                                  Google Doc
                                </span>
                              )}
                            </span>
                          ))}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            );
          })}
        </ol>
      )}
      {state.ready && !state.enrolled && state.materials.length + (state.signedIn ? 0 : 1) > 0 && (
        <p className="text-[13px] text-muted">Học liệu kèm bài (KHBD, phiếu bài tập) hiện sau khi bạn đăng ký học.</p>
      )}
    </section>
  );
}
