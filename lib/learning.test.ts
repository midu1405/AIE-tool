import { describe, expect, it } from "vitest";
import { buildOutline, courseProgress, locateStep, nextLabel, type LModule } from "./learning";

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

describe("buildOutline + locateStep", () => {
  const raw = [
    { id: "m2", title: "HP2", position: 1, course_sections: [{ id: "s3", title: "P", position: 0, course_lessons: [{ id: "c", title: "C", position: 0, duration_minutes: 5, kind: "end" }] }] },
    {
      id: "m1",
      title: "HP1",
      position: 0,
      course_sections: [
        { id: "s2", title: "Sau", position: 1, course_lessons: [{ id: "b", title: "B", position: 0, duration_minutes: null, kind: "quiz", ready: true }] },
        { id: "s1", title: "Đầu", position: 0, course_lessons: [{ id: "a", title: "A", position: 0, duration_minutes: 3, kind: "reading" }] },
      ],
    },
  ];
  it("sắp xếp theo vị trí, loại lạ thành bài đọc", () => {
    const o = buildOutline(raw);
    expect(o.map((m) => m.lessons.map((l) => l.id))).toEqual([["a", "b"], ["c"]]);
    expect(o[0].lessons[0].kind).toBe("doc");
  });
  it("bước trước, sau và học phần kế", () => {
    const loc = locateStep(buildOutline(raw), "b")!;
    expect([loc.prev?.id, loc.next?.id, loc.moduleIndex, loc.indexInModule, loc.section.title, loc.nextModuleFirst?.id]).toEqual(["a", "c", 0, 1, "Sau", "c"]);
    expect(locateStep(buildOutline(raw), "x")).toBeNull();
  });
});
