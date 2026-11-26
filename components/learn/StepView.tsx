"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { Notice } from "@/components/khbd/StatusChip";
import { stepHref } from "@/components/learn/CourseLearner";
import { DocBody } from "@/components/learn/DocBody";
import { locateStep, type OModule } from "@/lib/learning";
import { STEP_ICON, STEP_LABEL, isHttpUrl, lines, passNeed, shuffledOrder, videoEmbed, type StepBody } from "@/lib/steps";
import { getBrowserClient } from "@/lib/supabase/client";
import { btnPrimary, btnSecondary, field, labelCls, textarea } from "@/lib/ui";

export type StepMaterial = { material_id: string; label: string | null; kind: "khbd" | "pbt"; title: string; version_no: number; web_view_link: string | null };
// Chưa đạt: database chỉ trả đúng/sai từng câu (results). Đạt rồi mới có đáp án và giải thích.
type QuizResult = { correct: number; total: number; passed: boolean; need: number; results: boolean[]; answers?: number[]; explains?: string[] };

// Màn học một bước (design/artboards/HocBuoc.dc.html): mục lục khoá bên trái, nội dung bước bên phải.
export function StepView(p: {
  /** home: trang khoá (khoá ẩn thì về "Khoá học của tôi", vì trang khoá chỉ hiện khoá đang xuất bản). */
  course: { id: string; slug: string; title: string; draft: boolean; home: string };
  modules: OModule[];
  stepId: string;
  body: StepBody;
  done: string[];
  reflection: { answer: string; link: string; updated_at: string } | null;
  lastAttempt: { correct: number; total: number; passed: boolean } | null;
  materials: StepMaterial[];
  preview: boolean;
}) {
  const router = useRouter();
  const supabase = getBrowserClient();
  const loc = locateStep(p.modules, p.stepId)!;
  const step = loc.step;
  const [done, setDone] = useState(() => new Set(p.done));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const isDone = done.has(step.id);
  const total = p.modules.reduce((n, m) => n + m.lessons.length, 0);
  const percent = total ? Math.round((done.size / total) * 100) : 0;
  const href = (id: string) => stepHref(p.course.slug, id);

  async function markDone(goNext: boolean) {
    setBusy(true);
    setError("");
    const { error } = await supabase.from("lesson_progress").insert({ lesson_id: step.id });
    setBusy(false);
    if (error && error.code !== "23505") return setError(`Chưa đánh dấu được: ${error.message}. Thử lại sau ít phút.`);
    setDone((d) => new Set(d).add(step.id));
    if (goNext && loc.next) router.push(href(loc.next.id));
    else router.refresh();
  }

  const markable = step.kind === "doc" || step.kind === "video" || step.kind === "end";
  const statusText = isDone
    ? "✓ Đã xong bước này"
    : step.kind === "quiz"
      ? "Hoàn thành khi đạt quiz"
      : step.kind === "reflect"
        ? "Hoàn thành khi lưu câu trả lời"
        : "Chưa đánh dấu xong";

  return (
    <div className="mx-auto flex max-w-[1280px] flex-wrap items-start gap-7 px-4 py-6 sm:px-6">
      <Outline {...p} done={done} percent={percent} moduleIndex={loc.moduleIndex} href={href} />

      <main className="flex min-w-0 flex-[999_1_560px] flex-col gap-5">
        <nav aria-label="Đường dẫn" className="flex flex-wrap gap-2 text-sm text-muted">
          <Link href="/khoa-hoc-cua-toi" className="text-muted">
            Khoá học của tôi
          </Link>
          <span aria-hidden="true">›</span>
          <Link href={p.course.home} className="text-muted">
            {p.course.title}
          </Link>
          <span aria-hidden="true">›</span>
          <span>
            Học phần {loc.moduleIndex + 1}. {loc.module.title}
          </span>
        </nav>

        {p.preview && (
          <Notice tone="info">
            Bạn đang xem trước với vai trò nhân viên{p.course.draft ? " (khoá chưa xuất bản)" : ""}. Tiến độ và câu trả lời phản tư không được lưu; quiz vẫn chấm để thử
            đáp án.
          </Notice>
        )}

        <article className="flex flex-col gap-5 rounded-xl border border-line bg-surface p-5 sm:p-8">
          <div className="flex flex-col gap-2.5">
            <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2 text-[13px] text-muted">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-2.5 py-1 font-semibold text-accent-dark">
                <Icon d={STEP_ICON[step.kind]} size={14} stroke="#163B91" width={2} />
                {STEP_LABEL[step.kind]}
              </span>
              {step.mins ? <span>{step.mins} phút</span> : null}
              <span>
                Bước {loc.indexInModule + 1} / {loc.module.lessons.length} của học phần {loc.moduleIndex + 1}
              </span>
              <span>Phần: {loc.section.title}</span>
            </div>
            <h1 className="text-[26px] leading-tight font-bold sm:text-[30px]">{step.title}</h1>
          </div>

          {step.kind === "doc" && <DocBody text={p.body.text} />}
          {step.kind === "video" && <VideoStep body={p.body} />}
          {step.kind === "quiz" && (
            <QuizStep
              key={step.id}
              lessonId={step.id}
              body={p.body}
              lastAttempt={p.lastAttempt}
              onPassed={() => {
                if (!p.preview) setDone((d) => new Set(d).add(step.id));
                router.refresh();
              }}
            />
          )}
          {step.kind === "reflect" && (
            <ReflectStep
              key={step.id}
              lessonId={step.id}
              body={p.body}
              initial={p.reflection}
              disabled={p.preview}
              onSaved={() => {
                setDone((d) => new Set(d).add(step.id));
                router.refresh();
              }}
            />
          )}
          {step.kind === "end" && (
            <div className="flex max-w-[720px] flex-col items-start gap-[18px]">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-ok-soft">
                <Icon d="M5 12l5 5L19 7" size={32} stroke="#1D6E47" width={2.4} />
              </span>
              <p className="text-lg font-semibold">
                {loc.moduleIndex === p.modules.length - 1 ? "Bạn đã đi tới cuối khoá học." : `Bạn đã đi hết Học phần ${loc.moduleIndex + 1}.`}
              </p>
              {p.body.message && <p className="text-base leading-[1.7] whitespace-pre-line">{p.body.message}</p>}
              <div className="flex flex-col gap-1.5 text-base leading-[1.7]">
                <strong className="text-[15px]">Trong học phần này bạn đã đi qua</strong>
                <ul className="list-disc pl-[22px]">
                  {loc.module.sections.map((s) => (
                    <li key={s.id}>{s.title}</li>
                  ))}
                </ul>
              </div>
              <p className="text-[15px] text-muted">
                {loc.module.lessons.length} bước · {loc.module.lessons.filter((l) => done.has(l.id)).length} bước đã xong
              </p>
            </div>
          )}

          {p.materials.length > 0 && (
            <div className="flex flex-col gap-2.5 rounded-[10px] border border-line px-[18px] py-4">
              <strong className="text-[15px]">Học liệu kèm bước này</strong>
              {p.materials.map((m) => {
                const label = (
                  <>
                    <span className="rounded-md bg-accent-soft px-2 py-0.5 text-xs font-bold text-accent-dark">{m.kind === "pbt" ? "PBT" : "KHBD"}</span>
                    {m.label || m.title} · v{m.version_no}
                  </>
                );
                return m.web_view_link ? (
                  <a key={m.material_id} href={m.web_view_link} target="_blank" rel="noreferrer" className="flex min-h-11 items-center gap-2.5 text-[15px]">
                    {label}
                  </a>
                ) : (
                  <span key={m.material_id} className="flex min-h-11 flex-wrap items-center gap-2.5 text-[15px] text-muted">
                    {label} · bản giả lập, chưa có Google Doc
                  </span>
                );
              })}
            </div>
          )}
        </article>

        {error && <Notice tone="err">{error}</Notice>}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-3.5">
          {loc.prev ? (
            <Link href={href(loc.prev.id)} className={`${btnSecondary} gap-2`}>
              <Icon d="M15 6l-6 6 6 6" size={16} stroke="#172033" width={2} />
              Bước trước
            </Link>
          ) : (
            <span className={`${btnSecondary} pointer-events-none gap-2 opacity-50`} aria-hidden="true">
              Bước trước
            </span>
          )}
          <span role="status" className={`text-sm font-semibold ${isDone ? "text-ok" : "text-muted"}`}>
            {statusText}
          </span>
          <div className="flex flex-wrap gap-2.5">
            {markable && !isDone && !p.preview ? (
              <button type="button" disabled={busy} onClick={() => markDone(true)} className={btnPrimary}>
                {step.kind === "end"
                  ? loc.next
                    ? `Hoàn thành học phần, sang học phần ${loc.moduleIndex + 2}`
                    : "Hoàn thành khoá học"
                  : loc.next
                    ? "Đánh dấu đã xong và sang bước tiếp"
                    : "Đánh dấu đã xong"}
              </button>
            ) : loc.next ? (
              <Link href={href(loc.next.id)} className={`${btnSecondary} gap-2`}>
                Bước tiếp
                <Icon d="M9 6l6 6-6 6" size={16} stroke="#172033" width={2} />
              </Link>
            ) : (
              <Link href={p.course.home} className={btnSecondary}>
                Về trang khoá học
              </Link>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function Outline(p: {
  course: { slug: string; title: string; home: string };
  modules: OModule[];
  stepId: string;
  done: Set<string>;
  percent: number;
  moduleIndex: number;
  href: (id: string) => string;
}) {
  // null = mặc định: mở ở màn rộng, gọn lại trên điện thoại để nội dung bước lên trước.
  const [show, setShow] = useState<boolean | null>(null);
  const [open, setOpen] = useState<number[]>([p.moduleIndex]);
  const total = p.modules.reduce((n, m) => n + m.lessons.length, 0);
  return (
    <aside aria-label="Mục lục khoá học" className="min-w-0 flex-[1_1_300px] overflow-hidden rounded-xl border border-line bg-surface md:max-w-[360px]">
      <div className="flex flex-col gap-2.5 border-b border-line px-[18px] pt-[18px] pb-3.5">
        <Link href={p.course.home} className="text-[15px] leading-snug font-bold text-ink no-underline">
          {p.course.title}
        </Link>
        <div className="flex justify-between text-[13px] text-muted">
          <span>
            {p.done.size} / {total} bước
          </span>
          <span>{p.percent}%</span>
        </div>
        <div role="progressbar" aria-label="Tiến độ khoá học" aria-valuenow={p.percent} aria-valuemin={0} aria-valuemax={100} className="h-2 overflow-hidden rounded-full bg-line">
          <div className="h-full bg-accent" style={{ width: `${p.percent}%` }} />
        </div>
        <button
          type="button"
          onClick={() => setShow((v) => !(v ?? window.matchMedia("(min-width: 768px)").matches))}
          aria-controls="muc-luc"
          className={`${btnSecondary} self-start gap-2`}
        >
          <Icon d="M4 6h16M4 12h16M4 18h16" size={16} stroke="#172033" width={2} />
          {show === null ? (
            <>
              <span className="md:hidden">Hiện mục lục</span>
              <span className="hidden md:inline">Ẩn mục lục</span>
            </>
          ) : show ? (
            "Ẩn mục lục"
          ) : (
            "Hiện mục lục"
          )}
        </button>
      </div>
      {show !== false && (
        <ol id="muc-luc" className={`flex-col py-1.5 ${show ? "flex" : "hidden md:flex"}`}>
          {p.modules.map((m, i) => {
            const isOpen = open.includes(i);
            const doneIn = m.lessons.filter((l) => p.done.has(l.id)).length;
            const complete = m.lessons.length > 0 && doneIn === m.lessons.length;
            const cur = i === p.moduleIndex;
            return (
              <li key={m.id} className={i ? "border-t border-line-soft" : ""}>
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? open.filter((x) => x !== i) : [...open, i])}
                  aria-expanded={isOpen}
                  className="flex min-h-[52px] w-full cursor-pointer items-center gap-2.5 px-[18px] py-3 text-left text-ink"
                >
                  <span
                    aria-hidden="true"
                    className={
                      "flex h-[26px] w-[26px] flex-none items-center justify-center rounded-full text-xs font-bold " +
                      (complete ? "bg-ok text-white" : cur ? "bg-accent text-white" : "bg-line text-ink")
                    }
                  >
                    {complete ? "✓" : i + 1}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-sm leading-snug font-semibold">
                      {i + 1}. {m.title}
                    </span>
                    <span className="text-xs text-muted">
                      {doneIn} / {m.lessons.length} bước
                    </span>
                  </span>
                  <Icon d="M6 9l6 6 6-6" size={16} stroke="#4B5565" width={2} className={isOpen ? "rotate-180" : ""} />
                </button>
                {isOpen && (
                  <div className="flex flex-col gap-1.5 pr-2.5 pb-2.5 pl-[18px]">
                    {m.sections.map((s) => (
                      <div key={s.id} className="flex flex-col">
                        <span className="pt-2 pr-2 pb-1 pl-9 text-xs font-bold tracking-wide text-muted uppercase">{s.title}</span>
                        {s.steps.map((st) => {
                          const d = p.done.has(st.id);
                          const current = st.id === p.stepId;
                          return (
                            <Link
                              key={st.id}
                              href={p.href(st.id)}
                              aria-current={current ? "step" : undefined}
                              aria-label={`${st.title}, ${STEP_LABEL[st.kind]}${d ? ", đã xong" : ""}`}
                              className={
                                "flex min-h-11 items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm leading-snug no-underline " +
                                (current ? "bg-accent-soft font-semibold text-accent-dark hover:text-accent-dark" : "text-ink hover:bg-bg hover:text-ink")
                              }
                            >
                              <span
                                aria-hidden="true"
                                className={"flex h-[18px] w-[18px] flex-none items-center justify-center rounded-full " + (d ? "bg-ok" : "border-[1.5px] border-edge bg-surface")}
                              >
                                {d && <Icon d="M5 12l5 5L19 7" size={11} stroke="#FFFFFF" width={3} />}
                              </span>
                              <Icon d={STEP_ICON[st.kind]} size={16} stroke="#4B5565" className="flex-none" />
                              <span className="min-w-0 flex-1">{st.title}</span>
                            </Link>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </aside>
  );
}

function VideoStep({ body }: { body: StepBody }) {
  const embed = videoEmbed(body.url);
  const watch = lines(body.watch);
  return (
    <div className="flex max-w-[760px] flex-col gap-4">
      {embed ? (
        <div className="aspect-video overflow-hidden rounded-xl bg-ink">
          <iframe
            src={embed}
            title="Video của bước học"
            className="h-full w-full"
            allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
            loading="lazy"
          />
        </div>
      ) : isHttpUrl(body.url) ? (
        <a href={body.url} target="_blank" rel="noreferrer" className={`${btnPrimary} self-start`}>
          Mở video ở tab mới
        </a>
      ) : (
        <p className="text-muted">Video chưa được gắn.</p>
      )}
      {body.captions && <p className="text-sm text-muted">Có phụ đề tiếng Việt</p>}
      {body.intro && <p className="text-base leading-[1.7]">{body.intro}</p>}
      {watch.length > 0 && (
        <div className="flex flex-col gap-1.5 text-base leading-[1.7]">
          <strong className="text-[15px]">Khi xem, để ý</strong>
          <ul className="list-disc pl-[22px]">
            {watch.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
      )}
      {body.transcript && (
        <details className="rounded-[10px] border border-line px-[18px]">
          <summary className="flex min-h-12 cursor-pointer items-center text-[15px] font-semibold">Bản ghi lời video</summary>
          <p className="mb-4 text-[15px] leading-[1.7] whitespace-pre-line text-muted">{body.transcript}</p>
        </details>
      )}
    </div>
  );
}

function QuizStep(p: { lessonId: string; body: StepBody; lastAttempt: { correct: number; total: number; passed: boolean } | null; onPassed: () => void }) {
  const supabase = getBrowserClient();
  const qs = p.body.questions ?? [];
  const [answers, setAnswers] = useState<(number | null)[]>(() => qs.map(() => null));
  // Thứ tự hiện lựa chọn: xáo lại mỗi lần làm (sau khi trang đã hiện, để không lệch với bản dựng ở server).
  const [order, setOrder] = useState<number[][]>(() => qs.map((q) => q.options.map((_, i) => i)));
  const [result, setResult] = useState<QuizResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const sizes = qs.map((q) => q.options.length).join(",");
  const shuffle = () => setOrder(sizes ? sizes.split(",").map((n) => shuffledOrder(Number(n))) : []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- xáo một lần sau khi trang hiện; Math.random không chạy ở server
    setOrder(sizes ? sizes.split(",").map((n) => shuffledOrder(Number(n))) : []);
  }, [sizes]);
  if (qs.length === 0) return <p className="text-muted">Quiz này chưa có câu hỏi.</p>;
  const need = passNeed(qs.length);
  const complete = answers.every((a) => a !== null);

  async function submit() {
    setBusy(true);
    setError("");
    const { data, error } = await supabase.rpc("submit_quiz", { p_lesson: p.lessonId, p_answers: answers });
    setBusy(false);
    if (error) return setError(`Chưa nộp được: ${error.message}`);
    const r = data as QuizResult;
    setResult(r);
    if (r.passed) p.onPassed();
  }

  return (
    <div className="flex max-w-[760px] flex-col gap-[18px]">
      <p className="text-base leading-[1.7]">
        Trả lời {qs.length} câu. Cần đúng ít nhất 80% số câu ({need} / {qs.length} câu) để hoàn thành bước. Làm lại bao nhiêu lần cũng được; đạt rồi bạn sẽ
        xem được đáp án và giải thích từng câu.
      </p>
      {p.lastAttempt && !result && (
        <p className="text-sm text-muted">
          Lần nộp gần nhất: đúng {p.lastAttempt.correct} / {p.lastAttempt.total} câu{p.lastAttempt.passed ? ", đã đạt" : ", chưa đạt"}.
        </p>
      )}
      {qs.map((q, qi) => {
        const ok = result?.results[qi];
        return (
          <fieldset key={qi} className="flex flex-col gap-2.5 rounded-xl border border-line px-5 py-[18px]">
            <legend className="px-1.5 text-[13px] font-semibold text-muted">
              Câu {qi + 1}
              {result && !result.passed && <span className={ok ? "text-ok" : "text-err"}> · {ok ? "Đúng" : "Chưa đúng"}</span>}
            </legend>
            <p className="text-base leading-normal font-semibold">{q.text}</p>
            {(order[qi] ?? []).map((oi) => {
              const o = q.options[oi] ?? "";
              if (!o.trim()) return null;
              const id = `cau-${qi}-${oi}`;
              const picked = answers[qi] === oi;
              // Đạt: tô đáp án đúng. Chưa đạt: chỉ tô lựa chọn của mình theo đúng/sai, không lộ đáp án.
              const right = result ? (result.answers ? result.answers[qi] === oi : picked && !!ok) : false;
              const wrong = result ? picked && !right : false;
              return (
                <label
                  key={oi}
                  htmlFor={id}
                  className={
                    "flex min-h-12 cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-[15px] " +
                    (right ? "border-[1.5px] border-ok bg-ok-soft" : wrong ? "border-[1.5px] border-err bg-err-soft" : picked ? "border-[1.5px] border-accent" : "border border-line")
                  }
                >
                  <input
                    id={id}
                    type="radio"
                    name={`cau-${qi}`}
                    checked={picked}
                    disabled={!!result || busy}
                    onChange={() => setAnswers((a) => a.map((x, i) => (i === qi ? oi : x)))}
                    className="h-[18px] w-[18px] accent-accent"
                  />
                  <span className="flex-1">{o}</span>
                  {right && <span className="text-[13px] font-semibold text-ok">{result?.answers ? "Đáp án đúng" : "Đúng"}</span>}
                  {wrong && <span className="text-[13px] font-semibold text-err">Chưa đúng</span>}
                </label>
              );
            })}
            {result?.explains?.[qi] && <p className="rounded-lg bg-bg px-3 py-2.5 text-sm leading-relaxed">{result.explains[qi]}</p>}
          </fieldset>
        );
      })}
      {result && (
        <div role="status" className={`rounded-[10px] px-4 py-3.5 text-[15px] font-semibold ${result.passed ? "bg-ok-soft text-ok" : "bg-warn-soft text-warn"}`}>
          {result.passed
            ? `Bạn đúng ${result.correct} / ${result.total} câu. Bước này đã hoàn thành. Đáp án và giải thích ở từng câu bên trên.`
            : `Bạn đúng ${result.correct} / ${result.total} câu. Cần đúng ít nhất ${result.need} câu (80%). Xem lại các câu chưa đúng rồi bấm Làm lại; thứ tự lựa chọn sẽ đổi.`}
        </div>
      )}
      {error && <Notice tone="err">{error}</Notice>}
      <div className="flex flex-wrap gap-3">
        {result ? (
          <button
            type="button"
            onClick={() => {
              setResult(null);
              setAnswers(qs.map(() => null));
              shuffle();
            }}
            className={btnSecondary}
          >
            Làm lại
          </button>
        ) : (
          <button type="button" onClick={submit} disabled={!complete || busy} className={btnPrimary}>
            {busy ? "Đang chấm…" : "Nộp bài"}
          </button>
        )}
        {!complete && !result && <span className="self-center text-sm text-muted">Chọn đáp án cho cả {qs.length} câu để nộp.</span>}
      </div>
    </div>
  );
}

function ReflectStep(p: {
  lessonId: string;
  body: StepBody;
  initial: { answer: string; link: string; updated_at: string } | null;
  disabled: boolean;
  onSaved: () => void;
}) {
  const supabase = getBrowserClient();
  const [answer, setAnswer] = useState(p.initial?.answer ?? "");
  const [link, setLink] = useState(p.initial?.link ?? "");
  const [savedAt, setSavedAt] = useState<string | null>(p.initial?.updated_at ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const hints = lines(p.body.hints);
  const linkBad = link.trim() !== "" && !isHttpUrl(link);

  async function save() {
    setBusy(true);
    setError("");
    const { error } = await supabase
      .from("reflections")
      .upsert({ lesson_id: p.lessonId, answer: answer.trim(), link: link.trim() }, { onConflict: "user_id,lesson_id" });
    if (error) {
      setBusy(false);
      return setError(`Chưa lưu được: ${error.message}. Thử lại sau ít phút.`);
    }
    const r = await supabase.from("lesson_progress").insert({ lesson_id: p.lessonId });
    setBusy(false);
    if (r.error && r.error.code !== "23505") return setError(`Đã lưu câu trả lời nhưng chưa đánh dấu xong bước: ${r.error.message}`);
    setSavedAt(new Date().toISOString());
    p.onSaved();
  }

  return (
    <div className="flex max-w-[760px] flex-col gap-4">
      <div className="flex flex-col gap-1.5 rounded-[10px] bg-[#F1EAFB] px-5 py-[18px]">
        <strong className="text-[15px] text-[#6A3D9E]">Câu hỏi phản tư</strong>
        <p className="text-base leading-[1.7] whitespace-pre-line">{p.body.prompt || "Bước này chưa có câu hỏi."}</p>
      </div>
      {hints.length > 0 && (
        <ul className="list-disc pl-[22px] text-[15px] leading-[1.7] text-muted">
          {hints.map((h) => (
            <li key={h}>{h}</li>
          ))}
        </ul>
      )}
      <label htmlFor="phan-tu" className={labelCls}>
        Câu trả lời của bạn
      </label>
      <textarea id="phan-tu" rows={6} value={answer} onChange={(e) => setAnswer(e.target.value)} disabled={p.disabled} className={textarea} />
      {p.body.allow_link !== false && (
        <>
          <label htmlFor="link-sp" className={labelCls}>
            Link sản phẩm (không bắt buộc)
          </label>
          <input
            id="link-sp"
            type="url"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="https://docs.google.com/..."
            disabled={p.disabled}
            className={field}
            aria-invalid={linkBad}
            aria-describedby={linkBad ? "link-sp-loi" : undefined}
          />
          {linkBad && (
            <span id="link-sp-loi" className="text-[13px] text-err">
              Link phải bắt đầu bằng https:// hoặc http://. Dán link Google Doc hoặc Drive của bạn.
            </span>
          )}
        </>
      )}
      <p className="text-[13px] text-muted">Bạn và người phụ trách khoá xem được câu trả lời này.</p>
      {error && <Notice tone="err">{error}</Notice>}
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={save} disabled={p.disabled || busy || !answer.trim() || linkBad} className={btnPrimary}>
          {busy ? "Đang lưu…" : savedAt ? "Lưu thay đổi" : "Lưu câu trả lời"}
        </button>
        {savedAt && (
          <span role="status" className="text-sm font-semibold text-ok">
            Đã lưu. Bước này được tính là hoàn thành; bạn sửa lại lúc nào cũng được.
          </span>
        )}
      </div>
    </div>
  );
}
