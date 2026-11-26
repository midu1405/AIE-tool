import { describe, expect, it } from "vitest";
import { safeNext } from "@/lib/nav";

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
