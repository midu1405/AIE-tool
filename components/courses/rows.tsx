"use client";
import { Icon } from "@/components/Icon";
import { btnPrimary, btnSecondary, field } from "@/lib/ui";

// Dòng có nút đổi thứ tự / đổi tên / xoá (bấm hai lần) và dòng thêm mới, dùng ở màn soạn khoá học.
export function Row(p: {
  title: string;
  plainTitle: string;
  meta: string;
  bold?: boolean;
  canEdit: boolean;
  busy: boolean;
  first: boolean;
  last: boolean;
  renaming: string | null;
  confirmDelete: boolean;
  deleteHint: string;
  extra?: React.ReactNode;
  onMove: (dir: -1 | 1) => void;
  onRenameStart: () => void;
  onRenameChange: (v: string) => void;
  onRenameCancel: () => void;
  onRenameSave: () => void;
  onDelete: () => void;
}) {
  if (p.renaming !== null) {
    const id = `doi-ten-${p.plainTitle}`.replace(/\s+/g, "-");
    return (
      <form
        className="flex flex-wrap items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (p.renaming!.trim()) p.onRenameSave();
        }}
      >
        <label htmlFor={id} className="sr-only-label">
          Tên mới cho {p.plainTitle}
        </label>
        <input id={id} autoFocus value={p.renaming} onChange={(e) => p.onRenameChange(e.target.value)} className={`${field} flex-1`} />
        <button type="submit" disabled={p.busy || !p.renaming.trim()} className={btnPrimary}>
          Lưu
        </button>
        <button type="button" onClick={p.onRenameCancel} className={btnSecondary}>
          Huỷ
        </button>
      </form>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
      <span className={"flex-[1_1_220px] " + (p.bold ? "text-[15px] font-bold" : "")}>{p.title}</span>
      {p.meta && <span className="text-xs text-muted">{p.meta}</span>}
      {p.extra}
      {p.canEdit && (
        <span className="flex items-center">
          <IconBtn label={`Chuyển ${p.plainTitle} lên`} disabled={p.busy || p.first} onClick={() => p.onMove(-1)} d="M12 19V5M6 11l6-6 6 6" />
          <IconBtn label={`Chuyển ${p.plainTitle} xuống`} disabled={p.busy || p.last} onClick={() => p.onMove(1)} d="M12 5v14M6 13l6 6 6-6" />
          <IconBtn label={`Đổi tên ${p.plainTitle}`} disabled={p.busy} onClick={p.onRenameStart} d="M4 20h4L19 9l-4-4L4 16zM14 6l4 4" />
          <button
            type="button"
            disabled={p.busy}
            onClick={p.onDelete}
            aria-label={p.confirmDelete ? `${p.deleteHint} Bấm lần nữa để xoá ${p.plainTitle}` : `Xoá ${p.plainTitle}`}
            className={"flex h-10 cursor-pointer items-center justify-center rounded-lg " + (p.confirmDelete ? "bg-err-soft px-2 text-xs font-semibold text-err" : "w-10")}
          >
            {p.confirmDelete ? p.deleteHint : <Icon d="M5 7h14M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" size={16} stroke="#4B5565" />}
          </button>
        </span>
      )}
    </div>
  );
}

export function IconBtn({ label, d, disabled, onClick }: { label: string; d: string; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg hover:bg-bg disabled:cursor-not-allowed disabled:opacity-30"
    >
      <Icon d={d} size={16} stroke="#4B5565" />
    </button>
  );
}

export function AddRow(p: {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  busy: boolean;
  buttonLabel: string;
  className?: string;
  onChange: (v: string) => void;
  onAdd: () => void;
}) {
  return (
    <form
      className={`flex flex-wrap items-center gap-2 ${p.className ?? ""}`}
      onSubmit={(e) => {
        e.preventDefault();
        p.onAdd();
      }}
    >
      <label htmlFor={p.id} className="sr-only-label">
        {p.label}
      </label>
      <input id={p.id} value={p.value} onChange={(e) => p.onChange(e.target.value)} placeholder={p.placeholder} className={`${field} min-w-0 flex-1`} />
      <button type="submit" disabled={p.busy || !p.value.trim()} className={btnSecondary}>
        {p.buttonLabel}
      </button>
    </form>
  );
}
