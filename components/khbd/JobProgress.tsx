"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { MockBadge, Notice, StatusChip } from "@/components/khbd/StatusChip";
import {
  JOB_CHIPS,
  STEP_BAR,
  formatDate,
  formatTime,
  rpcErrorText,
  stepViews,
  type JobStatus,
  type JobStep,
  type VersionContent,
} from "@/lib/khbd";
import { getBrowserClient } from "@/lib/supabase/client";
import { btnPrimary, btnSecondary, card, field } from "@/lib/ui";

type Batch = { id: string; kind: string; status: JobStatus; created_at: string };
type Run = {
  id: string;
  status: JobStatus;
  attempt: number;
  started_at: string | null;
  finished_at: string | null;
  run_minutes: number | null;
  error: { message?: string } | null;
  document_id: string;
  documents: { title: string; grade: number; topic_name: string | null; periods: number } | null;
  job_steps: JobStep[];
};
type Report = { version_no: number; warnings: number; content: VersionContent };

const STEP_SECONDS = 3;

// Màn Tiến độ: mỗi bài một thẻ 6 bước, tự cập nhật qua Supabase Realtime. Theo design/artboards/TienDo.dc.html.
export function JobProgress() {
  const supabase = getBrowserClient();
  const router = useRouter();
  const params = useSearchParams();
  const [batches, setBatches] = useState<Batch[] | null>(null);
  const [runs, setRuns] = useState<Run[]>([]);
  const [open, setOpen] = useState<Record<string, Report | "loading" | undefined>>({});
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  const batchId = params.get("luot") || batches?.[0]?.id || "";
  const refetchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadBatches = useCallback(async () => {
    const { data, error } = await supabase
      .from("generation_jobs")
      .select("id, kind, status, created_at")
      .is("parent_job_id", null)
      .order("created_at", { ascending: false })
      .limit(15);
    if (error) setError(`Không tải được danh sách lượt chạy: ${error.message}`);
    else setBatches(data as Batch[]);
  }, [supabase]);

  const loadRuns = useCallback(async () => {
    if (!batchId) return;
    const { data, error } = await supabase
      .from("generation_jobs")
      .select(
        "id, status, attempt, started_at, finished_at, run_minutes, error, document_id, documents(title, grade, topic_name, periods), job_steps(step, status, started_at, finished_at, error)",
      )
      .eq("parent_job_id", batchId)
      .order("created_at", { ascending: true });
    if (error) setError(`Không tải được tiến độ: ${error.message}`);
    else setRuns(data as unknown as Run[]);
  }, [supabase, batchId]);

  const scheduleRefetch = useCallback(() => {
    if (refetchTimer.current) clearTimeout(refetchTimer.current);
    refetchTimer.current = setTimeout(() => {
      void loadRuns();
      void loadBatches();
    }, 250);
  }, [loadRuns, loadBatches]);

  useEffect(() => {
    // Tải lần đầu và khi đổi lượt chạy.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- đồng bộ với dữ liệu ngoài (Supabase)
    void loadBatches();
  }, [loadBatches]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- đồng bộ với dữ liệu ngoài (Supabase)
    void loadRuns();
  }, [loadRuns]);

  // Realtime: có thay đổi ở job hoặc bước thì tải lại (RLS vẫn áp dụng cho kênh này).
  useEffect(() => {
    const ch = supabase
      .channel("tien-do")
      .on("postgres_changes", { event: "*", schema: "public", table: "generation_jobs" }, scheduleRefetch)
      .on("postgres_changes", { event: "*", schema: "public", table: "job_steps" }, scheduleRefetch)
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [supabase, scheduleRefetch]);

  // Bản giả lập không có worker: trang đang mở đẩy job tiến lên theo thời gian thực.
  const active = runs.some((r) => r.status === "queued" || r.status === "running");
  useEffect(() => {
    if (!active) return;
    const t = setInterval(async () => {
      await supabase.rpc("advance_mock_jobs", { p_step_seconds: STEP_SECONDS });
      scheduleRefetch();
    }, 1500);
    return () => clearInterval(t);
  }, [active, supabase, scheduleRefetch]);

  async function act(fn: "retry_job" | "cancel_job", id: string) {
    setBusyId(id);
    setError("");
    const { error } = await supabase.rpc(fn, { p_job: id });
    setBusyId("");
    if (error) setError(rpcErrorText(error));
    scheduleRefetch();
  }

  async function toggleReport(r: Run) {
    if (open[r.id]) {
      setOpen((o) => ({ ...o, [r.id]: undefined }));
      return;
    }
    setOpen((o) => ({ ...o, [r.id]: "loading" }));
    const { data } = await supabase.from("document_versions").select("version_no, warnings, content").eq("job_id", r.id).maybeSingle();
    setOpen((o) => ({ ...o, [r.id]: (data as Report | null) ?? { version_no: 0, warnings: 0, content: {} } }));
  }

  const counts = (s: JobStatus) => runs.filter((r) => r.status === s).length;
  const batch = batches?.find((b) => b.id === batchId);

  if (batches && batches.length === 0) {
    return (
      <div className={`${card} flex flex-col items-start gap-3 p-6`}>
        <p className="text-lg font-semibold">Chưa có lượt soạn nào</p>
        <p className="text-[15px] text-muted">Tạo KHBD để bắt đầu; tiến độ từng bài hiện ở đây.</p>
        <Link href="/noi-bo/tao-khbd" className={btnPrimary}>
          Tạo KHBD
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-[30px] leading-tight font-bold">Tiến độ soạn</h1>
          <p className="text-[15px] text-muted">
            {batch ? `Lượt chạy ngày ${formatDate(batch.created_at)} lúc ${formatTime(batch.created_at)} · ` : ""}
            {runs.length} bài · trang tự cập nhật khi Claude xong từng bước
          </p>
        </div>
        {batches && batches.length > 1 && (
          <div className="flex items-center gap-2">
            <label htmlFor="luot" className="text-sm text-muted">
              Lượt chạy
            </label>
            <select id="luot" value={batchId} onChange={(e) => router.replace(`/noi-bo/tien-do?luot=${e.target.value}`)} className={field}>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {formatDate(b.created_at)} {formatTime(b.created_at)} · {JOB_CHIPS[b.status].label}
                  {b.kind === "soan_ban_moi" ? " · soạn bản mới" : ""}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {error && <Notice tone="err">{error}</Notice>}

      <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-4">
        {(
          [
            ["Xong", counts("succeeded"), "#1D6E47"],
            ["Đang chạy", counts("running"), "#163B91"],
            ["Lỗi", counts("failed"), "#8A3A0C"],
            ["Đang chờ", counts("queued"), "#4B5565"],
          ] as const
        ).map(([label, value, ink]) => (
          <div key={label} className={`${card} flex flex-col gap-1 px-[18px] py-4`}>
            <span className="text-[13px] text-muted">{label}</span>
            <span className="text-[26px] font-bold" style={{ color: ink }}>
              {value}
            </span>
          </div>
        ))}
      </div>

      <ol className="flex flex-col gap-4">
        {runs.map((r) => {
          const chip = JOB_CHIPS[r.status];
          const d = r.documents;
          const steps = stepViews(r.job_steps);
          const report = open[r.id];
          const failedStep = r.job_steps.find((s) => s.status === "failed");
          const meta = [
            d ? `Lớp ${d.grade}` : "",
            d?.topic_name ?? "",
            d ? `${d.periods} tiết` : "",
            r.started_at ? `bắt đầu ${formatTime(r.started_at)}` : "đang chờ",
            r.run_minutes != null ? `${String(r.run_minutes).replace(".", ",")} phút` : "",
            r.attempt > 0 ? `lần chạy ${r.attempt + 1}` : "",
          ]
            .filter(Boolean)
            .join(" · ");
          return (
            <li key={r.id} className="flex flex-col gap-4 rounded-xl border bg-surface p-5" style={{ borderColor: chip.edge }}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex flex-col gap-1">
                  <h2 className="text-lg font-bold">{d?.title ?? "Bài"}</h2>
                  <span className="text-[13px] text-muted">{meta}</span>
                </div>
                <StatusChip chip={chip} />
              </div>
              <ol aria-label="Các bước" className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-2">
                {steps.map((s) => (
                  <li key={s.key} className="flex flex-col gap-1.5">
                    <span className="h-1.5 rounded-full" style={{ background: STEP_BAR[s.state] }} aria-hidden="true" />
                    <span
                      className={"text-[13px] leading-snug " + (s.state === "todo" ? "text-muted" : "text-ink") + (s.state === "now" || s.state === "error" ? " font-bold" : " font-medium")}
                    >
                      {s.label}
                      <span className="sr-only-label">
                        {{ done: " – xong", now: " – đang chạy", error: " – lỗi", todo: " – chưa chạy" }[s.state]}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
              {r.status === "failed" && (
                <Notice tone="err">{failedStep?.error?.message ?? r.error?.message ?? "Có lỗi khi soạn. Chạy lại từ bước lỗi."}</Notice>
              )}
              <div className="flex flex-wrap gap-2.5">
                {r.status === "succeeded" && (
                  <>
                    <Link href={`/noi-bo/khbd/${r.document_id}`} className={btnPrimary}>
                      Mở để duyệt
                    </Link>
                    <button type="button" onClick={() => toggleReport(r)} aria-expanded={!!report} className={btnSecondary}>
                      {report ? "Ẩn báo cáo" : "Xem báo cáo"}
                    </button>
                  </>
                )}
                {r.status === "failed" && (
                  <button type="button" onClick={() => act("retry_job", r.id)} disabled={busyId === r.id} className={btnPrimary}>
                    Chạy lại từ bước lỗi
                  </button>
                )}
                {r.status === "queued" && (
                  <button type="button" onClick={() => act("cancel_job", r.id)} disabled={busyId === r.id} className={btnSecondary}>
                    Huỷ bài này
                  </button>
                )}
              </div>
              {report === "loading" && <p className="text-sm text-muted">Đang tải báo cáo…</p>}
              {report && report !== "loading" && <RunReport report={report} />}
            </li>
          );
        })}
      </ol>
      <p id="nhat-ky" className="text-[13px] text-muted">
        Nhật ký chạy: Google Sheet trong thư mục ngày của AI Agent, mỗi bài một dòng (giờ bắt đầu, giờ kết thúc, số phút, lớp, chủ đề, bài,
        số tiết, bản KHBD, link, cảnh báo). Bản giả lập chưa ghi Sheet.
      </p>
    </>
  );
}

function RunReport({ report }: { report: Report }) {
  const c = report.content;
  return (
    <div className="flex flex-wrap gap-6 border-t border-line pt-4">
      <div className="flex flex-[1_1_300px] flex-col gap-2">
        <h3 className="flex items-center gap-2 text-[15px] font-bold">
          4 hoạt động {c.mock && <MockBadge />}
        </h3>
        <ul className="list-disc pl-[18px] text-sm leading-relaxed">
          {(c.activities ?? []).map((a) => (
            <li key={a.name}>
              {a.name} · {a.minutes} phút · {a.product}
            </li>
          ))}
        </ul>
        <p className="text-sm text-muted">Mã 2422 đã dùng: {c.codes?.length ? c.codes.join(", ") : "Claude tự chọn (bản giả lập chưa có mã)"}</p>
      </div>
      <div className="flex flex-[1_1_300px] flex-col gap-2">
        <h3 className="text-[15px] font-bold">Đối chiếu QĐ 2422 và CV 5588</h3>
        <ul className="flex flex-col gap-1.5 text-sm leading-normal">
          {(c.checks ?? []).map((k) => (
            <li key={k.text}>
              {{ pass: "Đạt", warn: "Cảnh báo", fixed: "Đã sửa" }[k.tag] ?? k.tag}: {k.text}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
