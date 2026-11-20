import { describe, expect, it } from "vitest";
import {
  buildTree,
  filterRows,
  gradeNote,
  invalidCodes,
  nextAction,
  parseCodes,
  scoreText,
  stepViews,
  tabCounts,
  type CurriculumLesson,
  type KhbdRow,
} from "./khbd";

const row = (over: Partial<KhbdRow>): KhbdRow => ({
  id: "d1",
  title: "Bài 2. AI là gì?",
  grade: 6,
  topic_name: "Chủ đề 1",
  created_mode: "soan_lai",
  periods: 2,
  updated_at: "2026-11-20T07:00:00Z",
  current_version_id: "v1",
  version_no: 1,
  warnings: 2,
  latest_job_id: "j1",
  list_status: "in_review",
  ...over,
});

describe("gradeNote", () => {
  it("chặn lớp 1–3, cảnh báo lớp 4–5, theo khung NLS từ lớp 6", () => {
    expect(gradeNote(3).tone).toBe("err");
    expect(gradeNote(5).tone).toBe("warn");
    expect(gradeNote(8)).toEqual({ tone: "ok", text: expect.stringContaining("khung NLS lớp 8") });
  });
});

describe("mã 2422", () => {
  it("tách, bỏ trùng và kiểm đúng lớp", () => {
    expect(parseCodes("6.C2.1, 6.C2.3;6.C2.1  ")).toEqual(["6.C2.1", "6.C2.3"]);
    expect(invalidCodes(["6.C2.1", "7.C1.1", "abc"], 6)).toEqual(["7.C1.1", "abc"]);
  });
});

describe("buildTree", () => {
  it("nhóm theo cấp → chủ đề, sắp theo số bài", () => {
    const l = (n: number, topic = 1): CurriculumLesson => ({
      id: `l${n}`,
      level: "thcs",
      grade: 6,
      topic_no: topic,
      topic_name: topic === 1 ? "Nền tảng" : "Máy học",
      lesson_no: n,
      title: `Bài ${n}`,
      periods: 1,
    });
    const tree = buildTree([l(3), l(1), l(9, 2)]);
    const thcs = tree.find((t) => t.key === "thcs")!;
    expect(thcs.topics.map((t) => t.label)).toEqual(["Chủ đề 1: Nền tảng", "Chủ đề 2: Máy học"]);
    expect(thcs.topics[0].lessons.map((x) => x.lesson_no)).toEqual([1, 3]);
    expect(tree.find((t) => t.key === "thpt")!.topics).toEqual([]);
  });
});

describe("danh sách KHBD", () => {
  const rows = [
    row({ id: "a" }),
    row({ id: "b", title: "Bài 3. AI tạo sinh", list_status: "approved", grade: 7 }),
    row({ id: "c", title: "Đạo đức AI", created_mode: "bai_moi", list_status: "error", current_version_id: null, version_no: null }),
  ];
  it("tìm không dấu, lọc lớp và cách soạn", () => {
    expect(filterRows(rows, { q: "dao duc", grade: "all", source: "all" }).map((r) => r.id)).toEqual(["c"]);
    expect(filterRows(rows, { q: "", grade: "7", source: "all" }).map((r) => r.id)).toEqual(["b"]);
    expect(filterRows(rows, { q: "", grade: "all", source: "bai_moi" }).map((r) => r.id)).toEqual(["c"]);
  });
  it("đếm theo tab và chọn việc tiếp", () => {
    const c = tabCounts(rows);
    expect([c.all, c.in_review, c.approved, c.error]).toEqual([3, 1, 1, 1]);
    expect(nextAction(rows[0])).toEqual({ label: "Duyệt bài", href: "/noi-bo/khbd/a" });
    expect(nextAction(rows[2])?.label).toBe("Xem lỗi");
  });
});

describe("tiến độ và rubric", () => {
  it("trạng thái từng bước", () => {
    const v = stepViews([
      { step: "doc_nguon", status: "succeeded", started_at: null, finished_at: null, error: null },
      { step: "chon_ma_2422", status: "running", started_at: null, finished_at: null, error: null },
    ]);
    expect(v.map((s) => s.state)).toEqual(["done", "now", "todo", "todo", "todo", "todo"]);
  });
  it("tổng điểm rubric bỏ qua N/A", () => {
    expect(scoreText({})).toBe("Chưa chấm");
    expect(scoreText({ 0: 3, 1: 2, 2: "na" })).toBe("5 / 6 điểm · 3/7 tiêu chí");
  });
});
