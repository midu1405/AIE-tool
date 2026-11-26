"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { StatusChip } from "@/components/khbd/StatusChip";
import { LIST_STATUS, LIST_TABS, filterRows, formatDate, nextAction, tabCounts, type KhbdRow, type ListFilters } from "@/lib/khbd";
import { getBrowserClient } from "@/lib/supabase/client";
import { field } from "@/lib/ui";

// Danh sách KHBD theo design/artboards/DanhSachKHBD.dc.html. Dùng lại cho hàng chờ Duyệt bài (initialTab = in_review).
export function KhbdList({ rows, initialTab = "all" }: { rows: KhbdRow[]; initialTab?: ListFilters["tab"] }) {
  const router = useRouter();
  const [f, setF] = useState<ListFilters>({ tab: initialTab, q: "", grade: "all", source: "all" });

  // Bản giả lập chỉ chạy khi có trang mở: đuổi kịp một lần khi vào danh sách.
  const hasRunning = rows.some((r) => r.list_status === "running");
  useEffect(() => {
    if (!hasRunning) return;
    void getBrowserClient()
      .rpc("advance_mock_jobs", { p_step_seconds: 3 })
      .then(({ data }: { data: number | null }) => {
        if (data) router.refresh();
      });
  }, [hasRunning, router]);

  const base = useMemo(() => filterRows(rows, f), [rows, f]);
  const counts = useMemo(() => tabCounts(base), [base]);
  const shown = f.tab === "all" ? base : base.filter((r) => r.list_status === f.tab);

  return (
    <>
      <div role="group" aria-label="Lọc theo trạng thái" className="flex flex-wrap gap-2">
        {LIST_TABS.map((t) => {
          const active = f.tab === t;
          return (
            <button
              key={t}
              type="button"
              aria-pressed={active}
              onClick={() => setF((s) => ({ ...s, tab: t }))}
              className={
                "flex min-h-10 cursor-pointer items-center gap-2 rounded-full border px-3.5 text-sm font-semibold " +
                (active ? "border-ink bg-ink text-white" : "border-edge bg-surface text-ink")
              }
            >
              {t === "all" ? "Tất cả" : LIST_STATUS[t].label}
              <span className="font-medium">{counts[t]}</span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor="tim" className="sr-only-label">
          Tìm bài
        </label>
        <input
          id="tim"
          type="search"
          value={f.q}
          onChange={(e) => setF((s) => ({ ...s, q: e.target.value }))}
          placeholder="Tìm theo tên bài"
          className={`${field} max-w-[360px] flex-[1_1_260px]`}
        />
        <label htmlFor="loc-lop" className="text-sm text-muted">
          Lớp
        </label>
        <select id="loc-lop" value={f.grade} onChange={(e) => setF((s) => ({ ...s, grade: e.target.value }))} className={field}>
          <option value="all">Tất cả</option>
          {[4, 5, 6, 7, 8, 9, 10, 11, 12].map((g) => (
            <option key={g} value={g}>
              Lớp {g}
            </option>
          ))}
        </select>
        <label htmlFor="loc-nguon" className="text-sm text-muted">
          Cách soạn
        </label>
        <select
          id="loc-nguon"
          value={f.source}
          onChange={(e) => setF((s) => ({ ...s, source: e.target.value as ListFilters["source"] }))}
          className={field}
        >
          <option value="all">Tất cả</option>
          <option value="soan_lai">Soạn lại từ kho</option>
          <option value="bai_moi">Bài mới</option>
        </select>
      </div>

      <div className="overflow-x-auto rounded-xl border border-line bg-surface">
        <table className="w-full min-w-[880px] border-collapse text-sm">
          <thead>
            <tr className="text-left text-[13px] text-muted">
              {["Bài", "Lớp", "Cách soạn", "Bản", "Trạng thái", "Cảnh báo", "Cập nhật", "Việc tiếp"].map((h, i) => (
                <th key={h} scope="col" className={"border-b border-line py-3.5 font-semibold " + (i === 0 || i === 7 ? "px-4" : "px-3")}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => {
              const act = nextAction(r);
              return (
                <tr key={r.id}>
                  <td className="border-b border-line-soft px-4 py-3">
                    {r.current_version_id ? (
                      <Link href={`/noi-bo/khbd/${r.id}`} className="font-semibold text-ink no-underline hover:text-accent">
                        {r.title}
                      </Link>
                    ) : (
                      <span className="font-semibold">{r.title}</span>
                    )}
                    <span className="mt-0.5 block text-xs text-muted">{r.topic_name ?? "—"}</span>
                  </td>
                  <td className="border-b border-line-soft px-3 py-3">Lớp {r.grade}</td>
                  <td className="border-b border-line-soft px-3 py-3">{r.created_mode === "soan_lai" ? "Soạn lại từ kho" : "Bài mới"}</td>
                  <td className="border-b border-line-soft px-3 py-3">{r.version_no ? `v${r.version_no}` : "–"}</td>
                  <td className="border-b border-line-soft px-3 py-3">
                    <StatusChip chip={LIST_STATUS[r.list_status]} size="sm" />
                    {r.self_approved && (
                      <span title="Người duyệt cũng là người đặt soạn bài này" className="mt-1 block text-xs font-semibold text-muted">
                        Tự duyệt
                      </span>
                    )}
                  </td>
                  <td className={"border-b border-line-soft px-3 py-3 " + (r.warnings ? "text-err" : "text-muted")}>
                    {r.warnings ? `${r.warnings} cảnh báo` : "Không"}
                  </td>
                  <td className="border-b border-line-soft px-3 py-3 text-muted">{formatDate(r.updated_at)}</td>
                  <td className="border-b border-line-soft px-4 py-2">
                    {act ? (
                      <Link href={act.href} className="inline-flex min-h-10 items-center font-semibold whitespace-nowrap">
                        {act.label}
                      </Link>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {shown.length === 0 && (
          <p className="px-4 py-8 text-center text-[15px] text-muted">
            {rows.length === 0 ? "Chưa có KHBD nào. Bấm Tạo KHBD để soạn bài đầu tiên." : "Không có bài nào khớp bộ lọc."}
          </p>
        )}
      </div>
    </>
  );
}
