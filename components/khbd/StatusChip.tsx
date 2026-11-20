import type { Chip } from "@/lib/khbd";

export function StatusChip({ chip, size = "md" }: { chip: Chip; size?: "sm" | "md" }) {
  return (
    <span
      className={
        "inline-block rounded-full font-semibold whitespace-nowrap " + (size === "sm" ? "px-2.5 py-[3px] text-xs" : "px-3 py-1 text-[13px]")
      }
      style={{ background: chip.bg, color: chip.ink }}
    >
      {chip.label}
    </span>
  );
}

export function Notice({ tone, children }: { tone: "err" | "warn" | "ok" | "info"; children: React.ReactNode }) {
  const c = { err: "bg-err-soft text-err", warn: "bg-warn-soft text-warn", ok: "bg-ok-soft text-ok", info: "bg-accent-soft text-accent-dark" }[tone];
  return (
    <p role={tone === "err" ? "alert" : "status"} className={`rounded-lg px-3.5 py-2.5 text-sm leading-normal ${c}`}>
      {children}
    </p>
  );
}

export function MockBadge() {
  return (
    <span className="rounded-md bg-warn-soft px-2 py-0.5 text-xs font-semibold text-warn" title="Executor chưa chốt: nội dung do bản giả lập tạo, không phải Claude soạn thật">
      Bản giả lập
    </span>
  );
}
