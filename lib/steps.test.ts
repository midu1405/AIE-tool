import { describe, expect, it } from "vitest";
import { parseDoc, parseInline, passNeed, quizProblems, readinessChecks, shuffledOrder, videoEmbed, type CheckInput } from "@/lib/steps";

describe("passNeed (đạt 80%, làm tròn lên)", () => {
  it("3 câu cần 3, 5 câu cần 4, 10 câu cần 8", () => {
    expect(passNeed(3)).toBe(3);
    expect(passNeed(5)).toBe(4);
    expect(passNeed(10)).toBe(8);
    expect(passNeed(4)).toBe(4);
  });
});

describe("parseDoc", () => {
  it("tiêu đề, đoạn, danh sách, hộp gợi ý, hình", () => {
    const b = parseDoc("Mở đầu dòng 1\ndòng 2\n\n## Ý chính\n- một\n- hai\n1. bước\n[Gợi ý khi dạy] Cho học sinh **đoán** trước\n![Sơ đồ](https://x.org/a.png)");
    expect(b.map((x) => x.t)).toEqual(["p", "h", "ul", "ol", "tip", "img"]);
    expect(b[0]).toEqual({ t: "p", inl: [{ t: "text", v: "Mở đầu dòng 1 dòng 2" }] });
  });
  it("không nhận link/hình không phải http", () => {
    expect(parseInline("[x](javascript:alert(1))")).toEqual([{ t: "text", v: "[x](javascript:alert(1))" }]);
    expect(parseDoc("![a](javascript:x)")[0].t).toBe("p");
  });
  it("chữ đậm, nghiêng, link", () => {
    expect(parseInline("a **b** *c* [d](https://e.vn)")).toEqual([
      { t: "text", v: "a " },
      { t: "b", v: "b" },
      { t: "text", v: " " },
      { t: "i", v: "c" },
      { t: "text", v: " " },
      { t: "a", v: "d", href: "https://e.vn" },
    ]);
  });
});

describe("videoEmbed", () => {
  it("YouTube, youtu.be, Drive, link khác", () => {
    expect(videoEmbed("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=3")).toBe("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
    expect(videoEmbed("https://youtu.be/dQw4w9WgXcQ")).toBe("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
    expect(videoEmbed("https://drive.google.com/file/d/1AbCdEfGhIjKlMn/view?usp=sharing")).toBe("https://drive.google.com/file/d/1AbCdEfGhIjKlMn/preview");
    expect(videoEmbed("https://vimeo.com/1")).toBeNull();
    expect(videoEmbed("javascript:alert(1)")).toBeNull();
  });
});

describe("quizProblems", () => {
  it("báo thiếu đáp án và giải thích", () => {
    const body = { questions: [{ text: "C1", options: ["a", "b"] }, { text: "C2", options: ["a", ""] }] };
    expect(quizProblems(body, { answers: [1], explains: ["vì"] })).toEqual([
      "câu 2 cần ít nhất 2 lựa chọn",
      "câu 2 chưa chọn đáp án đúng",
      "câu 2 chưa có giải thích",
    ]);
    expect(quizProblems(body, { answers: [1, 0], explains: ["vì", "vì"] })).toEqual(["câu 2 cần ít nhất 2 lựa chọn"]);
  });
});

describe("readinessChecks", () => {
  const base: CheckInput = {
    course: { title: "K", summary: "Tóm", description: "Giới thiệu", audience_note: "GV", outcomes: ["a", "b", "c"], hours_min: 0.5, hours_max: 1 },
    modules: [
      {
        title: "HP1",
        sections: [
          {
            title: "P1",
            steps: [
              { id: "s1", title: "Đọc", kind: "doc", ready: true, mins: 20, body: { text: "x" }, key: null },
              { id: "s2", title: "Quiz", kind: "quiz", ready: true, mins: 10, body: { questions: [{ text: "C", options: ["a", "b"] }] }, key: { answers: [0], explains: ["v"] } },
              { id: "s3", title: "Hết", kind: "end", ready: true, mins: 1, body: {}, key: null },
            ],
          },
        ],
      },
    ],
    outdatedMaterials: 0,
  };
  it("khoá đủ: không có mục đỏ, không có mục vàng", () => {
    expect(readinessChecks(base).filter((c) => c.state !== "ok")).toEqual([]);
  });
  it("bước nháp và video thiếu bản ghi là mục đỏ, trỏ tới đúng bước", () => {
    const i = structuredClone(base);
    i.modules[0].sections[0].steps.splice(1, 0, { id: "v", title: "Video", kind: "video", ready: false, mins: 5, body: { url: "https://youtu.be/abcdefgh" }, key: null });
    const bad = readinessChecks(i).filter((c) => c.state === "bad");
    expect(bad.map((c) => c.stepId)).toEqual(["v", "v"]);
  });
  it("thiếu bước tổng kết và lệch thời lượng chỉ là nhắc nhở", () => {
    const i = structuredClone(base);
    i.modules[0].sections[0].steps.pop();
    i.course.hours_min = 2;
    i.course.hours_max = 3;
    const res = readinessChecks(i);
    expect(res.filter((c) => c.state === "bad")).toEqual([]);
    expect(res.filter((c) => c.state === "warn").length).toBe(2);
  });
});

describe("shuffledOrder", () => {
  it("giữ đủ các vị trí, chỉ đổi thứ tự", () => {
    for (let n = 0; n <= 6; n++) expect([...shuffledOrder(n)].sort()).toEqual(Array.from({ length: n }, (_, i) => i));
  });
  it("đổi thứ tự theo hàm ngẫu nhiên", () => {
    expect(shuffledOrder(3, () => 0)).toEqual([1, 2, 0]);
  });
});
