import { describe, expect, it } from "vitest";
import { loginErrorCode, safeNext } from "@/lib/nav";

describe("safeNext", () => {
  it("giữ đường dẫn nội bộ", () => {
    expect(safeNext("/noi-bo/khbd")).toBe("/noi-bo/khbd");
    expect(safeNext("/khoa-hoc/a?b=1#c")).toBe("/khoa-hoc/a?b=1#c");
  });

  it("chặn địa chỉ ngoài và đường dẫn trình duyệt hiểu thành địa chỉ ngoài", () => {
    for (const bad of ["https://evil.com", "//evil.com", "/\\evil.com", "/\\/evil.com", "/\t/evil.com", "/\n/evil.com", "evil.com", ""]) {
      expect(safeNext(bad)).toBe("/");
    }
    expect(safeNext(null, "/noi-bo")).toBe("/noi-bo");
  });
});

describe("loginErrorCode", () => {
  it("nhận ra lỗi chưa có trong danh sách dùng thử", () => {
    expect(loginErrorCode("chua_duoc_moi: Email này chưa có trong danh sách dùng thử của AI Edu Training Hub.")).toBe("chua-moi");
    expect(loginErrorCode("500: Error running hook URI: chua_duoc_moi: Email…")).toBe("chua-moi");
  });
  it("lỗi khác hoặc không có mô tả", () => {
    expect(loginErrorCode("Unable to exchange external code")).toBe("1");
    expect(loginErrorCode(null)).toBe("1");
  });
});
