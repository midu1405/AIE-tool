"use client";
import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/Icon";
import { Notice } from "@/components/khbd/StatusChip";
import { type Topic, TOPICS } from "@/lib/catalog";

export type MyItem = {
  key: string;
  group: "learning" | "done" | "saved";
  title: string;
  topic: Topic | null;
  note: string;
  progress: number | null;
  href: string | null;
  enrolled?: boolean;
  /** Khoá đã xong: link trang giấy chứng nhận; certIssued = đã nhận giấy. */
  certHref?: string;
  certIssued?: boolean;
};

const TABS: [MyItem["group"], string][] = [
  ["learning", "Đang học"],
  ["done", "Đã hoàn thành"],
  ["saved", "Đã lưu"],
];

export function MyCoursesHeader({ children }: { children?: React.ReactNode }) {
  return (
    <section className="border-b border-line bg-surface">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-6 px-6 pt-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-2">
            <h1 className="text-[30px] leading-tight font-bold sm:text-[36px]">Khoá học của tôi</h1>
            <p className="text-base text-muted">Tiếp tục khoá đang học, xem lại khoá đã xong và các khoá bạn đã lưu.</p>
          </div>
          <Link
            href="/"
            className="flex min-h-11 items-center rounded-[10px] border border-edge bg-surface px-[18px] text-[15px] font-semibold text-ink no-underline"
          >
            Tìm thêm khoá học
          </Link>
        </div>
        {children ?? <div className="min-h-[52px]" />}
      </div>
    </section>
  );
}

export function MyCourses({ items, error }: { items: MyItem[]; error: string }) {
  // Mở tab có khoá: ưu tiên Đang học, rồi Đã hoàn thành, rồi Đã lưu.
  const [tab, setTab] = useState<MyItem["group"]>(() => TABS.find(([g]) => items.some((i) => i.group === g))?.[0] ?? "learning");
  const shown = items.filter((i) => i.group === tab);

  function onKey(e: React.KeyboardEvent, i: number) {
    const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!d) return;
    const next = TABS[(i + d + TABS.length) % TABS.length][0];
    setTab(next);
    document.getElementById(`tab-${next}`)?.focus();
  }

  return (
    <>
      <MyCoursesHeader>
        <div role="tablist" aria-label="Nhóm khoá học" className="flex flex-wrap gap-1">
          {TABS.map(([g, label], i) => {
            const active = g === tab;
            return (
              <button
                key={g}
                id={`tab-${g}`}
                type="button"
                role="tab"
                aria-selected={active}
                aria-controls="danh-sach-khoa"
                tabIndex={active ? 0 : -1}
                onClick={() => setTab(g)}
                onKeyDown={(e) => onKey(e, i)}
                className={
                  "flex min-h-[52px] cursor-pointer items-center gap-2 border-b-[3px] px-4 text-[15px] " +
                  (active ? "border-accent font-bold text-ink" : "border-transparent font-medium text-muted")
                }
              >
                {label}
                <span className="rounded-full bg-line-soft px-2 py-0.5 text-xs font-semibold text-ink">{items.filter((x) => x.group === g).length}</span>
              </button>
            );
          })}
        </div>
      </MyCoursesHeader>

      <main id="danh-sach-khoa" role="tabpanel" aria-labelledby={`tab-${tab}`} className="mx-auto flex max-w-[1200px] flex-col gap-4 px-6 pt-8 pb-14">
        {error && <Notice tone="err">{error}</Notice>}
        {shown.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-edge bg-surface px-6 py-12 text-center">
            <p className="text-lg font-semibold">Chưa có khoá học nào ở đây</p>
            <Link href="/" className="flex min-h-11 items-center rounded-[10px] bg-accent px-5 text-[15px] font-semibold text-white no-underline hover:bg-accent-dark">
              Xem danh mục khoá học
            </Link>
          </div>
        ) : (
          shown.map((c) => <Item key={c.key} c={c} />)
        )}
      </main>
    </>
  );
}

function Item({ c }: { c: MyItem }) {
  const t = c.topic ? TOPICS[c.topic] : null;
  const primary = c.group === "learning" ? "Tiếp tục học" : c.group === "done" ? "Xem lại khoá học" : c.enrolled ? "Vào khoá học" : "Bắt đầu học";
  const cert = c.group === "done" && c.certHref;
  return (
    <article className="flex flex-wrap items-center gap-5 rounded-xl border border-line bg-surface p-5">
      <div className="flex h-24 w-24 flex-none items-center justify-center rounded-[10px]" style={{ background: t?.tint ?? "#EEF0F3" }}>
        {t && <Icon d={t.icon} size={40} stroke={t.ink} width={1.6} />}
      </div>
      <div className="flex min-w-0 flex-[999_1_360px] flex-col gap-2">
        {t && (
          <span className="text-[13px] font-semibold" style={{ color: t.ink }}>
            {t.label}
          </span>
        )}
        <h2 className="text-[19px] leading-snug font-bold">
          {c.href ? (
            <Link href={c.href} className="text-ink no-underline">
              {c.title}
            </Link>
          ) : (
            c.title
          )}
        </h2>
        <p className="text-sm text-muted">{c.note}</p>
        {c.progress !== null && (
          <div className="flex max-w-[480px] items-center gap-3">
            <div
              role="progressbar"
              aria-label={`Tiến độ ${c.title}`}
              aria-valuenow={c.progress}
              aria-valuemin={0}
              aria-valuemax={100}
              className="h-2 flex-1 overflow-hidden rounded-full bg-line"
            >
              <div className={`h-full ${c.group === "done" ? "bg-ok" : "bg-accent"}`} style={{ width: `${c.progress}%` }} />
            </div>
            <span className="min-w-11 text-sm font-semibold">{c.progress}%</span>
          </div>
        )}
      </div>
      {c.href && (
        <div className="flex max-w-[220px] flex-[1_1_180px] flex-col gap-2">
          {cert && (
            <Link
              href={c.certHref!}
              className="flex min-h-11 items-center justify-center rounded-[10px] bg-accent px-3 text-[15px] font-semibold text-white no-underline hover:bg-accent-dark"
            >
              {c.certIssued ? "Giấy chứng nhận" : "Nhận giấy chứng nhận"}
            </Link>
          )}
          <Link
            href={c.group === "learning" ? `${c.href}#noi-dung` : c.href}
            className={
              cert
                ? "flex min-h-11 items-center justify-center rounded-[10px] border border-edge bg-surface text-[15px] font-semibold text-ink no-underline hover:bg-bg hover:text-ink"
                : "flex min-h-11 items-center justify-center rounded-[10px] bg-accent text-[15px] font-semibold text-white no-underline hover:bg-accent-dark"
            }
          >
            {primary}
          </Link>
        </div>
      )}
    </article>
  );
}
