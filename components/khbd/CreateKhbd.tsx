"use client";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Icon, ICONS } from "@/components/Icon";
import { Notice } from "@/components/khbd/StatusChip";
import {
  BASES,
  FORMATS,
  TOPICS_BY_GRADE,
  buildTree,
  gradeNote,
  invalidCodes,
  parseCodes,
  rpcErrorText,
  type CurriculumLesson,
  type DeployFormat,
} from "@/lib/khbd";
import { getBrowserClient } from "@/lib/supabase/client";
import { btnPrimaryLg, card, field, labelCls, textarea } from "@/lib/ui";

type Mode = "kho" | "moi";

// Màn Tạo KHBD: soạn lại từ kho (chọn nhiều bài) hoặc soạn bài mới. Theo design/artboards/TaoKHBD.dc.html.
export function CreateKhbd({ lessons, latestVersion }: { lessons: CurriculumLesson[]; latestVersion: Record<string, number> }) {
  const router = useRouter();
  const tree = useMemo(() => buildTree(lessons), [lessons]);
  const byId = useMemo(() => new Map(lessons.map((l) => [l.id, l])), [lessons]);

  const [mode, setMode] = useState<Mode>("kho");
  const [expanded, setExpanded] = useState<string[]>(() => {
    const first = tree.find((lv) => lv.topics.length);
    return first ? [first.key, first.topics[0].id] : [];
  });
  const [selected, setSelected] = useState<string[]>([]);
  const [format, setFormat] = useState<DeployFormat>("chuyen_de");
  const [bases, setBases] = useState<string[]>([]);
  const [note, setNote] = useState("");

  const [grade, setGrade] = useState(6);
  const [periods, setPeriods] = useState(1);
  const [topic, setTopic] = useState("0");
  const [title, setTitle] = useState("");
  const [codeMode, setCodeMode] = useState<"auto" | "manual">("auto");
  const [codes, setCodes] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [ideas, setIdeas] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const isKho = mode === "kho";
  const gn = gradeNote(grade);
  const topicNames = grade <= 5 ? [] : (TOPICS_BY_GRADE[grade] ?? []);
  const codeList = parseCodes(codes);
  const badCodes = codeMode === "manual" ? invalidCodes(codeList, grade) : [];

  const blocked = isKho
    ? selected.length === 0
      ? "Chọn ít nhất 1 bài"
      : ""
    : grade <= 3
      ? "Lớp này chưa soạn được"
      : !title.trim()
        ? "Nhập tên bài"
        : codeMode === "manual" && (codeList.length === 0 || badCodes.length > 0)
          ? "Kiểm tra lại mã 2422"
          : "";

  async function submit() {
    setBusy(true);
    setError("");
    const topicName = grade <= 5 ? "Theo tài liệu nguồn" : topic === "ngoai" ? "Ngoài khung (bài mở rộng)" : `Chủ đề ${Number(topic) + 1}: ${topicNames[Number(topic)]}`;
    const items = isKho
      ? selected.map((id) => ({ lesson_id: id }))
      : [{ grade, periods, title: title.trim(), topic_name: topicName, codes: codeMode === "manual" ? codeList : [], source_url: sourceUrl.trim() }];
    const options = { format, bases, note: isKho ? note : ideas };
    const { data, error } = await getBrowserClient().rpc("create_khbd_jobs", { p_mode: mode, p_items: items, p_options: options });
    if (error) {
      setBusy(false);
      setError(rpcErrorText(error));
      return;
    }
    router.push(`/noi-bo/tien-do?luot=${data as string}`);
  }

  const savePath = isKho
    ? "AIE Product › 1. Pre-Review › AI Agent › [ngày chạy] › sao y đường dẫn bài nguồn"
    : `AIE Product › 1. Pre-Review › AI Agent › [ngày chạy] › Lớp ${grade} › ${title.trim() || "[Tên bài]"}`;

  return (
    <>
      <div role="group" aria-label="Cách soạn" className="flex flex-wrap gap-1 self-start rounded-xl bg-line-soft p-1">
        {(
          [
            ["kho", "Soạn lại từ kho học liệu"],
            ["moi", "Soạn bài mới"],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            aria-pressed={mode === k}
            onClick={() => setMode(k)}
            className={
              "min-h-11 cursor-pointer rounded-[9px] px-[18px] text-[15px] font-semibold " +
              (mode === k ? "bg-surface text-ink shadow-sm" : "bg-transparent text-muted")
            }
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-start gap-6">
        {isKho ? (
          <section aria-label="Kho học liệu" className={`${card} flex min-w-0 flex-[999_1_460px] flex-col gap-3.5 p-5`}>
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 className="text-lg font-bold">Chọn bài nguồn</h2>
              <span className="text-[13px] text-muted">Khung mẫu · chưa đồng bộ Drive</span>
            </div>
            <p className="text-[13px] text-muted">
              Kho học liệu chung › 3. Giáo dục trí tuệ nhân tạo dành cho học sinh phổ thông › 1. Học liệu
            </p>
            <ul className="overflow-hidden rounded-[10px] border border-line">
              {tree.map((lv, li) => {
                const open = expanded.includes(lv.key);
                return (
                  <li key={lv.key} className={li ? "border-t border-line" : ""}>
                    <TreeToggle label={lv.label} open={open} pad={14} onClick={() => setExpanded((e) => toggle(e, lv.key))} />
                    {open && lv.topics.length === 0 && (
                      <p className="border-t border-line py-2.5 pr-3.5 pl-11 text-[13px] text-muted">
                        Nối Drive để hiện cây thư mục thật của nhánh này.
                      </p>
                    )}
                    {open &&
                      lv.topics.map((t) => {
                        const tOpen = expanded.includes(t.id);
                        return (
                          <div key={t.id} className="border-t border-line">
                            <TreeToggle label={t.label} meta={`Lớp ${t.grade}`} open={tOpen} pad={40} onClick={() => setExpanded((e) => toggle(e, t.id))} />
                            {tOpen &&
                              t.lessons.map((l) => {
                                const checked = selected.includes(l.id);
                                const v = latestVersion[l.id];
                                return (
                                  <label
                                    key={l.id}
                                    htmlFor={`chon-${l.id}`}
                                    className={"flex min-h-11 cursor-pointer items-center gap-3 border-t border-line pr-3.5 pl-[66px] text-[15px] " + (checked ? "bg-[#F3F6FD]" : "bg-surface")}
                                  >
                                    <input
                                      id={`chon-${l.id}`}
                                      type="checkbox"
                                      checked={checked}
                                      onChange={() => setSelected((s) => toggle(s, l.id))}
                                      className="m-0 h-[18px] w-[18px] accent-accent"
                                    />
                                    <span className="flex-1">{l.title}</span>
                                    <span className="text-xs text-muted">{l.periods} tiết</span>
                                    {v ? <span className="rounded-md bg-ok-soft px-2 py-0.5 text-xs font-semibold text-ok">Đã có v{v}</span> : null}
                                  </label>
                                );
                              })}
                          </div>
                        );
                      })}
                  </li>
                );
              })}
            </ul>
          </section>
        ) : (
          <section aria-label="Thông tin bài mới" className={`${card} flex min-w-0 flex-[999_1_460px] flex-col gap-[18px] p-6`}>
            <h2 className="text-lg font-bold">Thông tin bài mới</h2>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="lop" className={labelCls}>
                  Lớp
                </label>
                <select
                  id="lop"
                  value={grade}
                  onChange={(e) => {
                    setGrade(Number(e.target.value));
                    setTopic("0");
                  }}
                  className={field}
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((g) => (
                    <option key={g} value={g}>
                      Lớp {g}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="so-tiet" className={labelCls}>
                  Số tiết
                </label>
                <select id="so-tiet" value={periods} onChange={(e) => setPeriods(Number(e.target.value))} className={field}>
                  {[1, 2, 3].map((p) => (
                    <option key={p} value={p}>
                      {p} tiết ({p * 45} phút)
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <Notice tone={gn.tone}>{gn.text}</Notice>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="chu-de" className={labelCls}>
                Chủ đề
              </label>
              <select id="chu-de" value={grade <= 5 ? "ngoai" : topic} onChange={(e) => setTopic(e.target.value)} className={field} disabled={grade <= 5}>
                {grade <= 5 ? (
                  <option value="ngoai">Theo tài liệu nguồn</option>
                ) : (
                  <>
                    {topicNames.map((t, i) => (
                      <option key={t} value={i}>
                        Chủ đề {i + 1}: {t}
                      </option>
                    ))}
                    <option value="ngoai">Ngoài khung (bài mở rộng)</option>
                  </>
                )}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="ten-bai" className={labelCls}>
                Tên bài
              </label>
              <input
                id="ten-bai"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="vd: Dữ liệu di chuyển như thế nào?"
                className={field}
                aria-describedby="ten-bai-goi-y"
              />
              <span id="ten-bai-goi-y" className="text-[13px] text-muted">
                Trùng tên bài trong khung thì Claude lấy đúng mục tiêu của khung; tên mới thì Claude soạn như bài mở rộng và ghi giả định.
              </span>
            </div>
            <fieldset className="flex flex-col gap-1">
              <legend className="mb-1.5 text-sm font-semibold">Mã yêu cầu cần đạt QĐ 2422</legend>
              {(
                [
                  ["auto", "Claude tự chọn 2–4 mã đúng lớp"],
                  ["manual", "Tôi chỉ định mã"],
                ] as const
              ).map(([k, label]) => (
                <label key={k} htmlFor={`ma-${k}`} className="flex min-h-11 cursor-pointer items-center gap-2.5 text-[15px]">
                  <input
                    id={`ma-${k}`}
                    type="radio"
                    name="ma-2422"
                    checked={codeMode === k}
                    onChange={() => setCodeMode(k)}
                    className="m-0 h-[18px] w-[18px] accent-accent"
                  />
                  {label}
                </label>
              ))}
              {codeMode === "manual" && (
                <>
                  <label htmlFor="ma-tu-chon" className="sr-only-label">
                    Mã 2422 tự chọn
                  </label>
                  <input
                    id="ma-tu-chon"
                    type="text"
                    value={codes}
                    onChange={(e) => setCodes(e.target.value)}
                    placeholder={`vd: ${grade}.C2.1, ${grade}.C2.3`}
                    className={`${field} max-w-[360px]`}
                    aria-invalid={badCodes.length > 0}
                  />
                  {badCodes.length > 0 && (
                    <Notice tone="err">
                      Mã chưa đúng dạng hoặc không thuộc lớp {grade}: {badCodes.join(", ")}. Mã có dạng {grade}.C2.1.
                    </Notice>
                  )}
                </>
              )}
            </fieldset>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="tai-lieu" className={labelCls}>
                Tài liệu nguồn (không bắt buộc)
              </label>
              <input
                id="tai-lieu"
                type="url"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder="Dán link Google Drive: tài liệu Experience AI, slide, video…"
                className={field}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="y-tuong" className={labelCls}>
                Ý tưởng, yêu cầu riêng
              </label>
              <textarea
                id="y-tuong"
                rows={4}
                value={ideas}
                onChange={(e) => setIdeas(e.target.value)}
                placeholder="vd: dùng ví dụ về chợ quê; lớp không có máy cho học sinh"
                className={textarea}
              />
            </div>
          </section>
        )}

        <section aria-label="Thiết lập chung" className="flex flex-[1_1_320px] flex-col gap-4 md:max-w-[400px]">
          <div className={`${card} flex flex-col gap-4 p-5`}>
            {isKho && (
              <div className="flex flex-col gap-2">
                <h2 className="text-base font-bold">Đã chọn {selected.length} bài</h2>
                {selected.length === 0 && <p className="text-sm text-muted">Tick bài ở cây bên trái. Chọn nhiều bài là soạn hàng loạt.</p>}
                <ul className="flex flex-col gap-1.5">
                  {selected.map((id) => {
                    const l = byId.get(id);
                    const label = l ? `${l.title} · Lớp ${l.grade}` : id;
                    return (
                      <li key={id} className="flex min-h-11 items-center gap-2 rounded-lg bg-bg py-0 pr-1 pl-3 text-sm">
                        <span className="flex-1">{label}</span>
                        <button
                          type="button"
                          onClick={() => setSelected((s) => s.filter((x) => x !== id))}
                          aria-label={`Bỏ chọn ${label}`}
                          className="flex h-11 w-11 cursor-pointer items-center justify-center"
                        >
                          <Icon d={ICONS.close} size={14} stroke="#4B5565" width={2.2} />
                        </button>
                      </li>
                    );
                  })}
                </ul>
                <p className="text-[13px] text-muted">Lớp lấy theo khung NLS của từng bài.</p>
              </div>
            )}

            <fieldset className="flex flex-col gap-0.5">
              <legend className="mb-1.5 text-sm font-semibold">Hình thức triển khai (CV 5588)</legend>
              {FORMATS.map((f) => (
                <label key={f.key} htmlFor={`ht-${f.key}`} className="flex min-h-11 cursor-pointer items-center gap-2.5 text-[15px]">
                  <input
                    id={`ht-${f.key}`}
                    type="radio"
                    name="hinh-thuc"
                    checked={format === f.key}
                    onChange={() => setFormat(f.key)}
                    className="m-0 h-[18px] w-[18px] accent-accent"
                  />
                  {f.label}
                </label>
              ))}
            </fieldset>

            <fieldset className="flex flex-col gap-0.5">
              <legend className="mb-1.5 text-sm font-semibold">Căn cứ đối chiếu</legend>
              {BASES.map((b) => {
                const locked = "locked" in b && b.locked;
                return (
                  <label key={b.key} htmlFor={`cc-${b.key}`} className="flex min-h-11 cursor-pointer items-center gap-2.5 text-[15px]">
                    <input
                      id={`cc-${b.key}`}
                      type="checkbox"
                      checked={locked || bases.includes(b.key)}
                      disabled={locked}
                      onChange={() => setBases((s) => toggle(s, b.key))}
                      className="m-0 h-[18px] w-[18px] accent-accent"
                    />
                    <span className="flex-1">{b.label}</span>
                    <span className="text-xs text-muted">{b.note}</span>
                  </label>
                );
              })}
            </fieldset>

            {isKho && (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="ghi-chu" className={labelCls}>
                  Ghi chú cho Claude
                </label>
                <textarea
                  id="ghi-chu"
                  rows={3}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="vd: bỏ phần giới thiệu chương trình Experience AI"
                  className={textarea}
                />
              </div>
            )}
          </div>

          <div className={`${card} flex flex-col gap-3 p-5`}>
            <h2 className="text-base font-bold">Kết quả sẽ có</h2>
            <ul className="flex list-disc flex-col gap-1 pl-[18px] text-sm leading-relaxed">
              <li>Google Doc KHBD theo mẫu mới, đuôi – vN</li>
              <li>Spec KHBD và spec PBT trong _spec (Claude dùng)</li>
              <li>Kết quả đối chiếu căn cứ và cảnh báo</li>
              <li>Một dòng trong Nhật ký chạy của ngày</li>
            </ul>
            <p className="text-[13px] leading-normal text-muted">Lưu vào: {savePath}</p>
            <Notice tone="warn">
              Đang chạy bản giả lập: mỗi bước mất vài giây và chưa tạo Google Doc thật, cho tới khi chốt bên thực hiện soạn.
            </Notice>
            {error && <Notice tone="err">{error}</Notice>}
            <button type="button" onClick={submit} disabled={!!blocked || busy} className={btnPrimaryLg}>
              {busy ? "Đang tạo lượt chạy…" : blocked || (isKho ? `Tạo KHBD cho ${selected.length} bài` : "Soạn bài mới")}
            </button>
          </div>
        </section>
      </div>
    </>
  );
}

function TreeToggle({ label, meta, open, pad, onClick }: { label: string; meta?: string; open: boolean; pad: number; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      className="flex min-h-11 w-full cursor-pointer items-center gap-2.5 bg-[#FAFBFC] pr-3.5 text-left text-[15px] font-semibold text-ink"
      style={{ paddingLeft: pad }}
    >
      <Icon d="M9 6l6 6-6 6" size={16} stroke="#4B5565" width={2.2} className={"flex-none transition-transform " + (open ? "rotate-90" : "")} />
      <span className="flex-1">{label}</span>
      {meta && <span className="text-xs font-medium text-muted">{meta}</span>}
    </button>
  );
}
