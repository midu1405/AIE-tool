// Logic danh mục khoá học, chuyển từ design/artboards/Main.dc.html. Không phụ thuộc React để test được.

export type Topic = "ai" | "teach" | "safe" | "digital";
export type Audience = "th" | "thcs" | "thpt" | "ql";
export type Format = "self" | "guided";
export type Level = "basic" | "advanced";

export type CatalogCourse = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  topic: Topic;
  audiences: Audience[];
  hoursMin: number;
  hoursMax: number;
  format: Format;
  level: Level;
  /** Khoá minh hoạ: hiện ở danh mục, chưa đăng ký và chưa nhận giấy được. */
  demo?: boolean;
};

export type Progress = { percent: number; completed: boolean };

export const TOPICS: Record<Topic, { label: string; tint: string; ink: string; icon: string }> = {
  ai: {
    label: "Hiểu biết AI",
    tint: "#E8EEFB",
    ink: "#2152C5",
    icon: "M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V17h5v-1.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z",
  },
  teach: { label: "Dạy học với AI", tint: "#E2F3EA", ink: "#1D6E47", icon: "M3 4h18v12H3zM8 20l4-4 4 4M7 9h6M7 12h9" },
  safe: {
    label: "An toàn & đạo đức AI",
    tint: "#FCECE3",
    ink: "#A3470F",
    icon: "M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6zM9 12l2 2 4-4",
  },
  digital: { label: "Năng lực số", tint: "#F1EAFB", ink: "#6A3D9E", icon: "M4 5h16v11H4zM8 20h8M12 16v4" },
};

export const AUDIENCES: Record<Audience, string> = { th: "Tiểu học", thcs: "THCS", thpt: "THPT", ql: "Cán bộ quản lý" };
export const FORMATS: Record<Format, string> = { self: "Tự học", guided: "Có hướng dẫn" };
export const LEVELS: Record<Level, string> = { basic: "Cơ bản", advanced: "Nâng cao" };

export type Duration = "short" | "mid" | "long";
export const DURATIONS: Record<Duration, string> = { short: "Tối đa 2 giờ", mid: "2–4 giờ", long: "Trên 4 giờ" };

export type FilterKey = "aud" | "topic" | "dur" | "fmt";
export type Filters = Record<FilterKey, string[]> & { q: string };
export const EMPTY_FILTERS: Filters = { q: "", aud: [], topic: [], dur: [], fmt: [] };

export type Sort = "default" | "short" | "az";

/** Chuẩn hoá để tìm không dấu: NFD, bỏ dấu, đ → d, chữ thường. */
export function fold(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
}

export function durBucket(c: Pick<CatalogCourse, "hoursMax">): Duration {
  return c.hoursMax <= 2 ? "short" : c.hoursMax <= 4 ? "mid" : "long";
}

type Group = { key: FilterKey; title: string; map: Record<string, string>; test: (c: CatalogCourse, v: string) => boolean };

export const GROUPS: Group[] = [
  { key: "aud", title: "Đối tượng", map: AUDIENCES, test: (c, v) => c.audiences.includes(v as Audience) },
  {
    key: "topic",
    title: "Chủ đề",
    map: Object.fromEntries(Object.entries(TOPICS).map(([k, t]) => [k, t.label])),
    test: (c, v) => c.topic === v,
  },
  { key: "dur", title: "Thời lượng", map: DURATIONS, test: (c, v) => durBucket(c) === v },
  { key: "fmt", title: "Hình thức", map: FORMATS, test: (c, v) => c.format === v },
];

/** Khoá có khớp bộ lọc không; `skip` bỏ qua một nhóm để đếm số khoá của từng lựa chọn trong nhóm đó. */
export function matches(c: CatalogCourse, f: Filters, skip: FilterKey | null = null): boolean {
  if (f.q && !fold(`${c.title} ${c.summary}`).includes(fold(f.q.trim()))) return false;
  for (const g of GROUPS) {
    if (g.key === skip) continue;
    const picked = f[g.key];
    if (picked.length && !picked.some((v) => g.test(c, v))) return false;
  }
  return true;
}

export function filterGroups(courses: CatalogCourse[], f: Filters) {
  return GROUPS.map((g) => {
    const pool = courses.filter((c) => matches(c, f, g.key));
    return {
      key: g.key,
      title: g.title,
      options: Object.entries(g.map).map(([value, label]) => ({
        value,
        label,
        checked: f[g.key].includes(value),
        count: pool.filter((c) => g.test(c, value)).length,
      })),
    };
  });
}

export function filterChips(f: Filters) {
  const chips: { key: FilterKey | "q"; value: string; label: string }[] = [];
  for (const g of GROUPS) for (const v of f[g.key]) chips.push({ key: g.key, value: v, label: g.map[v] ?? v });
  if (f.q.trim()) chips.push({ key: "q", value: f.q, label: `“${f.q.trim()}”` });
  return chips;
}

export function applyFilters(courses: CatalogCourse[], f: Filters, sort: Sort): CatalogCourse[] {
  const list = courses.filter((c) => matches(c, f));
  if (sort === "short") return [...list].sort((a, b) => a.hoursMin - b.hoursMin || a.hoursMax - b.hoursMax);
  if (sort === "az") return [...list].sort((a, b) => a.title.localeCompare(b.title, "vi"));
  return list;
}

export function countText(shown: number, total: number) {
  return shown === total ? `Tất cả ${total} khoá học` : `Hiển thị ${shown} / ${total} khoá học`;
}

export function audienceText(aud: Audience[]) {
  return aud.length === 4 ? "Mọi cấp học" : aud.map((a) => AUDIENCES[a]).join(", ");
}

export function hoursText(min: number, max: number) {
  const n = (x: number) => String(x).replace(".", ",");
  return min === max ? `${n(min)} giờ` : `${n(min)}–${n(max)} giờ`;
}

export function progressBadge(p: Progress | undefined) {
  if (!p) return "";
  // "Đã hoàn thành" lấy từ completed_at, không suy ra từ phần trăm: khoá thêm bước sau khi đã xong thì vẫn giữ (chốt 26/11).
  if (p.completed) return p.percent < 100 ? "Đã hoàn thành · Có bước mới" : "Đã hoàn thành";
  return `Đang học · ${p.percent}%`;
}
