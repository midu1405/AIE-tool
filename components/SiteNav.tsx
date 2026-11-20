"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Khoá học", match: (p: string) => p === "/" || p.startsWith("/khoa-hoc/") },
  { href: "/khoa-hoc-cua-toi", label: "Khoá học của tôi", match: (p: string) => p.startsWith("/khoa-hoc-cua-toi") },
  { href: "#tro-giup", label: "Trợ giúp", match: () => false },
];

export function SiteNav() {
  return <NavList path={usePathname()} />;
}

// Bản không đánh dấu mục đang mở, dùng làm fallback của <Suspense> (đường dẫn chỉ có lúc chạy).
export function SiteNavStatic() {
  return <NavList path="" />;
}

function NavList({ path }: { path: string }) {
  return (
    <nav aria-label="Điều hướng chính" className="order-last flex w-full flex-wrap gap-1 md:order-none md:w-auto md:flex-1">
      {LINKS.map((l) => {
        const active = l.match(path);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={
              "rounded-lg px-3.5 py-3 text-[15px] no-underline " +
              (active ? "bg-accent-soft font-semibold text-accent" : "font-medium text-ink hover:bg-bg hover:text-ink")
            }
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
