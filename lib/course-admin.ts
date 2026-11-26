// Logic màn Quản lý khoá học (design/artboards/QuanLyKhoaHoc.dc.html). Không phụ thuộc React để test được.
import { AUDIENCES, fold, type Audience, type Format, type Level, type Topic } from "@/lib/catalog";
import type { Chip } from "@/lib/khbd";

export type CourseStatus = "draft" | "published" | "hidden";

export const COURSE_STATUS: Record<CourseStatus, Chip> = {
  published: { label: "Đã xuất bản", bg: "#E2F3EA", ink: "#1D6E47" },
  draft: { label: "Nháp", bg: "#EEF0F3", ink: "#4B5565" },
  hidden: { label: "Đã ẩn", bg: "#FFF4DB", ink: "#7A4B00" },
};

export type AdminCourse = {
  id: string;
  slug: string;
  title: string;
  status: CourseStatus;
  topic: Topic;
  audiences: Audience[];
  hours_min: number;
  hours_max: number;
  format: Format;
  level: Level;
  module_count: number;
  lesson_count: number;
  material_count: number;
  update_count: number;
  learner_count: number;
};

/** Đường dẫn khoá từ tên: bỏ dấu, chữ thường, nối bằng gạch ngang (khớp check slug trong DB). */
export function slugify(title: string) {
  return fold(title)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}

export function audienceShort(aud: Audience[]) {
  return aud.length === 4 ? "Mọi cấp học" : aud.length === 0 ? "Chưa chọn đối tượng" : aud.map((a) => AUDIENCES[a]).join(", ");
}

export type CourseForm = {
  title: string;
  slug: string;
  summary: string;
  description: string;
  topic: Topic;
  audiences: Audience[];
  hours_min: string;
  hours_max: string;
  format: Format;
  level: Level;
  outcomes: string;
  prerequisites: string;
  materials_needed: string;
  audience_note: string;
};

const listOf = (s: string) =>
  s
    .split("\n")
    .map((x) => x.replace(/^\s*[-•]\s*/, "").trim())
    .filter(Boolean);

/** Kiểm form trước khi gửi; trả danh sách lỗi theo ô (rỗng = hợp lệ). */
export function validateCourse(f: CourseForm): Partial<Record<keyof CourseForm, string>> {
  const e: Partial<Record<keyof CourseForm, string>> = {};
  if (!f.title.trim()) e.title = "Nhập tên khoá học.";
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(f.slug)) e.slug = "Đường dẫn chỉ gồm chữ thường không dấu, số và gạch ngang, ví dụ hieu-biet-ai.";
  const min = Number(f.hours_min.replace(",", "."));
  const max = Number(f.hours_max.replace(",", "."));
  if (!Number.isFinite(min) || min < 0) e.hours_min = "Giờ tối thiểu là số không âm.";
  if (!Number.isFinite(max) || max < min) e.hours_max = "Giờ tối đa phải lớn hơn hoặc bằng giờ tối thiểu.";
  if (f.audiences.length === 0) e.audiences = "Chọn ít nhất một đối tượng.";
  return e;
}

export function formToRow(f: CourseForm) {
  return {
    title: f.title.trim(),
    slug: f.slug,
    summary: f.summary.trim(),
    description: f.description.trim(),
    topic: f.topic,
    audiences: f.audiences,
    hours_min: Number(f.hours_min.replace(",", ".")),
    hours_max: Number(f.hours_max.replace(",", ".")),
    format: f.format,
    level: f.level,
    outcomes: listOf(f.outcomes),
    prerequisites: listOf(f.prerequisites),
    materials_needed: listOf(f.materials_needed),
    audience_note: f.audience_note.trim(),
  };
}

/** Lỗi khi lưu khoá → câu dễ hiểu (slug trùng là lỗi hay gặp nhất). */
export function courseSaveError(e: { code?: string; message?: string } | null) {
  if (!e) return "";
  if (e.code === "23505") return "Đường dẫn này đã có khoá khác dùng. Đổi đường dẫn rồi lưu lại.";
  if (e.code === "42501" || /row-level security/i.test(e.message ?? ""))
    return "Bạn không sửa được khoá này. Khoá đã xuất bản hoặc đã ẩn chỉ Academic lead sửa được.";
  // Database chạy lại danh sách tự kiểm khi xuất bản (courses_guard) và trả các mục còn thiếu.
  if (e.code === "23514") return `${e.message ?? "Khoá chưa đủ điều kiện."} Mở tab “Kiểm tra trước khi xuất bản” để sửa từng mục.`;
  return e.message ?? "Có lỗi chưa rõ. Thử lại; nếu vẫn lỗi, báo quản trị.";
}

export function publishHint(status: CourseStatus) {
  if (status === "published")
    return "Khoá đang hiện trên trang giáo viên. Ẩn thì người mới không thấy khoá; người đã đăng ký vẫn học tiếp và nhận giấy được.";
  if (status === "hidden") return "Khoá đang ẩn: người mới không thấy trong danh mục, người đã đăng ký vẫn học tiếp. Xuất bản lại để hiện.";
  return "Khoá chưa hiện trên trang giáo viên.";
}
