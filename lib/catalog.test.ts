import { describe, expect, it } from "vitest";
import {
  EMPTY_FILTERS,
  applyFilters,
  countText,
  durBucket,
  filterChips,
  filterGroups,
  fold,
  hoursText,
  progressBadge,
  type CatalogCourse,
} from "./catalog";

const c = (over: Partial<CatalogCourse>): CatalogCourse => ({
  id: over.slug ?? "x",
  slug: "x",
  title: "Khoá",
  summary: "",
  topic: "ai",
  audiences: ["thcs"],
  hoursMin: 1,
  hoursMax: 2,
  format: "self",
  level: "basic",
  ...over,
});

const COURSES = [
  c({ slug: "hieu-biet-ai", title: "Hiểu biết AI cho giáo viên", topic: "ai", audiences: ["th", "thcs", "thpt", "ql"], hoursMax: 2 }),
  c({ slug: "gd-ai-thcs", title: "Dạy chuyên đề Giáo dục AI – THCS", topic: "teach", hoursMin: 4, hoursMax: 6, format: "guided" }),
  c({ slug: "an-toan", title: "An toàn, đạo đức khi dùng AI", topic: "safe", audiences: ["thpt"], hoursMin: 2, hoursMax: 3 }),
];

describe("fold", () => {
  it("bỏ dấu tiếng Việt và đ → d", () => {
    expect(fold("Đạo đức AN TOÀN")).toBe("dao duc an toan");
  });
});

describe("durBucket", () => {
  it("chia nhóm theo giờ tối đa, không chồng nhau", () => {
    expect(durBucket({ hoursMax: 2 })).toBe("short");
    expect(durBucket({ hoursMax: 2.5 })).toBe("mid");
    expect(durBucket({ hoursMax: 4 })).toBe("mid");
    expect(durBucket({ hoursMax: 6 })).toBe("long");
  });
});

describe("applyFilters", () => {
  it("tìm không dấu trong tên và mô tả", () => {
    expect(applyFilters(COURSES, { ...EMPTY_FILTERS, q: "dao duc" }, "default").map((x) => x.slug)).toEqual(["an-toan"]);
  });
  it("trong một nhóm là HOẶC, giữa các nhóm là VÀ", () => {
    const f = { ...EMPTY_FILTERS, topic: ["ai", "teach"], aud: ["thcs"] };
    expect(applyFilters(COURSES, f, "default").map((x) => x.slug)).toEqual(["hieu-biet-ai", "gd-ai-thcs"]);
  });
  it("sắp xếp theo thời lượng ngắn nhất và A–Z tiếng Việt", () => {
    expect(applyFilters(COURSES, EMPTY_FILTERS, "short")[0].slug).toBe("hieu-biet-ai");
    expect(applyFilters(COURSES, EMPTY_FILTERS, "az").map((x) => x.slug)).toEqual(["an-toan", "gd-ai-thcs", "hieu-biet-ai"]);
  });
});

describe("filterGroups", () => {
  it("số đếm của một nhóm bỏ qua lựa chọn của chính nhóm đó", () => {
    const groups = filterGroups(COURSES, { ...EMPTY_FILTERS, topic: ["ai"] });
    const topic = groups.find((g) => g.key === "topic")!;
    expect(topic.options.find((o) => o.value === "teach")!.count).toBe(1);
    const aud = groups.find((g) => g.key === "aud")!;
    expect(aud.options.find((o) => o.value === "thpt")!.count).toBe(1);
  });
});

describe("chữ hiển thị", () => {
  it("chip, đếm, giờ, huy hiệu tiến độ", () => {
    expect(filterChips({ ...EMPTY_FILTERS, fmt: ["guided"], q: " ai " }).map((x) => x.label)).toEqual(["Có hướng dẫn", "“ai”"]);
    expect(countText(3, 3)).toBe("Tất cả 3 khoá học");
    expect(countText(1, 3)).toBe("Hiển thị 1 / 3 khoá học");
    expect(hoursText(1.5, 2)).toBe("1,5–2 giờ");
    expect(progressBadge({ percent: 33, completed: false })).toBe("Đang học · 33%");
    expect(progressBadge({ percent: 100, completed: true })).toBe("Đã hoàn thành");
    expect(progressBadge({ percent: 75, completed: true })).toBe("Đã hoàn thành · Có bước mới");
    expect(progressBadge(undefined)).toBe("");
  });
});
