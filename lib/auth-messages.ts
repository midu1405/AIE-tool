// Đổi lỗi đăng nhập của Supabase Auth thành câu tiếng Việt: nói lỗi gì và cách sửa.
export function passwordLoginError(code: string | undefined, message = ""): string {
  switch (code) {
    case "invalid_credentials":
      return "Email hoặc mật khẩu chưa đúng. Kiểm tra lại, hoặc nhờ quản trị đặt lại mật khẩu.";
    case "email_not_confirmed":
      return "Tài khoản chưa được xác nhận. Nhờ quản trị tạo lại tài khoản và tích “Auto Confirm User”.";
    case "user_banned":
      return "Tài khoản đang bị khoá. Liên hệ quản trị.";
    case "over_request_rate_limit":
      return "Bạn thử đăng nhập quá nhiều lần. Đợi vài phút rồi thử lại.";
    case "email_provider_disabled":
    case "provider_disabled":
      return "Đăng nhập bằng email đang tắt trên hệ thống. Báo quản trị bật Email trong Supabase › Authentication.";
    case "validation_failed":
      return "Email chưa đúng định dạng. Nhập dạng ten@aiedu.com.vn.";
    default:
      return `Chưa đăng nhập được${message ? `: ${message}` : ""}. Thử lại; nếu vẫn lỗi, báo quản trị kèm thời điểm thử.`;
  }
}
