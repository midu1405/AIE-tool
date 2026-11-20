import { describe, expect, it } from "vitest";
import { courseProgress, nextLabel, type LModule } from "./learning";

const MODS: LModule[] = [
  { id: "m1", title: "Tổng quan", lessons: [{ id: "a", title: "A" }, { id: "b", title: "B" }] },
  { id: "m2", title: "AI là gì", lessons: [{ id: "c", title: "C" }] },
  { id: "m3", title: "Trống", lessons: [] },
];

describe("courseProgress", () => {
  it("tính phần trăm, học phần đang học và bài tiếp theo", () => {
    const p = courseProgress(MODS, new Set(["a", "b"]));
    expect([p.total, p.doneCount, p.percent, p.currentIndex]).toEqual([3, 2, 67, 1]);
    expect(p.moduleState.map((s) => s.complete)).toEqual([true, false, false]);
    expect(p.nextLesson?.id).toBe("c");
  });
  it("học hết thì không còn học phần đang học", () => {
    const p = courseProgress(MODS, new Set(["a", "b", "c"]));
    expect(p.percent).toBe(100);
    expect(p.currentIndex).toBe(-1);
    expect(nextLabel(MODS, new Set(["a", "b", "c"]))).toBe("Đã học hết các bài");
  });
  it("nhãn tiếp theo", () => {
    expect(nextLabel(MODS, new Set())).toBe("Tiếp theo: Học phần 1. Tổng quan");
    expect(nextLabel([], new Set())).toBe("Khoá chưa có bài");
  });
});
