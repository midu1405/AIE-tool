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

/**
 * Mã lỗi đăng nhập đưa sang /dang-nhap?loi=… (trang hiện lời nhắn cố định theo mã, không hiện chữ lấy từ địa chỉ).
 * "chua-moi": hook_truoc_khi_tao_tai_khoan từ chối vì email chưa có trong danh sách dùng thử (thông báo bắt đầu bằng
 * "chua_duoc_moi:"). Lỗi khác: "1".
 */
export function loginErrorCode(errorDescription: string | null | undefined): "chua-moi" | "1" {
  return (errorDescription ?? "").includes("chua_duoc_moi") ? "chua-moi" : "1";
}
