"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/Icon";
import { Notice } from "@/components/khbd/StatusChip";
import { courseProgress, type OModule } from "@/lib/learning";
import { STEP_ICON, STEP_KINDS, STEP_LABEL, hoursOf } from "@/lib/steps";
import { getBrowserClient } from "@/lib/supabase/client";
import { btnPrimaryLg, btnSecondary } from "@/lib/ui";

type State = { ready: boolean; signedIn: boolean; enrolled: boolean; completedAt: string | null; saved: boolean; done: Set<string> };

const Ctx = createContext<{
  state: State;
  modules: OModule[];
  slug: string;
  busy: boolean;
  error: string;
  enroll: () => void;
  toggleSave: () => void;
  signIn: () => void;
} | null>(null);

function useLearner() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useLearner ngoài CourseLearner");
  return v;
}

export const stepHref = (slug: string, id: string) => `/khoa-hoc/${slug}/buoc/${id}`;

// Trạng thái học của người đang xem một khoá: đăng nhập, đăng ký, đã lưu, bước đã xong. Nội dung khoá lấy từ server
// (lưu đệm); phần này đọc theo phiên trong trình duyệt và RLS chỉ trả dữ liệu của chính người đó.
export function CourseLearner({ courseId, slug, modules, children }: { courseId: string; slug: string; modules: OModule[]; children: React.ReactNode }) {
  const supabase = getBrowserClient();
  const router = useRouter();
  const path = usePathname();
  const [state, setState] = useState<State>({ ready: false, signedIn: false, enrolled: false, completedAt: null, saved: false, done: new Set() });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const lessonIds = useMemo(() => modules.flatMap((m) => m.lessons.map((l) => l.id)), [modules]);

  const load = useCallback(async () => {
    const { data: s } = await supabase.auth.getSession();
    if (!s.session) {
      setState((x) => ({ ...x, ready: true, signedIn: false }));
      return;
    }
    const [{ data: en }, { data: sv }, { data: lp }] = await Promise.all([
      supabase.from("enrollments").select("completed_at").eq("course_id", courseId).maybeSingle(),
      supabase.from("saved_courses").select("course_id").eq("course_id", courseId).maybeSingle(),
      lessonIds.length ? supabase.from("lesson_progress").select("lesson_id").in("lesson_id", lessonIds) : Promise.resolve({ data: [] }),
    ]);
    setState({
      ready: true,
      signedIn: true,
      enrolled: !!en,
      completedAt: (en as { completed_at: string | null } | null)?.completed_at ?? null,
      saved: !!sv,
      done: new Set(((lp ?? []) as { lesson_id: string }[]).map((r) => r.lesson_id)),
    });
  }, [supabase, courseId, lessonIds]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- đồng bộ với dữ liệu ngoài (Supabase)
    void load();
  }, [load]);

  const signIn = () => router.push(`/dang-nhap?next=${encodeURIComponent(path)}`);

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
    slug,
    busy,
    error,
    signIn,
    enroll: () => (state.signedIn ? act(() => supabase.from("enrollments").insert({ course_id: courseId })) : signIn()),
    toggleSave: () =>
      state.signedIn
        ? act(() =>
            state.saved ? supabase.from("saved_courses").delete().eq("course_id", courseId) : supabase.from("saved_courses").insert({ course_id: courseId }),
          )
        : signIn(),
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Ô bên phải phần đầu trang: đăng nhập / đăng ký / tiến độ / lưu. */
export function EnrollBox() {
  const { state, modules, slug, busy, error, enroll, toggleSave, signIn } = useLearner();
  const p = courseProgress(modules, state.done);
  if (!state.ready) return <div className="h-40" aria-hidden="true" />;
  const first = modules[0]?.lessons[0];
  const target = p.nextLesson ?? first;
  return (
    <>
      {state.enrolled ? (
        <div className="flex flex-col gap-2.5">
          <div className="flex justify-between text-sm">
            <span className="font-semibold">Tiến độ của bạn</span>
            <span>{p.percent}%</span>
          </div>
          <div role="progressbar" aria-label="Tiến độ khoá học" aria-valuenow={p.percent} aria-valuemin={0} aria-valuemax={100} className="h-2.5 overflow-hidden rounded-full bg-line">
            <div className="h-full bg-accent" style={{ width: `${p.percent}%` }} />
          </div>
          <p className="text-sm text-muted">
            {p.doneCount} / {p.total} bước
            {state.completedAt ? " · Bạn đã hoàn thành khoá học." : p.nextLesson ? ` · Tiếp theo: ${p.nextLesson.title}` : ""}
          </p>
          {target ? (
            <Link href={stepHref(slug, target.id)} className={btnPrimaryLg}>
              {state.completedAt || !p.nextLesson ? "Xem lại từ đầu" : p.doneCount ? "Tiếp tục học" : "Bắt đầu học"}
            </Link>
          ) : (
            <p className="text-sm text-muted">Khoá chưa có bước nào.</p>
          )}
        </div>
      ) : state.signedIn ? (
        <>
          <p className="text-[15px] leading-relaxed text-muted">Khoá học miễn phí. Đăng ký để mở mọi bước học, lưu tiến độ và đánh dấu hoàn thành.</p>
          <button type="button" onClick={enroll} disabled={busy} className={btnPrimaryLg}>
            Đăng ký học
          </button>
        </>
      ) : (
        <>
          <p className="text-[15px] leading-relaxed text-muted">Khoá học miễn phí. Đăng nhập để bắt đầu học và lưu tiến độ.</p>
          <button type="button" onClick={signIn} className={btnPrimaryLg}>
            Đăng nhập để bắt đầu học
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

/** Mục "Nội dung khoá học": Học phần → Phần → Bước. Đã đăng ký thì bấm vào bước để học. */
export function CourseContents() {
  const { state, modules, slug } = useLearner();
  const p = courseProgress(modules, state.done);
  const [open, setOpen] = useState<number[] | null>(null);
  const openList = open ?? [Math.max(0, state.enrolled ? p.currentIndex : 0)];
  const allOpen = modules.length > 0 && openList.length === modules.length;
  const steps = modules.flatMap((m) => m.lessons);
  const sectionCount = modules.reduce((n, m) => n + m.sections.length, 0);
  const mins = steps.reduce((n, s) => n + (s.mins ?? 0), 0);
  const locked = !state.enrolled;

  return (
    <section id="noi-dung" className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-5 sm:p-7">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-[22px] font-bold">Nội dung khoá học</h2>
          <p className="text-sm text-muted">
            {modules.length} học phần · {sectionCount} phần · {steps.length} bước{mins ? ` · khoảng ${hoursOf(mins)}` : ""}
          </p>
        </div>
        {modules.length > 0 && (
          <button type="button" onClick={() => setOpen(allOpen ? [] : modules.map((_, i) => i))} className="min-h-11 cursor-pointer text-sm font-semibold text-accent">
            {allOpen ? "Thu gọn tất cả" : "Mở tất cả"}
          </button>
        )}
      </div>
      <ul aria-label="Chú thích loại bước" className="flex flex-wrap gap-x-[18px] gap-y-2 text-[13px] text-muted">
        {STEP_KINDS.map((k) => (
          <li key={k} className="flex items-center gap-1.5">
            <Icon d={STEP_ICON[k]} size={16} stroke="#4B5565" />
            {STEP_LABEL[k]}
          </li>
        ))}
      </ul>
      {state.ready && locked && (
        <p className="flex items-center gap-2.5 rounded-[10px] border border-line bg-bg px-3.5 py-3 text-sm text-muted">
          <Icon d="M6 11h12v10H6zM8 11V8a4 4 0 0 1 8 0v3" stroke="#4B5565" />
          Xem trước được tên các bước. Đăng ký học để mở nội dung từng bước.
        </p>
      )}
      {modules.length === 0 ? (
        <p className="text-muted">Nội dung đang được soạn.</p>
      ) : (
        <ol className="flex flex-col gap-3">
          {modules.map((m, i) => {
            const isOpen = openList.includes(i);
            const st = p.moduleState[i];
            const done = state.enrolled && st.complete;
            const current = state.enrolled && st.current;
            const mMins = m.lessons.reduce((n, s) => n + (s.mins ?? 0), 0);
            const bg = current ? "bg-[#F3F6FD]" : "bg-surface";
            return (
              <li key={m.id} className="overflow-hidden rounded-[10px] border border-line">
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? openList.filter((x) => x !== i) : [...openList, i])}
                  aria-expanded={isOpen}
                  className={`flex min-h-[72px] w-full cursor-pointer items-center gap-3.5 px-[18px] py-4 text-left text-ink ${bg}`}
                >
                  <span
                    aria-hidden="true"
                    className={
                      "flex h-9 w-9 flex-none items-center justify-center rounded-full text-sm font-bold " +
                      (done ? "bg-ok text-white" : current ? "bg-accent text-white" : "bg-line text-ink")
                    }
                  >
                    {done ? "✓" : i + 1}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="text-[13px] font-semibold text-muted">Học phần {i + 1}</span>
                    <span className="text-[17px] font-semibold">{m.title}</span>
                    <span className="text-[13px] text-muted">
                      {m.sections.length} phần · {m.lessons.length} bước{mMins ? ` · ${mMins} phút` : ""}
                      {done ? " · Đã hoàn thành" : current ? ` · Đang học (${st.done}/${st.total})` : ""}
                    </span>
                  </span>
                  <Icon d="M6 9l6 6 6-6" stroke="#4B5565" width={2} className={isOpen ? "rotate-180" : ""} />
                </button>
                {isOpen && (
                  <div className={`flex flex-col gap-3.5 border-t border-line px-[18px] pt-2 pb-4 sm:pl-[68px] ${bg}`}>
                    {m.sections.map((s) => (
                      <div key={s.id} className="flex flex-col gap-1">
                        <h3 className="mt-2 mb-0.5 text-[15px] font-bold">{s.title}</h3>
                        <ul className="flex flex-col">
                          {s.steps.map((stp) => {
                            const isDone = state.done.has(stp.id);
                            const label = `${stp.title}, ${STEP_LABEL[stp.kind]}${stp.mins ? `, ${stp.mins} phút` : ""}${isDone ? ", đã xong" : locked ? ", cần đăng ký" : ""}`;
                            const inner = (
                              <>
                                <Icon d={STEP_ICON[stp.kind]} stroke="#4B5565" className="flex-none" />
                                <span className="min-w-0 flex-1 text-[15px]">{stp.title}</span>
                                {stp.mins ? <span className="text-[13px] whitespace-nowrap text-muted">{stp.mins} phút</span> : null}
                                <span
                                  aria-hidden="true"
                                  className={
                                    "flex h-[22px] w-[22px] flex-none items-center justify-center rounded-full " +
                                    (isDone ? "bg-ok" : "border-[1.5px] border-edge bg-surface")
                                  }
                                >
                                  {isDone ? (
                                    <Icon d="M5 12l5 5L19 7" size={14} stroke="#FFFFFF" width={2.4} />
                                  ) : locked ? (
                                    <Icon d="M8 11h8v8H8zM10 11V9a2 2 0 0 1 4 0v2" size={14} stroke="#9AA3B2" width={2.4} />
                                  ) : null}
                                </span>
                              </>
                            );
                            return (
                              <li key={stp.id}>
                                {locked ? (
                                  <span aria-label={label} className="-mx-2 flex min-h-11 items-center gap-3 rounded-lg px-2 py-1 text-ink">
                                    {inner}
                                  </span>
                                ) : (
                                  <Link href={stepHref(slug, stp.id)} aria-label={label} className="-mx-2 flex min-h-11 items-center gap-3 rounded-lg px-2 py-1 text-ink no-underline hover:bg-bg hover:text-ink">
                                    {inner}
                                  </Link>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

/** Ô "Hoàn thành khoá học" ở cột phải. */
export function CompletionCard() {
  const { state, modules } = useLearner();
  const p = courseProgress(modules, state.done);
  const finished = !!state.completedAt;
  return (
    <section className="flex flex-col items-start gap-3 rounded-xl border border-line bg-surface p-6">
      <span className={`flex h-12 w-12 items-center justify-center rounded-xl ${finished ? "bg-ok-soft" : "bg-bg"}`}>
        <Icon d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4" size={26} stroke={finished ? "#1D6E47" : "#4B5565"} />
      </span>
      <h2 className="text-lg font-bold">Hoàn thành khoá học</h2>
      <p className="text-sm leading-relaxed text-muted">
        Học xong mọi bước và đạt mọi quiz (đúng từ 80% số câu), khoá được đánh dấu “Đã hoàn thành” trong Khoá học của tôi.
        {state.enrolled && !finished ? ` Còn ${p.total - p.doneCount} bước.` : ""}
      </p>
    </section>
  );
}

/** "Theo dõi việc học của bạn": chỉ hiện khi chưa đăng nhập. */
export function SignInPrompt() {
  const { state, signIn } = useLearner();
  if (!state.ready || state.signedIn) return null;
  return (
    <section className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4 rounded-xl bg-accent-soft p-7">
      <div className="flex flex-[1_1_320px] flex-col gap-1.5">
        <h2 className="text-xl font-bold">Theo dõi việc học của bạn</h2>
        <p className="text-[15px] leading-relaxed">Đăng nhập để đăng ký khoá, đánh dấu bước đã học và xem lại các khoá ở mục Khoá học của tôi.</p>
      </div>
      <button type="button" onClick={signIn} className={btnPrimaryLg}>
        Đăng nhập
      </button>
    </section>
  );
}
