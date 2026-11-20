import { describe, expect, it } from "vitest";
import { passwordLoginError } from "./auth-messages";

describe("passwordLoginError", () => {
  it("nói rõ lỗi sai mật khẩu và chưa xác nhận", () => {
    expect(passwordLoginError("invalid_credentials")).toMatch(/Email hoặc mật khẩu chưa đúng/);
    expect(passwordLoginError("email_not_confirmed")).toMatch(/Auto Confirm User/);
  });
  it("lỗi lạ vẫn có hướng xử lý", () => {
    expect(passwordLoginError(undefined, "network")).toBe(
      "Chưa đăng nhập được: network. Thử lại; nếu vẫn lỗi, báo quản trị kèm thời điểm thử.",
    );
  });
});
