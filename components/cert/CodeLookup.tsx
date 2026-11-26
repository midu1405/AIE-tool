// Ô nhập mã giấy chứng nhận (form GET về /chung-nhan?ma=…, không cần JavaScript).
export function CodeLookup({ label, defaultValue = "", error = "" }: { label: string; defaultValue?: string; error?: string }) {
  return (
    <form action="/chung-nhan" method="get" className="flex flex-wrap items-end gap-3 rounded-xl border border-line bg-surface px-6 py-5">
      <div className="flex min-w-0 flex-[999_1_280px] flex-col gap-2">
        <label htmlFor="ma-cn" className="text-[15px] font-semibold">
          {label}
        </label>
        <input
          id="ma-cn"
          name="ma"
          defaultValue={defaultValue}
          placeholder="AIE-2026-XXXX-XXXX-XX"
          autoComplete="off"
          spellCheck={false}
          required
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "ma-cn-loi" : undefined}
          className="h-12 w-full rounded-lg border border-edge bg-surface px-3.5 text-base tracking-wide text-ink uppercase"
        />
        {error && (
          <p id="ma-cn-loi" role="alert" className="rounded-lg bg-err-soft px-3 py-2.5 text-sm text-err">
            {error}
          </p>
        )}
      </div>
      <button
        type="submit"
        className="inline-flex min-h-12 flex-[1_1_auto] cursor-pointer items-center justify-center rounded-[10px] bg-accent px-5 text-base font-semibold text-white hover:bg-accent-dark"
      >
        Kiểm tra
      </button>
    </form>
  );
}
