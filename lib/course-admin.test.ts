import { describe, expect, it } from "vitest";
import { audienceShort, courseSaveError, formToRow, slugify, validateCourse, type CourseForm } from "./course-admin";

const form = (over: Partial<CourseForm> = {}): CourseForm => ({
  title: "Hiểu biết AI",
  slug: "hieu-biet-ai",
  summary: "",
  description: "",
  topic: "ai",
  audiences: ["thcs"],
  hours_min: "1,5",
  hours_max: "2",
  format: "self",
  level: "basic",
  outcomes: " Ý 1 \n\n Ý 2 ",
  prerequisites: "- Biết dùng Google Docs\n",
  materials_needed: "",
  audience_note: "",
  ...over,
});

describe("slugify", () => {
  it("bỏ dấu, đ → d, gạch ngang gọn", () => {
    expect(slugify("Đạo đức & An toàn AI – THCS!")).toBe("dao-duc-an-toan-ai-thcs");
    expect(slugify("  ")).toBe("");
  });
});

describe("validateCourse / formToRow", () => {
  it("báo lỗi theo ô", () => {
    const e = validateCourse(form({ title: " ", slug: "Có Dấu", hours_min: "3", hours_max: "2", audiences: [] }));
    expect(Object.keys(e).sort()).toEqual(["audiences", "hours_max", "slug", "title"]);
    expect(validateCourse(form())).toEqual({});
  });
  it("đổi dấu phẩy thập phân và tách mục tiêu theo dòng", () => {
    const r = formToRow(form());
    expect(r.hours_min).toBe(1.5);
    expect(r.outcomes).toEqual(["Ý 1", "Ý 2"]);
    expect(r.prerequisites).toEqual(["Biết dùng Google Docs"]);
    expect(r.materials_needed).toEqual([]);
  });
});

describe("chữ hiển thị", () => {
  it("đối tượng và lỗi lưu", () => {
    expect(audienceShort(["th", "thcs", "thpt", "ql"])).toBe("Mọi cấp học");
    expect(courseSaveError({ code: "23505" })).toMatch(/Đường dẫn này đã có/);
    expect(courseSaveError({ message: "new row violates row-level security policy" })).toMatch(/Academic lead/);
    expect(courseSaveError({ code: "23514", message: "Chưa xuất bản được: 1 bước chưa “Sẵn sàng”." })).toMatch(/1 bước chưa .*Kiểm tra trước khi xuất bản/);
  });
});
