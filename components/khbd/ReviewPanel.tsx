"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { MockBadge, Notice, StatusChip } from "@/components/khbd/StatusChip";
import {
  CHECK_TAGS,
  CRITERIA,
  FORMATS,
  LIST_STATUS,
  formatDate,
  formatTime,
  rpcErrorText,
  scoreText,
  type ListStatus,
  type Score,
  type VersionContent,
} from "@/lib/khbd";
import { getBrowserClient } from "@/lib/supabase/client";
import { btnPrimary, btnPrimaryLg, btnSecondary, card, field, labelCls, textarea } from "@/lib/ui";

export type VersionRow = {
  id: string;
  version_no: number;
  status: ListStatus;
  web_view_link: string;
  content: VersionContent;
  warnings: number;
  created_at: string;
  approved_at: string | null;
  job_id: string | null;
};
export type FeedbackRow = { id: string; source: string; author: string | null; anchor: string | null; content: string; status: string; created_at: string };
export type ReviewRow = { decision: string | null; rubric: Record<string, Score> | null; summary: string | null; created_at: string };
type Doc = { id: string; title: string; grade: number; topic_name: string | null; periods: number; created_mode: string; deploy_format: string; current_version_id: string | null };

const OPTIONAL_BASES: Record<string, string> = { tt02: "TT 02", tt16: "TT 16", tt18: "TT 18", tt85: "TT 85" };

// Màn Duyệt bài theo design/artboards/DuyetBai.dc.html: xem trước KHBD, đối chiếu, rubric, góp ý, duyệt/trả về.
export function ReviewPanel({
  doc,
  versions,
  version,
  feedback,
  review,
  bases,
  canReview,
  userName,
}: {
  doc: Doc;
  versions: VersionRow[];
  version: VersionRow | null;
  feedback: FeedbackRow[];
  review: ReviewRow | null;
  bases: string[];
  canReview: boolean;
  userName: string;
}) {
  const router = useRouter();
  const supabase = getBrowserClient();
  const [tab, setTab] = useState<"check" | "rubric" | "notes">("check");
  const [scores, setScores] = useState<Record<number, Score | undefined>>(() =>
    Object.fromEntries(Object.entries(review?.rubric ?? {}).map(([k, v]) => [Number(k) - 1, v])),
  );
  const [draft, setDraft] = useState("");
  const [anchor, setAnchor] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sentBackBatch, setSentBackBatch] = useState("");

  const meta = [
    `Lớp ${doc.grade}`,
    doc.topic_name,
    `${doc.periods} tiết`,
    doc.created_mode === "soan_lai" ? "Soạn lại từ kho" : "Bài mới",
    FORMATS.find((f) => f.key === doc.deploy_format)?.label.replace(" (mặc định)", ""),
  ]
    .filter(Boolean)
    .join(" · ");

  if (!version) {
    return (
      <>
        <h1 className="text-[28px] font-bold">{doc.title}</h1>
        <p className="text-sm text-muted">{meta}</p>
        <Notice tone="info">Bài này chưa có bản nào. Xem tiến độ soạn ở màn Tiến độ.</Notice>
        <Link href="/noi-bo/tien-do" className={`${btnSecondary} self-start`}>
          Xem tiến độ
        </Link>
      </>
    );
  }

  const c = version.content ?? {};
  const isLatest = versions[0]?.id === version.id;
  const openNotes = feedback.filter((f) => f.status === "open").length;
  const rubricJson = Object.fromEntries(
    Object.entries(scores)
      .filter(([, v]) => v)
      .map(([k, v]) => [String(Number(k) + 1), v]),
  );

  async function decide(decision: "approved" | "changes_requested") {
    setBusy(true);
    setError("");
    const { data, error } = await supabase.rpc("review_version", {
      p_version: version!.id,
      p_decision: decision,
      p_checklist: c.checks ?? null,
      p_rubric: Object.keys(rubricJson).length ? rubricJson : null,
      p_summary: null,
    });
    setBusy(false);
    if (error) {
      setError(rpcErrorText(error));
      if (decision === "changes_requested") setTab("notes");
      return;
    }
    if (decision === "changes_requested" && data) setSentBackBatch(data as string);
    router.refresh();
  }

  async function undo() {
    setBusy(true);
    setError("");
    const { error } = await supabase.rpc("undo_approval", { p_version: version!.id });
    setBusy(false);
    if (error) setError(rpcErrorText(error));
    router.refresh();
  }

  async function addNote() {
    if (!draft.trim()) return;
    setBusy(true);
    setError("");
    const { error } = await supabase.from("feedback_items").insert({
      document_version_id: version!.id,
      source: "web",
      author: userName || null,
      anchor: anchor || null,
      content: draft.trim(),
    });
    setBusy(false);
    if (error) {
      setError(rpcErrorText(error));
      return;
    }
    setDraft("");
    setAnchor("");
    router.refresh();
  }

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-[28px] leading-tight font-bold">{doc.title}</h1>
          <p className="text-sm text-muted">{meta}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <StatusChip chip={LIST_STATUS[version.status]} />
          <label htmlFor="ban" className="sr-only-label">
            Phiên bản
          </label>
          <select id="ban" value={version.version_no} onChange={(e) => router.replace(`/noi-bo/khbd/${doc.id}?v=${e.target.value}`)} className={field}>
            {versions.map((v, i) => (
              <option key={v.id} value={v.version_no}>
                v{v.version_no}
                {i === 0 ? " (bản mới nhất)" : ""} · {LIST_STATUS[v.status].label}
              </option>
            ))}
          </select>
          {version.web_view_link ? (
            <a href={version.web_view_link} target="_blank" rel="noreferrer" className={btnSecondary}>
              Mở Google Doc
            </a>
          ) : (
            <span className="text-[13px] text-muted">Bản giả lập: chưa có Google Doc</span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-start gap-6">
        <article aria-label="Bản xem trước KHBD" className={`${card} flex min-w-0 flex-[999_1_520px] flex-col gap-[18px] p-8 text-sm leading-relaxed`}>
          <div className="flex items-center justify-between border-b-2 border-[#A92145] pb-2.5 text-xs text-muted">
            <span>Kế hoạch bài dạy</span>
            <span className="flex items-center gap-2">
              Bản xem trước · v{version.version_no} · {formatDate(version.created_at)} {formatTime(version.created_at)}
              {c.mock && <MockBadge />}
            </span>
          </div>
          <h2 className="text-[22px] font-bold text-[#A92145]">{doc.title}</h2>
          <section className="flex flex-col gap-1.5">
            <h3 className="text-[15px] font-bold">I. Mục tiêu</h3>
            <p className="font-semibold">1. Năng lực trí tuệ nhân tạo</p>
            <p className="text-muted">
              {c.codes?.length ? `Theo mã QĐ 2422: ${c.codes.join(", ")}` : `Yêu cầu cần đạt lấy theo mã QĐ 2422 lớp ${doc.grade} (Claude tự chọn).`}
            </p>
            <p className="font-semibold">2. Mục tiêu bài học</p>
            <ul className="list-disc pl-5">
              {(c.objectives ?? []).map((o) => (
                <li key={o}>{o}</li>
              ))}
            </ul>
          </section>
          <section className="flex flex-col gap-2">
            <h3 className="text-[15px] font-bold">II. Tiến trình dạy học</h3>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] border-collapse text-[13px]">
                <thead>
                  <tr className="bg-[#F6E8EC] text-left">
                    <th scope="col" className="w-[26%] border border-[#E3C7CF] px-2.5 py-2">
                      Hoạt động
                    </th>
                    <th scope="col" className="border border-[#E3C7CF] px-2.5 py-2">
                      Mô tả
                    </th>
                    <th scope="col" className="w-[24%] border border-[#E3C7CF] px-2.5 py-2">
                      Sản phẩm / Minh chứng
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(c.activities ?? []).map((a, i) => (
                    <tr key={a.name}>
                      <td className="border border-line px-2.5 py-2 align-top">
                        <strong>
                          {i + 1}. {a.name}
                        </strong>
                        <br />
                        {a.minutes} phút
                      </td>
                      <td className="border border-line px-2.5 py-2">{a.desc}</td>
                      <td className="border border-line px-2.5 py-2">{a.product}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted">
              Tổng thời gian: {(c.activities ?? []).reduce((s, a) => s + Number(a.minutes), 0)} / {45 * doc.periods} phút (45 phút × {doc.periods} tiết).
            </p>
          </section>
        </article>

        <section aria-label="Công cụ duyệt" className="flex flex-[1_1_340px] flex-col gap-4 md:max-w-[420px]">
          <div role="tablist" aria-label="Công cụ duyệt" className="flex gap-1 rounded-xl bg-line-soft p-1">
            {(
              [
                ["check", "Đối chiếu"],
                ["rubric", "Rubric"],
                ["notes", `Góp ý${feedback.length ? ` (${feedback.length})` : ""}`],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={tab === k}
                aria-controls={`tab-${k}`}
                id={`tabbtn-${k}`}
                onClick={() => setTab(k)}
                className={"min-h-11 flex-1 cursor-pointer rounded-[9px] text-sm font-semibold " + (tab === k ? "bg-surface text-ink shadow-sm" : "text-muted")}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === "check" && (
            <div id="tab-check" role="tabpanel" aria-labelledby="tabbtn-check" className={`${card} flex flex-col gap-3 p-5`}>
              <h2 className="text-base font-bold">Checklist QĐ 2422 và CV 5588</h2>
              <ul className="flex flex-col gap-2.5">
                {(c.checks ?? []).map((k) => {
                  const t = CHECK_TAGS[k.tag] ?? CHECK_TAGS.warn;
                  return (
                    <li key={k.text} className="flex items-start gap-2.5 text-sm leading-snug">
                      <span className="min-w-14 flex-none rounded-md px-2 py-0.5 text-center text-xs font-semibold" style={{ background: t.bg, color: t.ink }}>
                        {t.label}
                      </span>
                      <span>{k.text}</span>
                    </li>
                  );
                })}
              </ul>
              <h3 className="mt-2 text-sm font-bold">Văn bản khác</h3>
              <p className="text-sm text-muted">
                {bases.filter((b) => OPTIONAL_BASES[b]).length
                  ? `Đã bật cho lượt này: ${bases.filter((b) => OPTIONAL_BASES[b]).map((b) => OPTIONAL_BASES[b]).join(", ")}.`
                  : "TT 02, TT 16, TT 18, TT 85: chưa bật cho lượt này. Bật ở màn Tạo KHBD khi soạn lại."}
              </p>
            </div>
          )}

          {tab === "rubric" && (
            <div id="tab-rubric" role="tabpanel" aria-labelledby="tabbtn-rubric" className={`${card} flex flex-col gap-3.5 p-5`}>
              <div className="flex items-baseline justify-between">
                <h2 className="text-base font-bold">Rubric 7 tiêu chí</h2>
                <span className="text-sm font-semibold">{scoreText(scores)}</span>
              </div>
              <p className="text-[13px] text-muted">3 Đạt yêu cầu · 2 Cần tinh chỉnh · 1 Cần hoàn thiện trọng yếu</p>
              {CRITERIA.map((label, i) => (
                <div key={label} role="group" aria-label={label} className="flex flex-col gap-1.5">
                  <span className="text-sm font-semibold">{label}</span>
                  <div className="flex gap-1.5">
                    {([3, 2, 1, "na"] as const).map((v) => {
                      const active = scores[i] === v;
                      return (
                        <button
                          key={String(v)}
                          type="button"
                          aria-pressed={active}
                          disabled={!canReview || version.status !== "in_review"}
                          onClick={() => setScores((s) => ({ ...s, [i]: active ? undefined : v }))}
                          className={
                            "min-h-10 flex-1 cursor-pointer rounded-lg border text-sm font-semibold disabled:cursor-not-allowed " +
                            (active ? "border-ink bg-ink text-white" : "border-edge bg-surface text-ink")
                          }
                        >
                          {v === "na" ? "N/A" : v}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
              {version.status !== "in_review" && review && <p className="text-[13px] text-muted">Điểm đã lưu khi {review.decision === "approved" ? "duyệt" : "trả về"} ngày {formatDate(review.created_at)}.</p>}
            </div>
          )}

          {tab === "notes" && (
            <div id="tab-notes" role="tabpanel" aria-labelledby="tabbtn-notes" className={`${card} flex flex-col gap-3 p-5`}>
              <h2 className="text-base font-bold">Góp ý</h2>
              {version.status === "in_review" && (
                <p className="text-[13px] text-muted">
                  Gồm góp ý viết ở đây và comment trên Google Doc. Khi trả về, Claude chỉ sửa đúng các phần được góp ý và lưu bản v
                  {version.version_no + 1}.
                </p>
              )}
              <ul className="flex flex-col gap-2.5">
                {feedback.map((n) => (
                  <li key={n.id} className="flex flex-col gap-1 rounded-[10px] bg-bg px-3.5 py-3 text-sm leading-normal">
                    <span className="text-xs text-muted">
                      {n.source === "gdoc_comment" ? "Comment trên Google Doc" : "Trên web"} · {n.author ?? "Không rõ"}
                      {n.anchor ? ` · ${n.anchor}` : ""} · {formatDate(n.created_at)}
                      {n.status === "da_xu_ly" ? " · đã xử lý ở bản sau" : ""}
                    </span>
                    <span>{n.content}</span>
                  </li>
                ))}
                {feedback.length === 0 && <li className="text-sm text-muted">Chưa có góp ý.</li>}
              </ul>
              {version.status === "in_review" && (
                <>
                  <label htmlFor="cho-gop-y" className={labelCls}>
                    Góp ý cho phần nào
                  </label>
                  <select id="cho-gop-y" value={anchor} onChange={(e) => setAnchor(e.target.value)} className={field}>
                    <option value="">Cả bài</option>
                    <option value="Mục tiêu">Mục tiêu</option>
                    {(c.activities ?? []).map((a, i) => (
                      <option key={a.name} value={`Hoạt động ${i + 1}`}>
                        Hoạt động {i + 1}. {a.name}
                      </option>
                    ))}
                  </select>
                  <label htmlFor="gop-y" className={labelCls}>
                    Thêm góp ý
                  </label>
                  <textarea
                    id="gop-y"
                    rows={3}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="vd: Hoạt động 2 cần ví dụ gần gũi hơn"
                    className={textarea}
                  />
                  <button type="button" onClick={addNote} disabled={busy || !draft.trim()} className={`${btnSecondary} self-start`}>
                    Lưu góp ý
                  </button>
                </>
              )}
            </div>
          )}

          <div className={`${card} flex flex-col gap-2.5 p-5`}>
            {error && <Notice tone="err">{error}</Notice>}
            {!isLatest && <Notice tone="info">Đang xem bản cũ v{version.version_no}. Chỉ bản mới nhất được duyệt.</Notice>}
            {version.status === "in_review" && isLatest && canReview && (
              <>
                <button type="button" onClick={() => decide("approved")} disabled={busy} className={btnPrimaryLg}>
                  Duyệt KHBD v{version.version_no}
                </button>
                <button type="button" onClick={() => decide("changes_requested")} disabled={busy} className={btnSecondary}>
                  Trả về, soạn bản v{version.version_no + 1} theo {openNotes} góp ý
                </button>
                {openNotes === 0 && <p className="text-[13px] text-muted">Thêm góp ý ở tab Góp ý trước khi trả về.</p>}
              </>
            )}
            {version.status === "in_review" && !canReview && (
              <Notice tone="info">Bạn chưa có vai trò Duyệt bài. Bạn vẫn thêm góp ý được ở tab Góp ý.</Notice>
            )}
            {version.status === "approved" && (
              <>
                <p className="text-sm font-semibold text-ok">
                  Đã duyệt KHBD v{version.version_no}
                  {version.approved_at ? ` ngày ${formatDate(version.approved_at)}` : ""}. Bước tiếp theo:
                </p>
                <button type="button" disabled className={btnPrimaryLg} title="Làm ở giai đoạn sau">
                  Làm phiếu bài tập (chưa mở)
                </button>
                <Link href="/noi-bo/khoa-hoc" className={btnSecondary}>
                  Gắn vào khoá học
                </Link>
                {canReview && (
                  <button type="button" onClick={undo} disabled={busy} className="min-h-11 cursor-pointer text-sm font-semibold text-accent">
                    Hoàn tác duyệt
                  </button>
                )}
              </>
            )}
            {version.status === "changes_requested" && (
              <>
                <p className="text-sm font-semibold text-err">Đã trả về. Claude đang soạn bản v{version.version_no + 1} theo góp ý.</p>
                <Link href={sentBackBatch ? `/noi-bo/tien-do?luot=${sentBackBatch}` : "/noi-bo/tien-do"} className={btnPrimary}>
                  Xem tiến độ
                </Link>
              </>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
