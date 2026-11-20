"use client";
import { useEffect, useRef, useState } from "react";
import { DocBody } from "@/components/learn/DocBody";
import { Icon, ICONS } from "@/components/Icon";
import { Notice, StatusChip } from "@/components/khbd/StatusChip";
import { STEP_KINDS, STEP_LABEL, isHttpUrl, passNeed, quizProblems, videoEmbed, type QuizKey, type StepBody, type StepKind } from "@/lib/steps";
import { getBrowserClient } from "@/lib/supabase/client";
import { btnPrimary, btnSecondary, field, labelCls, textarea } from "@/lib/ui";
import type { LibraryItem, StudioStep } from "./CourseStudio";

type Q = { text: string; options: string[]; answer: number | null; explain: string };
type Run = (fn: () => PromiseLike<{ error: { code?: string; message?: string } | null }>) => Promise<boolean>;

const KIND_LABEL = { khbd: "KHBD", pbt: "PBT" } as const;
const READY = { label: "Sẵn sàng", bg: "#E2F3EA", ink: "#1D6E47" };
const DRAFT = { label: "Nháp", bg: "#EEF0F3", ink: "#4B5565" };

const TOOLBAR: [string, string, string][] = [
  ["Đ", "Chữ đậm", "**chữ đậm**"],
  ["N", "Chữ nghiêng", "*chữ nghiêng*"],
  ["H2", "Tiêu đề mục", "\n## Tiêu đề\n"],
  ["• Danh sách", "Danh sách", "\n- "],
  ["Link", "Chèn liên kết", "[chữ hiện ra](https://)"],
  ["Hình", "Chèn hình (dán link ảnh)", "\n![Mô tả hình](https://)\n"],
  ["Gợi ý khi dạy", "Chèn hộp Gợi ý khi dạy", "\n[Gợi ý khi dạy] "],
  ["Tránh", "Chèn hộp Tránh", "\n[Tránh] "],
  ["Thử ngay", "Chèn mục Thử ngay", "\n## Thử ngay\n1. "],
  ["Tóm tắt", "Chèn mục Tóm tắt", "\n## Tóm tắt\n- "],
];

function toQs(body: StepBody, key: QuizKey | null): Q[] {
  const qs = body.questions ?? [];
  return qs.map((q, i) => ({
    text: q.text,
    options: [...q.options, "", "", "", ""].slice(0, Math.max(4, q.options.length)),
    answer: key?.answers[i] ?? null,
    explain: key?.explains[i] ?? "",
  }));
}

// Ô soạn một bước (design/artboards/SoanNoiDung.dc.html, tab Nội dung). Lưu vào course_lessons (tên, loại, phút,
// sẵn sàng), lesson_contents (nội dung) và quiz_keys (đáp án, giải thích).
export function StepEditor(p: {
  step: StudioStep;
  path: string;
  canEdit: boolean;
  library: LibraryItem[];
  busy: boolean;
  run: Run;
  previewHref: string;
}) {
  const supabase = getBrowserClient();
  const s = p.step;
  const [title, setTitle] = useState(s.title);
  const [kind, setKind] = useState<StepKind>(s.kind);
  const [mins, setMins] = useState(s.mins ? String(s.mins) : "");
  const [b, setB] = useState<StepBody>(s.body);
  const [qs, setQs] = useState<Q[]>(() => (s.kind === "quiz" && (s.body.questions?.length ?? 0) > 0 ? toQs(s.body, s.key) : [{ text: "", options: ["", "", "", ""], answer: null, explain: "" }]));
  const [showPreview, setShowPreview] = useState(false);
  const [picker, setPicker] = useState(false);
  const [error, setError] = useState("");
  const ta = useRef<HTMLTextAreaElement>(null);
  const ro = !p.canEdit;
  const set = <K extends keyof StepBody>(k: K, v: StepBody[K]) => setB((x) => ({ ...x, [k]: v }));

  const cleanQs = qs.map((q) => ({ text: q.text.trim(), options: q.options.map((o) => o.trim()) }));
  const quizBody = { questions: cleanQs.map((q) => ({ text: q.text, options: trimEnd(q.options) })) };
  const quizKey: QuizKey = { answers: qs.map((q) => q.answer ?? -1), explains: qs.map((q) => q.explain.trim()) };
  const problems = kind === "quiz" ? quizProblems(quizBody, quizKey) : [];
  const minsBad = mins.trim() !== "" && !(Number(mins) > 0 && Number.isInteger(Number(mins)));

  function insert(snippet: string) {
    const el = ta.current;
    const text = b.text ?? "";
    const start = el?.selectionStart ?? text.length;
    const end = el?.selectionEnd ?? text.length;
    set("text", text.slice(0, start) + snippet + text.slice(end));
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + snippet.length, start + snippet.length);
    });
  }

  async function save(ready: boolean) {
    setError("");
    if (!title.trim()) return setError("Nhập tên bước trước khi lưu.");
    if (minsBad) return setError("Thời lượng là số phút nguyên dương, ví dụ 5.");
    const body: StepBody =
      kind === "doc"
        ? { text: b.text ?? "" }
        : kind === "video"
          ? { url: (b.url ?? "").trim(), intro: b.intro ?? "", watch: b.watch ?? "", transcript: b.transcript ?? "", captions: !!b.captions }
          : kind === "quiz"
            ? quizBody
            : kind === "reflect"
              ? { prompt: b.prompt ?? "", hints: b.hints ?? "", allow_link: b.allow_link !== false }
              : { message: b.message ?? "" };
    await p.run(async () => {
      const r1 = await supabase
        .from("course_lessons")
        .update({ title: title.trim(), kind, duration_minutes: mins.trim() ? Number(mins) : null, ready })
        .eq("id", s.id)
        .select("id")
        .single();
      if (r1.error) return r1;
      const r2 = await supabase.from("lesson_contents").upsert({ lesson_id: s.id, body }, { onConflict: "lesson_id" });
      if (r2.error || kind !== "quiz") return r2;
      return supabase.from("quiz_keys").upsert({ lesson_id: s.id, answers: quizKey.answers, explains: quizKey.explains }, { onConflict: "lesson_id" });
    });
  }

  const attached = new Set(s.materials.map((m) => m.documentId));
  return (
    <section aria-label="Soạn bước" className="flex min-w-0 flex-[999_1_480px] flex-col gap-4 rounded-xl border border-line bg-surface p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-[13px] text-muted">{p.path}</span>
          <h2 className="text-xl font-bold">{s.title}</h2>
        </div>
        <StatusChip chip={s.ready ? READY : DRAFT} />
      </div>

      <fieldset disabled={ro} className="flex flex-col gap-4">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="b-loai" className={labelCls}>
              Loại bước
            </label>
            <select id="b-loai" value={kind} onChange={(e) => setKind(e.target.value as StepKind)} className={field}>
              {STEP_KINDS.map((k) => (
                <option key={k} value={k}>
                  {STEP_LABEL[k]}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="b-phut" className={labelCls}>
              Thời lượng (phút)
            </label>
            <input id="b-phut" inputMode="numeric" value={mins} onChange={(e) => setMins(e.target.value)} className={field} aria-invalid={minsBad} />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="b-ten" className={labelCls}>
            Tên bước
          </label>
          <input id="b-ten" value={title} onChange={(e) => setTitle(e.target.value)} className={field} />
        </div>

        {kind === "doc" && (
          <div className="flex flex-col gap-1.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label htmlFor="b-noi-dung" className={labelCls}>
                Nội dung bài đọc
              </label>
              <button type="button" onClick={() => setShowPreview((v) => !v)} aria-pressed={showPreview} className="min-h-10 cursor-pointer text-sm font-semibold text-accent">
                {showPreview ? "Quay lại soạn" : "Xem như giáo viên"}
              </button>
            </div>
            {showPreview ? (
              <div className="rounded-lg border border-line p-4">
                <DocBody text={b.text} />
              </div>
            ) : (
              <>
                <div role="toolbar" aria-label="Chèn định dạng" className="flex flex-wrap gap-1 rounded-t-lg border border-b-0 border-edge bg-bg p-1.5">
                  {TOOLBAR.map(([label, aria, snip]) => (
                    <button key={label} type="button" aria-label={aria} title={aria} onClick={() => insert(snip)} className="h-9 min-w-10 cursor-pointer rounded-md px-2 text-[13px] font-bold hover:bg-surface">
                      {label}
                    </button>
                  ))}
                </div>
                <textarea
                  id="b-noi-dung"
                  ref={ta}
                  rows={12}
                  value={b.text ?? ""}
                  onChange={(e) => set("text", e.target.value)}
                  className={`${textarea} rounded-t-none font-mono text-[14px]`}
                  placeholder={"Đoạn mở đầu, 2–3 câu: bước này giúp giáo viên làm được gì.\n\n## Tiêu đề ý thứ nhất\nNội dung…\n\n[Gợi ý khi dạy] Một lưu ý dùng được ngay trên lớp."}
                />
                <span className="text-[13px] text-muted">
                  Cách đoạn bằng một dòng trống. “## ” là tiêu đề, “- ” là danh sách, **đậm**, *nghiêng*. Hình và liên kết phải là link https://.
                </span>
              </>
            )}
          </div>
        )}

        {kind === "video" && (
          <div className="flex flex-col gap-3.5">
            <Field id="v-link" label="Link video (YouTube hoặc Google Drive)">
              <input id="v-link" type="url" value={b.url ?? ""} onChange={(e) => set("url", e.target.value)} placeholder="https://youtu.be/..." className={field} />
            </Field>
            {(b.url ?? "").trim() && (
              <span className={`text-[13px] ${videoEmbed(b.url) ? "text-ok" : isHttpUrl(b.url) ? "text-warn" : "text-err"}`}>
                {videoEmbed(b.url)
                  ? "Nhúng được: giáo viên xem ngay trong trang."
                  : isHttpUrl(b.url)
                    ? "Không nhúng được link này: giáo viên sẽ mở ở tab mới."
                    : "Link phải bắt đầu bằng https://."}
              </span>
            )}
            <Field id="v-gioi-thieu" label="Lời giới thiệu">
              <textarea id="v-gioi-thieu" rows={2} value={b.intro ?? ""} onChange={(e) => set("intro", e.target.value)} className={textarea} />
            </Field>
            <Field id="v-de-y" label="Khi xem, để ý (mỗi dòng một ý)">
              <textarea id="v-de-y" rows={3} value={b.watch ?? ""} onChange={(e) => set("watch", e.target.value)} className={textarea} />
            </Field>
            <Field id="v-ban-ghi" label="Bản ghi lời video (bắt buộc trước khi xuất bản)">
              <textarea id="v-ban-ghi" rows={5} value={b.transcript ?? ""} onChange={(e) => set("transcript", e.target.value)} className={textarea} />
            </Field>
            <label htmlFor="v-phu-de" className="flex min-h-11 cursor-pointer items-center gap-2.5 text-[15px]">
              <input id="v-phu-de" type="checkbox" checked={!!b.captions} onChange={(e) => set("captions", e.target.checked)} className="h-[18px] w-[18px] accent-accent" />
              Video có phụ đề tiếng Việt
            </label>
          </div>
        )}

        {kind === "quiz" && (
          <div className="flex flex-col gap-3.5">
            <p className="rounded-lg bg-bg px-3.5 py-3 text-sm leading-relaxed text-muted">
              Giáo viên đạt khi đúng ít nhất 80% số câu ({passNeed(qs.length)} / {qs.length} câu với quiz này). Làm lại không giới hạn. Nên có từ 5 câu để giáo viên được sai
              một câu.
            </p>
            {qs.map((q, qi) => (
              <fieldset key={qi} className="flex flex-col gap-2.5 rounded-[10px] border border-line px-4 py-3.5">
                <legend className="px-1.5 text-sm font-semibold">Câu {qi + 1}</legend>
                <Field id={`cau-${qi}`} label="Câu hỏi">
                  <input id={`cau-${qi}`} value={q.text} onChange={(e) => setQs((x) => x.map((y, i) => (i === qi ? { ...y, text: e.target.value } : y)))} className={field} />
                </Field>
                <span className="text-[13px] font-semibold">Lựa chọn (chọn nút tròn ở đáp án đúng; để trống ô không dùng)</span>
                {q.options.map((o, oi) => (
                  <div key={oi} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name={`dung-${qi}`}
                      checked={q.answer === oi}
                      onChange={() => setQs((x) => x.map((y, i) => (i === qi ? { ...y, answer: oi } : y)))}
                      aria-label={`Lựa chọn ${oi + 1} của câu ${qi + 1} là đáp án đúng`}
                      className="mx-1.5 h-[18px] w-[18px] flex-none accent-accent"
                    />
                    <label htmlFor={`lc-${qi}-${oi}`} className="sr-only-label">
                      Câu {qi + 1}, lựa chọn {oi + 1}
                    </label>
                    <input
                      id={`lc-${qi}-${oi}`}
                      value={o}
                      onChange={(e) => setQs((x) => x.map((y, i) => (i === qi ? { ...y, options: y.options.map((z, j) => (j === oi ? e.target.value : z)) } : y)))}
                      className={`${field} min-w-0 flex-1`}
                    />
                  </div>
                ))}
                <Field id={`giai-thich-${qi}`} label="Giải thích (hiện sau khi nộp)">
                  <textarea
                    id={`giai-thich-${qi}`}
                    rows={2}
                    value={q.explain}
                    onChange={(e) => setQs((x) => x.map((y, i) => (i === qi ? { ...y, explain: e.target.value } : y)))}
                    className={textarea}
                  />
                </Field>
                {qs.length > 1 && (
                  <button type="button" onClick={() => setQs((x) => x.filter((_, i) => i !== qi))} className="self-start text-sm font-semibold text-err">
                    Xoá câu {qi + 1}
                  </button>
                )}
              </fieldset>
            ))}
            <button type="button" onClick={() => setQs((x) => [...x, { text: "", options: ["", "", "", ""], answer: null, explain: "" }])} className={`${btnSecondary} self-start border-dashed`}>
              + Thêm câu hỏi
            </button>
            {problems.length > 0 && <Notice tone="warn">Chưa đủ để xuất bản: {problems.slice(0, 4).join("; ")}.</Notice>}
          </div>
        )}

        {kind === "reflect" && (
          <div className="flex flex-col gap-3.5">
            <Field id="r-cau-hoi" label="Câu hỏi phản tư">
              <textarea id="r-cau-hoi" rows={3} value={b.prompt ?? ""} onChange={(e) => set("prompt", e.target.value)} className={textarea} />
            </Field>
            <Field id="r-goi-y" label="Gợi ý trả lời (mỗi dòng một ý)">
              <textarea id="r-goi-y" rows={3} value={b.hints ?? ""} onChange={(e) => set("hints", e.target.value)} className={textarea} />
            </Field>
            <label htmlFor="r-link" className="flex min-h-11 cursor-pointer items-center gap-2.5 text-[15px]">
              <input id="r-link" type="checkbox" checked={b.allow_link !== false} onChange={(e) => set("allow_link", e.target.checked)} className="h-[18px] w-[18px] accent-accent" />
              Cho dán link sản phẩm (Google Doc, Drive)
            </label>
            <p className="text-[13px] text-muted">Giáo viên phải lưu câu trả lời mới tính xong bước. Người phụ trách khoá xem được câu trả lời ở dưới.</p>
          </div>
        )}

        {kind === "end" && (
          <div className="flex flex-col gap-2.5">
            <p className="rounded-lg bg-bg px-3.5 py-3 text-sm leading-relaxed text-muted">
              Bước tổng kết tự liệt kê các phần của học phần, số bước đã xong và nút sang học phần tiếp theo.
            </p>
            <Field id="e-loi-nhan" label="Lời nhắn cuối học phần (không bắt buộc)">
              <textarea id="e-loi-nhan" rows={3} value={b.message ?? ""} onChange={(e) => set("message", e.target.value)} className={textarea} />
            </Field>
          </div>
        )}
      </fieldset>

      <div className="flex flex-col gap-2.5 rounded-[10px] border border-line px-4 py-3.5">
        <strong className="text-sm">Học liệu kèm bước</strong>
        <span className="text-[13px] text-muted">Chỉ gắn được KHBD/PBT đã duyệt; giáo viên thấy học liệu sau khi đăng ký khoá.</span>
        {s.materials.map((mt) => (
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
                {p.canEdit && (
                  <button
                    type="button"
                    disabled={p.busy}
                    onClick={() => p.run(() => supabase.from("lesson_materials").update({ document_version_id: mt.update!.versionId }).eq("id", mt.id))}
                    className="min-h-9 cursor-pointer rounded-lg border border-edge bg-surface px-3 font-semibold"
                  >
                    Gắn v{mt.update.versionNo}
                  </button>
                )}
              </>
            )}
            {p.canEdit && (
              <button
                type="button"
                disabled={p.busy}
                onClick={() => p.run(() => supabase.from("lesson_materials").delete().eq("id", mt.id))}
                aria-label={`Gỡ ${KIND_LABEL[mt.kind]} ${mt.title}`}
                className="flex h-10 w-10 cursor-pointer items-center justify-center"
              >
                <Icon d={ICONS.close} size={14} stroke="#4B5565" width={2.2} />
              </button>
            )}
          </div>
        ))}
        {p.canEdit && (
          <button type="button" onClick={() => setPicker((v) => !v)} aria-expanded={picker} className="min-h-10 cursor-pointer self-start text-sm font-semibold text-accent">
            + Gắn KHBD/PBT đã duyệt
          </button>
        )}
        {picker && (
          <div className="flex flex-col gap-1.5 rounded-[10px] border border-accent-edge bg-surface p-3">
            {p.library.length === 0 && <span className="text-[13px] text-muted">Chưa có KHBD nào. Tạo và duyệt KHBD ở mục Tạo KHBD.</span>}
            {p.library.map((it) => {
              const already = attached.has(it.documentId);
              const label = `${KIND_LABEL[it.kind]} · ${it.title}${it.grade ? ` · Lớp ${it.grade}` : ""}${it.versionNo ? ` · v${it.versionNo}` : ""}`;
              return (
                <div key={it.documentId} className={"flex min-h-10 items-center gap-2.5 text-[13px] " + (it.versionId ? "text-ink" : "text-muted")}>
                  <span className="flex-1">{label}</span>
                  <span className="text-xs">{already ? "Đã gắn" : it.state}</span>
                  {it.versionId && !already && (
                    <button
                      type="button"
                      disabled={p.busy}
                      onClick={async () => {
                        const ok = await p.run(() =>
                          supabase.from("lesson_materials").insert({ lesson_id: s.id, document_version_id: it.versionId, document_id: it.documentId, position: s.materials.length }),
                        );
                        if (ok) setPicker(false);
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
      </div>

      {s.kind === "reflect" && <Reflections lessonId={s.id} />}

      {error && <Notice tone="err">{error}</Notice>}
      <div className="flex flex-wrap items-center gap-2.5 border-t border-line pt-4">
        {p.canEdit && (
          <>
            <button type="button" disabled={p.busy} onClick={() => save(false)} className={btnSecondary}>
              Lưu nháp
            </button>
            <button type="button" disabled={p.busy} onClick={() => save(true)} className={btnPrimary}>
              Lưu và đánh dấu sẵn sàng
            </button>
          </>
        )}
        <a href={p.previewHref} target="_blank" rel="noreferrer" className="ml-auto flex min-h-11 items-center text-sm font-semibold">
          Xem trước như giáo viên
        </a>
      </div>
    </section>
  );
}

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className={labelCls}>
        {label}
      </label>
      {children}
    </div>
  );
}

function trimEnd(opts: string[]) {
  const out = [...opts];
  while (out.length > 2 && !out.at(-1)) out.pop();
  return out;
}

/** Câu trả lời phản tư của giáo viên cho bước này (người phụ trách khoá xem được, quyết định đã chốt 5). */
function Reflections({ lessonId }: { lessonId: string }) {
  const supabase = getBrowserClient();
  const [rows, setRows] = useState<{ user_id: string; answer: string; link: string; updated_at: string; name: string }[] | null>(null);
  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase.from("reflections").select("user_id, answer, link, updated_at").eq("lesson_id", lessonId).order("updated_at", { ascending: false });
      const list = (data ?? []) as { user_id: string; answer: string; link: string; updated_at: string }[];
      const { data: profs } = list.length
        ? await supabase.from("profiles").select("id, full_name, email").in("id", list.map((r) => r.user_id))
        : { data: [] };
      const names = new Map(((profs ?? []) as { id: string; full_name: string | null; email: string | null }[]).map((x) => [x.id, x.full_name || x.email || "Giáo viên"]));
      if (alive) setRows(list.map((r) => ({ ...r, name: names.get(r.user_id) ?? "Giáo viên" })));
    })();
    return () => {
      alive = false;
    };
  }, [supabase, lessonId]);
  return (
    <details className="rounded-[10px] border border-line px-4">
      <summary className="flex min-h-12 cursor-pointer items-center text-sm font-semibold">
        Câu trả lời của giáo viên {rows ? `(${rows.length})` : ""}
      </summary>
      <div className="flex flex-col gap-3 pb-4">
        {rows === null && <span className="text-sm text-muted">Đang tải…</span>}
        {rows?.length === 0 && <span className="text-sm text-muted">Chưa có giáo viên nào trả lời.</span>}
        {rows?.map((r) => (
          <div key={r.user_id} className="flex flex-col gap-1 rounded-lg bg-bg px-3 py-2.5 text-sm">
            <span className="font-semibold">
              {r.name} · {new Date(r.updated_at).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}
            </span>
            <span className="leading-relaxed whitespace-pre-line">{r.answer}</span>
            {r.link && (
              <a href={r.link} target="_blank" rel="noreferrer" className="break-all">
                {r.link}
              </a>
            )}
          </div>
        ))}
      </div>
    </details>
  );
}
