// Khung khoá học 3 tầng: Học phần → Phần → Bước (quyết định đã chốt 5). Logic thuần, không phụ thuộc React.
// Bản mẫu: design/artboards/HocBuoc.dc.html (giáo viên học), SoanNoiDung.dc.html (nội bộ soạn).

export type StepKind = "doc" | "video" | "quiz" | "reflect" | "end";
export const STEP_KINDS: StepKind[] = ["doc", "video", "quiz", "reflect", "end"];

export const STEP_LABEL: Record<StepKind, string> = {
  doc: "Bài đọc",
  video: "Video",
  quiz: "Quiz",
  reflect: "Phản tư / nộp sản phẩm",
  end: "Tổng kết học phần",
};

export const STEP_ICON: Record<StepKind, string> = {
  doc: "M5 4a1 1 0 0 1 1-1h9l4 4v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1zM14 3v5h5M9 13h6M9 17h4",
  video: "M4 6h11v12H4zM15 10l5-3v10l-5-3",
  quiz: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.4V14M12 17.5h.01",
  reflect: "M4 20h4L19 9l-4-4L4 16zM14 6l4 4",
  end: "M5 21V4h11l-2 4 2 4H5",
};

export const asKind = (k: string | null | undefined): StepKind => (STEP_KINDS.includes(k as StepKind) ? (k as StepKind) : "doc");

/** Quiz đạt khi đúng ít nhất 80% số câu, làm tròn lên (khớp submit_quiz trong database). */
export const PASS_RATE = 0.8;
export const passNeed = (n: number) => Math.ceil(n * PASS_RATE - 1e-9);

// ---------------------------------------------------------------- nội dung bước (lesson_contents.body)
export type DocBody = { text?: string };
export type VideoBody = { url?: string; intro?: string; watch?: string; transcript?: string; captions?: boolean };
export type QuizQuestion = { text: string; options: string[] };
export type QuizBody = { questions?: QuizQuestion[] };
export type ReflectBody = { prompt?: string; hints?: string; allow_link?: boolean };
export type EndBody = { message?: string };
export type StepBody = DocBody & VideoBody & QuizBody & ReflectBody & EndBody;
export type QuizKey = { answers: number[]; explains: string[] };

export const lines = (s: string | undefined) =>
  (s ?? "")
    .split("\n")
    .map((x) => x.replace(/^\s*[-•]\s*/, "").trim())
    .filter(Boolean);

// ---------------------------------------------------------------- bài đọc: Markdown rút gọn
// Hỗ trợ: đoạn văn, "## Tiêu đề", "- danh sách", "1. danh sách số", "![mô tả](https://…)" (hình),
// "[Gợi ý khi dạy] …", "[Tránh] …" (hộp), **đậm**, *nghiêng*, [chữ](https://…) (liên kết).
// Không bao giờ chèn HTML: trang hiển thị dựng phần tử React từ các khối này.
export type Inline = { t: "text"; v: string } | { t: "b"; v: string } | { t: "i"; v: string } | { t: "a"; v: string; href: string };
export type Block =
  | { t: "p"; inl: Inline[] }
  | { t: "h"; inl: Inline[] }
  | { t: "ul"; items: Inline[][] }
  | { t: "ol"; items: Inline[][] }
  | { t: "tip"; inl: Inline[] }
  | { t: "avoid"; inl: Inline[] }
  | { t: "img"; alt: string; src: string };

const SAFE_URL = /^https?:\/\/[^\s<>"]+$/i;

export function parseInline(s: string): Inline[] {
  const out: Inline[] = [];
  const re = /\*\*([^*]+)\*\*|\*([^*]+)\*|\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g;
  let last = 0;
  for (let m = re.exec(s); m; m = re.exec(s)) {
    if (m.index > last) out.push({ t: "text", v: s.slice(last, m.index) });
    if (m[1] !== undefined) out.push({ t: "b", v: m[1] });
    else if (m[2] !== undefined) out.push({ t: "i", v: m[2] });
    else out.push({ t: "a", v: m[3], href: m[4] });
    last = m.index + m[0].length;
  }
  if (last < s.length) out.push({ t: "text", v: s.slice(last) });
  return out;
}

export function parseDoc(text: string | undefined): Block[] {
  const blocks: Block[] = [];
  let para: string[] = [];
  let list: { t: "ul" | "ol"; items: Inline[][] } | null = null;
  const flush = () => {
    if (para.length) blocks.push({ t: "p", inl: parseInline(para.join(" ")) });
    para = [];
    if (list) blocks.push(list);
    list = null;
  };
  for (const raw of (text ?? "").split("\n")) {
    const line = raw.trim();
    if (!line) {
      flush();
      continue;
    }
    let m: RegExpMatchArray | null;
    if ((m = line.match(/^#{2,3}\s+(.+)$/))) {
      flush();
      blocks.push({ t: "h", inl: parseInline(m[1]) });
    } else if ((m = line.match(/^!\[([^\]]*)\]\((\S+)\)$/)) && SAFE_URL.test(m[2])) {
      flush();
      blocks.push({ t: "img", alt: m[1], src: m[2] });
    } else if ((m = line.match(/^\[Gợi ý khi dạy\]\s*(.+)$/i))) {
      flush();
      blocks.push({ t: "tip", inl: parseInline(m[1]) });
    } else if ((m = line.match(/^\[Tránh\]\s*(.+)$/i))) {
      flush();
      blocks.push({ t: "avoid", inl: parseInline(m[1]) });
    } else if ((m = line.match(/^[-•*]\s+(.+)$/)) || (m = line.match(/^\d+[.)]\s+(.+)$/))) {
      const kind = /^\d/.test(line) ? "ol" : "ul";
      if (para.length) {
        blocks.push({ t: "p", inl: parseInline(para.join(" ")) });
        para = [];
      }
      if (!list || list.t !== kind) {
        if (list) blocks.push(list);
        list = { t: kind, items: [] };
      }
      list.items.push(parseInline(m[1]));
    } else {
      if (list) {
        blocks.push(list);
        list = null;
      }
      para.push(line);
    }
  }
  flush();
  return blocks;
}

// ---------------------------------------------------------------- video
/** Link YouTube / Google Drive → địa chỉ nhúng. Link khác trả null (trang hiện nút mở link). */
export function videoEmbed(url: string | undefined): string | null {
  const u = (url ?? "").trim();
  if (!SAFE_URL.test(u)) return null;
  let m = u.match(/^https?:\/\/(?:www\.|m\.)?youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/)([\w-]{6,})/i);
  if (!m) m = u.match(/^https?:\/\/youtu\.be\/([\w-]{6,})/i);
  if (m) return `https://www.youtube-nocookie.com/embed/${m[1]}`;
  m = u.match(/^https?:\/\/drive\.google\.com\/file\/d\/([\w-]{10,})/i) ?? u.match(/^https?:\/\/drive\.google\.com\/open\?id=([\w-]{10,})/i);
  if (m) return `https://drive.google.com/file/d/${m[1]}/preview`;
  return null;
}

export const isHttpUrl = (s: string | undefined) => SAFE_URL.test((s ?? "").trim());

// ---------------------------------------------------------------- kiểm tra trước khi xuất bản
export type CheckStep = { id: string; title: string; kind: StepKind; ready: boolean; mins: number | null; body: StepBody | null; key: QuizKey | null };
export type CheckInput = {
  course: { title: string; summary: string; description: string; audience_note: string; outcomes: string[]; hours_min: number; hours_max: number };
  modules: { title: string; sections: { title: string; steps: CheckStep[] }[] }[];
  outdatedMaterials: number;
};
export type Check = { state: "ok" | "bad" | "warn"; title: string; detail: string; stepId: string | null; tab: "info" | "content" | null };

const names = (xs: { title: string }[], max = 3) =>
  xs.slice(0, max).map((x) => x.title).join("; ") + (xs.length > max ? ` và ${xs.length - max} bước khác` : "");

/** Câu quiz thiếu gì (rỗng = đủ). Dùng cho danh sách kiểm tra và ô soạn quiz. */
export function quizProblems(body: StepBody | null, key: QuizKey | null): string[] {
  const qs = body?.questions ?? [];
  if (qs.length === 0) return ["chưa có câu hỏi"];
  const out: string[] = [];
  qs.forEach((q, i) => {
    const opts = q.options.filter((o) => o.trim());
    const a = key?.answers[i];
    if (!q.text.trim()) out.push(`câu ${i + 1} chưa có nội dung`);
    if (opts.length < 2) out.push(`câu ${i + 1} cần ít nhất 2 lựa chọn`);
    if (a === undefined || a < 0 || a >= q.options.length || !q.options[a]?.trim()) out.push(`câu ${i + 1} chưa chọn đáp án đúng`);
    if (!key?.explains[i]?.trim()) out.push(`câu ${i + 1} chưa có giải thích`);
  });
  return out;
}

export function readinessChecks(i: CheckInput): Check[] {
  const c = i.course;
  const steps = i.modules.flatMap((m) => m.sections.flatMap((s) => s.steps));
  const checks: Check[] = [];
  const add = (ok: boolean, bad: Check["state"], title: string, okDetail: string, badDetail: string, stepId: string | null = null, tab: Check["tab"] = null) =>
    checks.push(ok ? { state: "ok", title, detail: okDetail, stepId: null, tab: null } : { state: bad, title, detail: badDetail, stepId, tab: tab ?? (stepId ? "content" : null) });

  const missing = [
    !c.title.trim() && "tên khoá",
    !c.summary.trim() && "tóm tắt",
    !c.description.trim() && "giới thiệu",
    !c.audience_note.trim() && "“Dành cho ai”",
  ].filter(Boolean) as string[];
  add(missing.length === 0, "bad", "Có tên, tóm tắt, giới thiệu và “Dành cho ai”", `Tóm tắt ${c.summary.trim().length}/200 ký tự.`, `Còn thiếu: ${missing.join(", ")}.`, null, "info");

  const n = c.outcomes.filter((x) => x.trim()).length;
  add(n >= 3 && n <= 6, "bad", "“Bạn sẽ học được gì” có 3–6 ý", `${n} ý.`, `Đang có ${n} ý.`, null, "info");

  const emptyModule = i.modules.find((m) => m.sections.length === 0);
  const emptySection = i.modules.flatMap((m) => m.sections).find((s) => s.steps.length === 0);
  add(
    i.modules.length > 0 && !emptyModule && !emptySection,
    "bad",
    "Mỗi học phần có ít nhất một phần, mỗi phần có ít nhất một bước",
    `${i.modules.length} học phần, ${steps.length} bước.`,
    i.modules.length === 0 ? "Khoá chưa có học phần." : emptyModule ? `Học phần “${emptyModule.title}” chưa có phần.` : `Phần “${emptySection?.title ?? ""}” chưa có bước.`,
    null,
    "content",
  );

  const drafts = steps.filter((s) => !s.ready);
  add(drafts.length === 0, "bad", "Mọi bước đã “Sẵn sàng”", "Tất cả sẵn sàng.", `${drafts.length} bước còn nháp: ${names(drafts)}.`, drafts[0]?.id ?? null);

  const empty = steps.filter(
    (s) => (s.kind === "doc" && !s.body?.text?.trim()) || (s.kind === "reflect" && !s.body?.prompt?.trim()),
  );
  add(empty.length === 0, "bad", "Bài đọc và câu hỏi phản tư có nội dung", "Đủ nội dung.", `${empty.length} bước còn trống: ${names(empty)}.`, empty[0]?.id ?? null);

  const quizzes = steps.filter((s) => s.kind === "quiz");
  const badQuiz = quizzes.map((s) => ({ s, p: quizProblems(s.body, s.key) })).filter((x) => x.p.length);
  add(
    badQuiz.length === 0,
    "bad",
    "Mỗi câu quiz có đáp án đúng và giải thích",
    quizzes.length ? `${quizzes.length} quiz đủ đáp án và giải thích.` : "Khoá không có quiz.",
    badQuiz.length ? badQuiz.map((x) => `${x.s.title}: ${x.p.slice(0, 2).join(", ")}`).join(". ") + "." : "",
    badQuiz[0]?.s.id ?? null,
  );

  const videos = steps.filter((s) => s.kind === "video");
  const badVideo = videos.filter((s) => !isHttpUrl(s.body?.url) || !s.body?.transcript?.trim());
  add(
    badVideo.length === 0,
    "bad",
    "Mỗi video có link và bản ghi lời",
    videos.length ? `${videos.length} video đủ.` : "Khoá không có video.",
    `${badVideo.length} / ${videos.length} video thiếu link hoặc bản ghi lời: ${names(badVideo)}.`,
    badVideo[0]?.id ?? null,
  );

  const noEnd = i.modules.filter((m) => {
    const last = m.sections.at(-1)?.steps.at(-1);
    return !last || last.kind !== "end";
  });
  add(noEnd.length === 0, "warn", "Mỗi học phần kết thúc bằng bước tổng kết", "Học phần nào cũng có bước tổng kết.", `${noEnd.length} học phần chưa có bước tổng kết ở cuối: ${noEnd.map((m) => m.title).slice(0, 3).join("; ")}.`);

  const noMins = steps.filter((s) => !s.mins);
  const total = steps.reduce((a, s) => a + (s.mins ?? 0), 0);
  const inRange = total >= c.hours_min * 60 && total <= c.hours_max * 60;
  add(
    noMins.length === 0 && inRange,
    "warn",
    "Tổng thời lượng các bước khớp thời lượng ghi trên trang",
    `Các bước cộng lại ${hoursOf(total)}.`,
    noMins.length
      ? `${noMins.length} bước chưa ghi số phút: ${names(noMins)}.`
      : `Các bước cộng lại ${hoursOf(total)}, trang khoá ghi ${fmt(c.hours_min)}–${fmt(c.hours_max)} giờ.`,
    noMins[0]?.id ?? null,
  );

  add(i.outdatedMaterials === 0, "warn", "Học liệu gắn kèm là bản đã duyệt mới nhất", "Không có học liệu cũ.", `${i.outdatedMaterials} học liệu có bản mới hơn đã duyệt.`);
  return checks;
}

const fmt = (h: number) => String(h).replace(".", ",");
export const hoursOf = (mins: number) => `${fmt(Math.round((mins / 60) * 10) / 10)} giờ`;
