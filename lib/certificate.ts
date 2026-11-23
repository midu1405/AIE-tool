import { hoursText } from "@/lib/catalog";

/** Một giấy chứng nhận như verify_certificate() trả về. */
export type Certificate = {
  code: string;
  full_name: string;
  course_title: string;
  course_slug: string;
  hours_min: number;
  hours_max: number;
  module_count: number;
  completed_at: string;
  issued_at: string;
  revoked_at: string | null;
};

export const CODE_RE = /^AIE-\d{4}-[A-Z0-9]{6}$/;

/** Chuẩn hoá mã người dùng gõ: bỏ khoảng trắng, viết hoa. Trả null nếu sai dạng. */
export function normalizeCode(raw: string): string | null {
  const c = decodeURIComponent(raw).replace(/\s+/g, "").toUpperCase();
  return CODE_RE.test(c) ? c : null;
}

/** Họ tên in trên giấy: gọn khoảng trắng; hợp lệ khi có ít nhất 2 chữ và không quá 80 ký tự (khớp issue_certificate). */
export function cleanName(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}
export function nameProblem(raw: string): string | null {
  const n = cleanName(raw);
  if (n.split(" ").filter(Boolean).length < 2) return "Nhập họ và tên đầy đủ, ít nhất 2 chữ (ví dụ “Nguyễn Thị Lan”).";
  if (n.length > 80) return "Họ và tên dài quá 80 ký tự. Rút gọn rồi thử lại.";
  return null;
}

/** Ngày dd/mm/yyyy theo giờ Việt Nam. */
export function viDate(iso: string): string {
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Asia/Ho_Chi_Minh" }).format(
    new Date(iso),
  );
}

export function certMeta(c: Pick<Certificate, "hours_min" | "hours_max" | "module_count" | "completed_at">): string {
  return `Thời lượng ${hoursText(Number(c.hours_min), Number(c.hours_max))} · ${c.module_count} học phần · Hoàn thành ngày ${viDate(c.completed_at)}`;
}

export function certFileName(code: string): string {
  return `Giay-chung-nhan-${code}.pdf`;
}
