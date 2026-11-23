import { describe, expect, it } from "vitest";
import { certFileName, certMeta, cleanName, nameProblem, normalizeCode, viDate } from "./certificate";

describe("mã giấy chứng nhận", () => {
  it("chuẩn hoá chữ thường, khoảng trắng", () => {
    expect(normalizeCode(" aie-2026-7f3k9q ")).toBe("AIE-2026-7F3K9Q");
    expect(normalizeCode("AIE-2026-7F3K9Q")).toBe("AIE-2026-7F3K9Q");
  });
  it("loại mã sai dạng", () => {
    expect(normalizeCode("AIE-26-7F3K9Q")).toBeNull();
    expect(normalizeCode("AIE-2026-7F3K9")).toBeNull();
    expect(normalizeCode("../etc/passwd")).toBeNull();
  });
  it("tên file PDF", () => expect(certFileName("AIE-2026-7F3K9Q")).toBe("Giay-chung-nhan-AIE-2026-7F3K9Q.pdf"));
});

describe("họ tên in trên giấy", () => {
  it("gọn khoảng trắng", () => expect(cleanName("  Nguyễn   Thị  Lan ")).toBe("Nguyễn Thị Lan"));
  it("cần ít nhất 2 chữ, tối đa 80 ký tự", () => {
    expect(nameProblem("Lan")).toMatch(/ít nhất 2 chữ/);
    expect(nameProblem("   ")).toMatch(/ít nhất 2 chữ/);
    expect(nameProblem("Nguyễn Thị Lan")).toBeNull();
    expect(nameProblem(`Nguyễn ${"a".repeat(80)}`)).toMatch(/80 ký tự/);
  });
});

describe("ngày và dòng thông tin", () => {
  it("ngày theo giờ Việt Nam", () => expect(viDate("2026-11-23T18:30:00Z")).toBe("24/11/2026"));
  it("dòng thời lượng", () =>
    expect(certMeta({ hours_min: 1.5, hours_max: 2, module_count: 4, completed_at: "2026-11-23T03:00:00Z" })).toBe(
      "Thời lượng 1,5–2 giờ · 4 học phần · Hoàn thành ngày 23/11/2026",
    ));
});
