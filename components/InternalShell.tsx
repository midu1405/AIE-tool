"use client";
import { useState } from "react";
import { Icon, ICONS } from "@/components/Icon";

// Menu trái khu nội bộ: từ 768 px trở lên luôn mở; hẹp hơn (điện thoại) thì gọn lại thành một hàng có nút "Menu".
export function InternalAside({ brand, children }: { brand: React.ReactNode; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <aside className="flex w-full flex-col gap-4 border-b border-line bg-surface px-4 py-3 md:sticky md:top-0 md:h-screen md:w-64 md:overflow-y-auto md:flex-none md:gap-6 md:border-r md:border-b-0 md:py-5">
      <div className="flex items-center justify-between gap-3">
        {brand}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="menu-noi-bo"
          className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-edge px-3 text-sm font-semibold md:hidden"
        >
          <Icon d={open ? ICONS.close : "M4 6h16M4 12h16M4 18h16"} />
          Menu
        </button>
      </div>
      <div
        id="menu-noi-bo"
        // Bấm một liên kết trong menu thì gọn menu lại (trên điện thoại).
        onClick={(e) => {
          if ((e.target as HTMLElement).closest("a")) setOpen(false);
        }}
        className={`${open ? "flex" : "hidden"} flex-1 flex-col gap-6 md:flex`}
      >
        {children}
      </div>
    </aside>
  );
}
