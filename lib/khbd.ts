// Kiểu dữ liệu, nhãn và màu cho luồng KHBD (theo design/artboards TaoKHBD, TienDo, DanhSachKHBD, DuyetBai).
// Không phụ thuộc React để test được.
import { fold } from "@/lib/catalog";

export const STEP_KEYS = ["doc_nguon", "chon_ma_2422", "soan_khbd_spec", "kiem_tra", "luu_doc", "ghi_nhat_ky"] as const;
export type StepKey = (typeof STEP_KEYS)[number];
export const STEP_LABELS: Record<StepKey, string> = {
  doc_nguon: "Đọc bài nguồn",
  chon_ma_2422: "Chọn mã 2422",
  soan_khbd_spec: "Soạn KHBD + spec",
  kiem_tra: "Kiểm tra 2422 · 5588",
  luu_doc: "Lưu Google Doc",
  ghi_nhat_ky: "Ghi nhật ký",
};

export type JobStatus = "queued" | "running" | "succeeded" | "failed" | "canceled";
export type JobStep = { step: StepKey; status: JobStatus; started_at: string | null; finished_at: string | null; error: { message?: string } | null };

export type Chip = { label: string; bg: string; ink: string; edge?: string };

export const JOB_CHIPS: Record<JobStatus, Chip> = {
  succeeded: { label: "Xong", bg: "#E2F3EA", ink: "#1D6E47", edge: "#E3E6EB" },
  running: { label: "Đang chạy", bg: "#E8EEFB", ink: "#163B91", edge: "#C9D6F5" },
  failed: { label: "Lỗi", bg: "#FCECE3", ink: "#8A3A0C", edge: "#F2C7AE" },
  queued: { label: "Đang chờ", bg: "#EEF0F3", ink: "#4B5565", edge: "#E3E6EB" },
  canceled: { label: "Đã huỷ", bg: "#EEF0F3", ink: "#4B5565", edge: "#E3E6EB" },
};

export type ListStatus = "draft" | "running" | "in_review" | "changes_requested" | "approved" | "archived" | "error";

export const LIST_STATUS: Record<ListStatus, Chip> = {
  draft: { label: "Nháp", bg: "#EEF0F3", ink: "#4B5565" },
  running: { label: "Đang soạn", bg: "#E8EEFB", ink: "#163B91" },
  in_review: { label: "Chờ duyệt", bg: "#E8EEFB", ink: "#163B91" },
  changes_requested: { label: "Cần sửa", bg: "#FCECE3", ink: "#8A3A0C" },
  approved: { label: "Đã duyệt KHBD", bg: "#E2F3EA", ink: "#1D6E47" },
  archived: { label: "Lưu trữ", bg: "#EEF0F3", ink: "#4B5565" },
  error: { label: "Lỗi khi soạn", bg: "#FBE4E4", ink: "#9B1C1C" },
};

export const LIST_TABS: (ListStatus | "all")[] = ["all", "running", "in_review", "changes_requested", "approved", "error"];

export type KhbdRow = {
  id: string;
  title: string;
  grade: number;
  topic_name: string | null;
  created_mode: "soan_lai" | "bai_moi";
  periods: number;
  updated_at: string;
  current_version_id: string | null;
  version_no: number | null;
  warnings: number | null;
  latest_job_id: string | null;
  list_status: ListStatus;
  /** Bản hiện tại đã duyệt và người duyệt là người đặt soạn bài (được phép, hiện cờ để soát; chốt 26/11). */
  self_approved?: boolean | null;
};

export type ListFilters = { tab: ListStatus | "all"; q: string; grade: string; source: "all" | "soan_lai" | "bai_moi" };

export function filterRows(rows: KhbdRow[], f: Omit<ListFilters, "tab">) {
  const q = fold(f.q.trim());
  return rows.filter(
    (r) =>
      (!q || fold(r.title).includes(q)) &&
      (f.grade === "all" || String(r.grade) === f.grade) &&
      (f.source === "all" || r.created_mode === f.source),
  );
}

export function tabCounts(rows: KhbdRow[]) {
  return Object.fromEntries(LIST_TABS.map((t) => [t, t === "all" ? rows.length : rows.filter((r) => r.list_status === t).length])) as Record<
    ListStatus | "all",
    number
  >;
}

/** Việc tiếp theo cho mỗi dòng ở Danh sách KHBD. */
export function nextAction(r: KhbdRow): { label: string; href: string } | null {
  switch (r.list_status) {
    case "in_review":
      return { label: "Duyệt bài", href: `/noi-bo/khbd/${r.id}` };
    case "changes_requested":
    case "running":
      return { label: "Xem tiến độ", href: `/noi-bo/tien-do` };
    case "error":
      return { label: "Xem lỗi", href: `/noi-bo/tien-do` };
    case "approved":
      return { label: "Mở bản đã duyệt", href: `/noi-bo/khbd/${r.id}` };
    default:
      return r.current_version_id ? { label: "Mở", href: `/noi-bo/khbd/${r.id}` } : null;
  }
}

export type StepView = { key: StepKey; label: string; state: "done" | "now" | "error" | "todo" };

export function stepViews(steps: JobStep[]): StepView[] {
  return STEP_KEYS.map((key) => {
    const s = steps.find((x) => x.step === key);
    const state = !s
      ? "todo"
      : s.status === "succeeded"
        ? "done"
        : s.status === "running"
          ? "now"
          : s.status === "failed"
            ? "error"
            : "todo";
    return { key, label: STEP_LABELS[key], state };
  });
}

export const STEP_BAR: Record<StepView["state"], string> = { done: "#1D6E47", now: "#2152C5", error: "#C2410C", todo: "#E3E6EB" };

// ---------------------------------------------------------------- Tạo KHBD

export const TOPICS_BY_GRADE: Record<number, string[]> = {
  6: ["Nền tảng của công nghệ AI", "Máy tính học từ dữ liệu như thế nào?", "Thiên kiến trong trí tuệ nhân tạo"],
  7: ["Cây quyết định", "Giải quyết vấn đề bằng mô hình máy học", "Thẻ mô hình"],
  8: ["Dữ liệu và trí tuệ nhân tạo", "Sử dụng công cụ AI có trách nhiệm", "Kiến thức truyền thông trong kỷ nguyên AI"],
  9: ["Mô hình ngôn ngữ lớn", "Trí tuệ nhân tạo và cuộc sống", "Cơ hội nghề nghiệp"],
  10: ["Nền tảng của AI", "Máy tính hoạt động như thế nào?", "Thiên kiến trong trí tuệ nhân tạo", "Sử dụng AI trong học tập"],
  11: ["Cây quyết định", "Giải quyết vấn đề bằng máy học", "Thẻ mô hình", "Kiến thức truyền thông trong kỷ nguyên AI"],
  12: ["Mô hình ngôn ngữ lớn", "Sử dụng công cụ AI có trách nhiệm"],
};

export const BASES = [
  { key: "qd2422", label: "QĐ 2422", note: "bắt buộc", locked: true },
  { key: "cv5588", label: "CV 5588", note: "bắt buộc", locked: true },
  { key: "tt02", label: "TT 02", note: "chưa chốt tên văn bản" },
  { key: "tt16", label: "TT 16", note: "chưa chốt tên văn bản" },
  { key: "tt18", label: "TT 18", note: "chưa chốt tên văn bản" },
  { key: "tt85", label: "TT 85", note: "tăng cường, theo nhu cầu" },
] as const;

export const FORMATS = [
  { key: "chuyen_de", label: "Chuyên đề giáo dục AI (mặc định)" },
  { key: "long_ghep", label: "Lồng ghép trong môn học" },
  { key: "nhu_cau", label: "Hoạt động theo nhu cầu" },
] as const;
export type DeployFormat = (typeof FORMATS)[number]["key"];

export function gradeNote(grade: number): { text: string; tone: "err" | "warn" | "ok" } {
  if (grade <= 3) return { text: "Lớp 1–3 chưa có chuẩn trong skill nên chưa soạn được.", tone: "err" };
  if (grade <= 5)
    return { text: `Lớp ${grade} chưa có khung NLS trong skill: mục tiêu lấy từ tài liệu bạn đưa, Claude ghi rõ giả định.`, tone: "warn" };
  return {
    text: `Mục tiêu bài học lấy theo khung NLS lớp ${grade}; mã yêu cầu cần đạt lấy đúng lớp ${grade} theo QĐ 2422.`,
    tone: "ok",
  };
}

/** Tách ô "mã chỉ định" thành danh sách mã, bỏ trùng và khoảng trắng. */
export function parseCodes(input: string): string[] {
  return [...new Set(input.split(/[,;\s]+/).map((s) => s.trim()).filter(Boolean))];
}

/** Mã 2422 có dạng <lớp>.<chữ><số>.<số>, ví dụ 6.C2.1; kiểm đúng lớp. */
export function invalidCodes(codes: string[], grade: number): string[] {
  return codes.filter((c) => {
    const m = /^(\d{1,2})\.[A-Z]\d+\.\d+$/.exec(c);
    return !m || Number(m[1]) !== grade;
  });
}

export type CurriculumLesson = {
  id: string;
  level: "tieu_hoc" | "thcs" | "thpt";
  grade: number;
  topic_no: number;
  topic_name: string;
  lesson_no: number;
  title: string;
  periods: number;
};

export const LEVELS: { key: CurriculumLesson["level"]; label: string }[] = [
  { key: "tieu_hoc", label: "Tiểu học" },
  { key: "thcs", label: "THCS" },
  { key: "thpt", label: "THPT" },
];

export type TreeTopic = { id: string; label: string; grade: number; lessons: CurriculumLesson[] };

export function buildTree(lessons: CurriculumLesson[]) {
  return LEVELS.map((lv) => {
    const mine = lessons.filter((l) => l.level === lv.key);
    const topics = new Map<string, TreeTopic>();
    for (const l of [...mine].sort((a, b) => a.grade - b.grade || a.topic_no - b.topic_no || a.lesson_no - b.lesson_no)) {
      const id = `${lv.key}-${l.grade}-${l.topic_no}`;
      if (!topics.has(id)) topics.set(id, { id, label: `Chủ đề ${l.topic_no}: ${l.topic_name}`, grade: l.grade, lessons: [] });
      topics.get(id)!.lessons.push(l);
    }
    return { ...lv, topics: [...topics.values()] };
  });
}

// ---------------------------------------------------------------- Duyệt bài

export const CHECK_TAGS: Record<string, Chip> = {
  pass: { label: "Đạt", bg: "#E2F3EA", ink: "#1D6E47" },
  warn: { label: "Cần xem", bg: "#FFF4DB", ink: "#7A4B00" },
  fixed: { label: "Đã sửa", bg: "#E8EEFB", ink: "#163B91" },
};

export const CRITERIA = [
  "1. Nội dung kiến thức",
  "2. Hoạt động học tập",
  "3. Thời lượng",
  "4. Công nghệ & công cụ",
  "5. Mức độ phù hợp với HS",
  "6. Sản phẩm / Minh chứng",
  "7. An toàn khi sử dụng AI",
];

export type Score = 1 | 2 | 3 | "na";

export function scoreText(scores: Record<number, Score | undefined>) {
  let scored = 0;
  let total = 0;
  let na = 0;
  for (const v of Object.values(scores)) {
    if (v === "na") na++;
    else if (v) {
      scored++;
      total += v;
    }
  }
  if (scored + na === 0) return "Chưa chấm";
  return `${total} / ${scored * 3} điểm · ${scored + na}/7 tiêu chí`;
}

export type VersionContent = {
  mock?: boolean;
  objectives?: string[];
  codes?: string[];
  /** Mục "Thiết bị dạy học và học liệu" (mỗi phần tử một dòng). Bản soạn trước 23/11 chưa có. */
  equipment?: string[];
  activities?: { name: string; minutes: number; desc: string; product: string }[];
  checks?: { tag: string; text: string }[];
};

/**
 * Thứ tự các mục lớn của KHBD khi xem trước, theo mẫu KHBD mà skill aca-khbd-ai12 dùng (và canvas DuyetBai).
 * Đổi mẫu thì chỉ sửa ở đây; số La Mã đánh theo vị trí.
 */
export const KHBD_SECTIONS = [
  { key: "objectives", title: "Mục tiêu" },
  { key: "equipment", title: "Thiết bị dạy học và học liệu" },
  { key: "process", title: "Tiến trình dạy học" },
] as const;
export type KhbdSectionKey = (typeof KHBD_SECTIONS)[number]["key"];
export const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];

export function formatDate(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Asia/Ho_Chi_Minh" });
}

export function formatTime(iso: string | null | undefined) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Ho_Chi_Minh" });
}

/** Lỗi từ Supabase RPC → câu tiếng Việt. Hàm SQL đã raise tiếng Việt; lỗi mạng thì hướng dẫn thử lại. */
export function rpcErrorText(e: { message?: string } | null | undefined) {
  const m = e?.message ?? "";
  if (!m) return "Có lỗi chưa rõ. Thử lại; nếu vẫn lỗi, báo quản trị kèm thời điểm.";
  if (/fetch|network/i.test(m)) return "Mất kết nối tới máy chủ. Kiểm tra mạng rồi thử lại.";
  return m;
}
