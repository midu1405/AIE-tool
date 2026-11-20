"use client";
import { useState } from "react";
import { Notice } from "@/components/khbd/StatusChip";
import { AUDIENCES, FORMATS, LEVELS, TOPICS, type Audience } from "@/lib/catalog";
import { slugify, validateCourse, type CourseForm as Form } from "@/lib/course-admin";
import { btnPrimary, btnSecondary, field, labelCls, textarea } from "@/lib/ui";

export const EMPTY_COURSE: Form = {
  title: "",
  slug: "",
  summary: "",
  description: "",
  topic: "teach",
  audiences: ["thcs"],
  hours_min: "1",
  hours_max: "2",
  format: "self",
  level: "basic",
  outcomes: "",
  audience_note: "",
};

// Form thông tin khoá học, dùng cho Tạo khoá và Sửa thông tin khoá.
export function CourseForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
  slugLocked = false,
}: {
  initial: Form;
  submitLabel: string;
  onSubmit: (f: Form) => Promise<string | void>;
  onCancel: () => void;
  slugLocked?: boolean;
}) {
  const [f, setF] = useState<Form>(initial);
  const [slugTouched, setSlugTouched] = useState(!!initial.slug);
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({});
  const [serverError, setServerError] = useState("");
  const [busy, setBusy] = useState(false);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((s) => ({ ...s, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validateCourse(f);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    setServerError("");
    const err = await onSubmit(f);
    setBusy(false);
    if (err) setServerError(err);
  }

  const err = (k: keyof Form) =>
    errors[k] ? (
      <span id={`loi-${k}`} className="text-[13px] text-err">
        {errors[k]}
      </span>
    ) : null;

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="kh-ten" className={labelCls}>
          Tên khoá học
        </label>
        <input
          id="kh-ten"
          value={f.title}
          onChange={(e) => {
            set("title", e.target.value);
            if (!slugTouched && !slugLocked) set("slug", slugify(e.target.value));
          }}
          className={field}
          aria-invalid={!!errors.title}
          aria-describedby={errors.title ? "loi-title" : undefined}
        />
        {err("title")}
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="kh-slug" className={labelCls}>
          Đường dẫn
        </label>
        <div className="flex items-center gap-1 text-sm text-muted">
          <span>/khoa-hoc/</span>
          <input
            id="kh-slug"
            value={f.slug}
            disabled={slugLocked}
            onChange={(e) => {
              setSlugTouched(true);
              set("slug", e.target.value.trim());
            }}
            className={`${field} flex-1`}
            aria-invalid={!!errors.slug}
            aria-describedby={errors.slug ? "loi-slug" : slugLocked ? "kh-slug-khoa" : undefined}
          />
        </div>
        {slugLocked && (
          <span id="kh-slug-khoa" className="text-[13px] text-muted">
            Khoá đã có người học hoặc đã xuất bản: giữ nguyên đường dẫn để link cũ không hỏng.
          </span>
        )}
        {err("slug")}
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="kh-tom-tat" className={labelCls}>
          Mô tả ngắn (trên thẻ khoá học)
        </label>
        <input id="kh-tom-tat" value={f.summary} onChange={(e) => set("summary", e.target.value)} className={field} maxLength={200} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="kh-mo-ta" className={labelCls}>
          Mô tả ở trang chi tiết
        </label>
        <textarea id="kh-mo-ta" rows={3} value={f.description} onChange={(e) => set("description", e.target.value)} className={textarea} />
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="kh-chu-de" className={labelCls}>
            Chủ đề
          </label>
          <select id="kh-chu-de" value={f.topic} onChange={(e) => set("topic", e.target.value as Form["topic"])} className={field}>
            {Object.entries(TOPICS).map(([k, t]) => (
              <option key={k} value={k}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="kh-hinh-thuc" className={labelCls}>
            Hình thức
          </label>
          <select id="kh-hinh-thuc" value={f.format} onChange={(e) => set("format", e.target.value as Form["format"])} className={field}>
            {Object.entries(FORMATS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="kh-trinh-do" className={labelCls}>
            Trình độ
          </label>
          <select id="kh-trinh-do" value={f.level} onChange={(e) => set("level", e.target.value as Form["level"])} className={field}>
            {Object.entries(LEVELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="kh-gio-min" className={labelCls}>
            Giờ tối thiểu
          </label>
          <input id="kh-gio-min" inputMode="decimal" value={f.hours_min} onChange={(e) => set("hours_min", e.target.value)} className={field} aria-invalid={!!errors.hours_min} />
          {err("hours_min")}
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="kh-gio-max" className={labelCls}>
            Giờ tối đa
          </label>
          <input id="kh-gio-max" inputMode="decimal" value={f.hours_max} onChange={(e) => set("hours_max", e.target.value)} className={field} aria-invalid={!!errors.hours_max} />
          {err("hours_max")}
        </div>
      </div>
      <fieldset className="flex flex-col gap-1">
        <legend className="mb-1 text-sm font-semibold">Đối tượng</legend>
        <div className="flex flex-wrap gap-x-5">
          {(Object.keys(AUDIENCES) as Audience[]).map((a) => (
            <label key={a} htmlFor={`kh-dt-${a}`} className="flex min-h-11 cursor-pointer items-center gap-2 text-[15px]">
              <input
                id={`kh-dt-${a}`}
                type="checkbox"
                checked={f.audiences.includes(a)}
                onChange={() => set("audiences", f.audiences.includes(a) ? f.audiences.filter((x) => x !== a) : [...f.audiences, a])}
                className="h-[18px] w-[18px] accent-accent"
              />
              {AUDIENCES[a]}
            </label>
          ))}
        </div>
        {err("audiences")}
      </fieldset>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="kh-hoc-duoc" className={labelCls}>
          Bạn sẽ học được gì (mỗi dòng một ý)
        </label>
        <textarea id="kh-hoc-duoc" rows={4} value={f.outcomes} onChange={(e) => set("outcomes", e.target.value)} className={textarea} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="kh-danh-cho" className={labelCls}>
          Dành cho ai
        </label>
        <textarea id="kh-danh-cho" rows={2} value={f.audience_note} onChange={(e) => set("audience_note", e.target.value)} className={textarea} />
      </div>
      {serverError && <Notice tone="err">{serverError}</Notice>}
      <div className="flex flex-wrap gap-2.5">
        <button type="submit" disabled={busy} className={btnPrimary}>
          {busy ? "Đang lưu…" : submitLabel}
        </button>
        <button type="button" onClick={onCancel} className={btnSecondary}>
          Huỷ
        </button>
      </div>
    </form>
  );
}
