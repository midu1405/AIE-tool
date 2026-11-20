"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, ICONS } from "@/components/Icon";

const ITEMS = [
  { href: "/noi-bo/tao-khbd", label: "Tạo KHBD", icon: ICONS.plus },
  { href: "/noi-bo/tien-do", label: "Tiến độ", icon: ICONS.pulse },
  { href: "/noi-bo/khbd", label: "Danh sách KHBD", icon: ICONS.list },
  { href: "/noi-bo/duyet-bai", label: "Duyệt bài", icon: ICONS.check },
  { href: "/noi-bo/khoa-hoc", label: "Quản lý khoá học", icon: ICONS.book },
];

export function InternalNav() {
  return <NavList path={usePathname()} />;
}

// Bản không đánh dấu mục đang mở, dùng làm fallback của <Suspense> (đường dẫn chỉ có lúc chạy).
export function InternalNavStatic() {
  return <NavList path="" />;
}

function NavList({ path }: { path: string }) {
  return (
    <nav aria-label="Công cụ nội bộ" className="flex flex-col gap-1">
      {ITEMS.map((it) => {
        const active = path === it.href || path.startsWith(`${it.href}/`);
        return (
          <Link
            key={it.href}
            href={it.href}
            aria-current={active ? "page" : undefined}
            className={
              "flex min-h-11 items-center gap-3 rounded-lg px-3 text-[15px] no-underline " +
              (active ? "bg-accent-soft font-semibold text-accent" : "font-medium text-ink hover:bg-bg hover:text-ink")
            }
          >
            <Icon d={it.icon} stroke={active ? "#2152C5" : "#4B5565"} />
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
