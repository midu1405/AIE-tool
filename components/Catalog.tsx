"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Icon, ICONS } from "@/components/Icon";
import {
  EMPTY_FILTERS,
  FORMATS,
  LEVELS,
  TOPICS,
  applyFilters,
  audienceText,
  countText,
  filterChips,
  filterGroups,
  hoursText,
  progressBadge,
  type CatalogCourse,
  type FilterKey,
  type Filters,
  type Progress,
  type Sort,
} from "@/lib/catalog";
import { getBrowserClient } from "@/lib/supabase/client";

// Danh mục khoá học: tìm, lọc 4 nhóm có số đếm, sắp xếp, chip. Theo design/artboards/Main.dc.html.
export function Catalog({ courses }: { courses: CatalogCourse[] }) {
  const [f, setF] = useState<Filters>(EMPTY_FILTERS);
  const [sort, setSort] = useState<Sort>("default");
  // Trên điện thoại (dưới 768 px) bộ lọc gọn thành nút "Bộ lọc (n)" để danh sách khoá lên trước.
  const [filtersOpen, setFiltersOpen] = useState(false);
  const progress = useMyProgress();

  const groups = useMemo(() => filterGroups(courses, f), [courses, f]);
  const chips = useMemo(() => filterChips(f), [f]);
  const list = useMemo(() => applyFilters(courses, f, sort), [courses, f, sort]);

  const toggle = (key: FilterKey, v: string) =>
    setF((cur) => ({ ...cur, [key]: cur[key].includes(v) ? cur[key].filter((x) => x !== v) : [...cur[key], v] }));
  const clearAll = () => setF(EMPTY_FILTERS);
  const hasFilters = chips.length > 0;

  return (
    <>
      <section className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-4 px-6 pt-10 pb-8">
          <h1 className="text-[40px] leading-[1.15] font-bold">Khoá học</h1>
          <p className="max-w-[720px] text-[17px] leading-relaxed text-muted">
            Khoá học trực tuyến giúp giáo viên hiểu AI, dạy chuyên đề Giáo dục AI và đưa công cụ số vào lớp học. Học theo tốc độ của
            bạn, tiến độ được lưu tự động.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <label htmlFor="tim-khoa-hoc" className="sr-only-label">
              Tìm khoá học
            </label>
            <div className="flex h-12 max-w-[560px] flex-[1_1_360px] items-center gap-2.5 rounded-[10px] border border-edge bg-bg px-3.5">
              <Icon d={ICONS.search} size={20} stroke="#4B5565" />
              <input
                id="tim-khoa-hoc"
                type="search"
                placeholder="Tìm theo tên hoặc nội dung khoá học"
                value={f.q}
                onChange={(e) => setF((cur) => ({ ...cur, q: e.target.value }))}
                className="h-11 min-w-0 flex-1 border-0 bg-transparent text-[15px] text-ink outline-none"
              />
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto flex max-w-[1200px] flex-wrap items-start gap-5 px-6 pt-6 pb-12 md:gap-8 md:pt-8">
        <aside
          aria-label="Bộ lọc khoá học"
          className="flex flex-[1_1_240px] flex-col gap-5 rounded-xl border border-line bg-surface p-3 md:max-w-[280px] md:p-5"
        >
          <div className="flex items-center justify-between gap-3">
            <h2 className="hidden text-[17px] font-bold md:block">Bộ lọc</h2>
            <button
              type="button"
              onClick={() => setFiltersOpen((v) => !v)}
              aria-expanded={filtersOpen}
              aria-controls="nhom-loc"
              className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-edge px-3.5 text-[15px] font-semibold md:hidden"
            >
              <Icon d="M4 6h16M7 12h10M10 18h4" size={18} stroke="#172033" width={2} />
              Bộ lọc{chips.filter((c) => c.key !== "q").length ? ` (${chips.filter((c) => c.key !== "q").length})` : ""}
            </button>
            {hasFilters && (
              <button type="button" onClick={clearAll} className="min-h-11 cursor-pointer px-1 text-sm font-semibold text-accent">
                Xoá tất cả
              </button>
            )}
          </div>
          <div id="nhom-loc" className={`${filtersOpen ? "flex" : "hidden"} flex-col gap-5 md:flex`}>
            {groups.map((g) => (
              <fieldset key={g.key} className="m-0 flex flex-col gap-0.5 border-0 p-0">
                <legend className="mb-1.5 p-0 text-[13px] font-bold tracking-[0.04em] text-muted uppercase">{g.title}</legend>
                {g.options.map((o) => {
                  const id = `loc-${g.key}-${o.value}`;
                  return (
                    <label key={id} htmlFor={id} className="flex min-h-11 cursor-pointer items-center gap-2.5 text-[15px]">
                      <input
                        id={id}
                        type="checkbox"
                        checked={o.checked}
                        onChange={() => toggle(g.key, o.value)}
                        className="m-0 h-[18px] w-[18px] accent-accent"
                      />
                      <span className="flex-1">{o.label}</span>
                      <span className="text-[13px] text-muted">{o.count}</span>
                    </label>
                  );
                })}
              </fieldset>
            ))}
          </div>
        </aside>

        <section aria-label="Danh sách khoá học" className="flex min-w-0 flex-[999_1_560px] flex-col gap-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-[15px] text-muted" aria-live="polite">
              {countText(list.length, courses.length)}
            </p>
            <div className="flex items-center gap-2.5">
              <label htmlFor="sap-xep" className="text-sm text-muted">
                Sắp xếp
              </label>
              <select
                id="sap-xep"
                value={sort}
                onChange={(e) => setSort(e.target.value as Sort)}
                className="h-11 rounded-lg border border-edge bg-surface px-3 text-sm text-ink"
              >
                <option value="default">Gợi ý</option>
                <option value="short">Thời lượng ngắn nhất</option>
                <option value="az">Tên A–Z</option>
              </select>
            </div>
          </div>

          {hasFilters && (
            <div className="flex flex-wrap gap-2">
              {chips.map((ch) => (
                <button
                  key={`${ch.key}-${ch.value}`}
                  type="button"
                  onClick={() => (ch.key === "q" ? setF((cur) => ({ ...cur, q: "" })) : toggle(ch.key, ch.value))}
                  aria-label={`Bỏ lọc ${ch.label}`}
                  className="flex min-h-9 cursor-pointer items-center gap-2 rounded-full border border-accent-edge bg-accent-soft px-3.5 text-sm text-accent-dark"
                >
                  {ch.label}
                  <Icon d={ICONS.close} size={14} stroke="#163B91" width={2.2} />
                </button>
              ))}
            </div>
          )}

          {list.length === 0 && (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-edge bg-surface px-6 py-12 text-center">
              <p className="text-lg font-semibold">{courses.length === 0 ? "Chưa có khoá học nào được xuất bản" : "Chưa có khoá học phù hợp"}</p>
              {courses.length === 0 && <p className="text-[15px] text-muted">AI Edu đang soạn nội dung các khoá. Bạn quay lại sau ít ngày nhé.</p>}
              {courses.length > 0 && (
                <>
                  <p className="text-[15px] text-muted">Thử bỏ bớt bộ lọc hoặc đổi từ khoá tìm kiếm.</p>
                  <button
                    type="button"
                    onClick={clearAll}
                    className="min-h-11 cursor-pointer rounded-[10px] bg-accent px-5 text-[15px] font-semibold text-white hover:bg-accent-dark"
                  >
                    Xoá bộ lọc
                  </button>
                </>
              )}
            </div>
          )}

          <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-5">
            {list.map((c) => (
              <CourseCard key={c.id} c={c} badge={progressBadge(progress[c.id])} />
            ))}
          </div>
        </section>
      </main>
    </>
  );
}

function CourseCard({ c, badge }: { c: CatalogCourse; badge: string }) {
  const t = TOPICS[c.topic];
  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-line bg-surface">
      <div className="relative flex h-32 items-center justify-center" style={{ background: t.tint }}>
        <Icon d={t.icon} size={48} stroke={t.ink} width={1.5} />
        {badge && <span className="absolute top-3 left-3 rounded-full bg-surface px-2.5 py-1 text-xs font-semibold text-ink">{badge}</span>}
      </div>
      <div className="flex flex-1 flex-col gap-2.5 p-5">
        <span className="self-start rounded-md px-2 py-[3px] text-xs font-semibold" style={{ background: t.tint, color: t.ink }}>
          {t.label}
        </span>
        <h3 className="text-lg leading-[1.35] font-bold">
          <Link href={`/khoa-hoc/${c.slug}`} className="text-ink no-underline hover:text-accent">
            {c.title}
          </Link>
        </h3>
        <p className="flex-1 text-sm leading-[1.55] text-muted">{c.summary}</p>
        <div className="flex flex-wrap gap-x-3.5 gap-y-1.5 border-t border-line-soft pt-3 text-[13px] text-muted">
          <span className="flex items-center gap-1.5">
            <Icon d={ICONS.clock} size={16} stroke="#4B5565" />
            {hoursText(c.hoursMin, c.hoursMax)}
          </span>
          <span>{FORMATS[c.format]}</span>
          <span>{LEVELS[c.level]}</span>
        </div>
        <p className="text-[13px] text-muted">Đối tượng: {audienceText(c.audiences)}</p>
      </div>
    </article>
  );
}

// Tiến độ của người đang đăng nhập (RLS chỉ trả của chính họ). Chưa đăng nhập thì rỗng.
function useMyProgress() {
  const [map, setMap] = useState<Record<string, Progress>>({});
  useEffect(() => {
    let alive = true;
    const supabase = getBrowserClient();
    (async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) return; // chưa đăng nhập: không có tiến độ, khỏi gọi API
      const { data } = await supabase.from("my_course_progress").select("course_id, percent, completed_at");
      if (!alive || !data) return;
      const rows = data as { course_id: string; percent: number; completed_at: string | null }[];
      setMap(Object.fromEntries(rows.map((r) => [r.course_id, { percent: Number(r.percent), completed: Boolean(r.completed_at) }])));
    })();
    return () => {
      alive = false;
    };
  }, []);
  return map;
}
