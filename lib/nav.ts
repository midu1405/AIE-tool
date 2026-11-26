const BASE = "http://noi-bo.invalid";

/**
 * Chặn mở chuyển hướng ra ngoài: chỉ nhận đường dẫn nội bộ bắt đầu bằng một dấu "/".
 * Trình duyệt coi "\" như "/" nên "/\evil.com" thành "//evil.com"; ký tự điều khiển (tab, xuống dòng) bị bỏ đi
 * nên "/\t/evil.com" cũng vậy. Ngoài kiểm chữ, đọc thử bằng URL để chắc vẫn ở cùng địa chỉ.
 */
export function safeNext(next: string | null | undefined, fallback = "/") {
  if (!next || !next.startsWith("/") || next.startsWith("//") || /[\\\u0000-\u001f\u007f]/.test(next)) return fallback;
  try {
    return new URL(next, BASE).origin === BASE ? next : fallback;
  } catch {
    return fallback;
  }
}
