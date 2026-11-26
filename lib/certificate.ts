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

/** Mã chuẩn: AIE-<năm>-XXXX-XXXX-XX (từ 26/11/2026) hoặc AIE-<năm>-XXXXXX (giấy cấp trước đó, vẫn hợp lệ). */
export const CODE_RE = /^AIE-\d{4}-(?:[A-Z0-9]{6}|[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{2})$/;

/**
 * Chuẩn hoá mã người dùng gõ: bỏ gạch, khoảng trắng, viết hoa rồi chia nhóm lại (khớp canonical_certificate_code ở
 * database). Trả null nếu sai dạng.
 */
export function normalizeCode(raw: string): string | null {
  let s: string;
  try {
    s = decodeURIComponent(raw);
  } catch {
    return null;
  }
  s = s.toUpperCase().replace(/[^A-Z0-9]/g, "");
  let m = s.match(/^AIE(\d{4})([A-Z0-9]{10})$/);
  if (m) return `AIE-${m[1]}-${m[2].slice(0, 4)}-${m[2].slice(4, 8)}-${m[2].slice(8)}`;
  m = s.match(/^AIE(\d{4})([A-Z0-9]{6})$/);
  return m ? `AIE-${m[1]}-${m[2]}` : null;
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
