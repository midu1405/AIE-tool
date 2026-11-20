import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { BrandLogo } from "@/components/Brand";
import { InternalNav, InternalNavStatic } from "@/components/InternalNav";
import { InternalAside } from "@/components/InternalShell";
import { ROLE_LABELS, getCurrentUser, initials } from "@/lib/auth";

export const metadata = { title: { default: "Nội bộ", template: "%s · Nội bộ · AI Edu" } };

export default function InternalLayout({ children }: LayoutProps<"/noi-bo">) {
  return (
    <div className="flex min-h-screen flex-col bg-bg md:flex-row">
      <InternalAside
        brand={
          <Link href="/noi-bo" aria-label="AI Edu – khu nội bộ" className="flex items-center gap-2.5 px-2 text-ink no-underline hover:text-ink">
            <BrandLogo height={34} />
            <span className="rounded-md bg-ink px-2 py-0.5 text-[11px] font-semibold text-white">Nội bộ</span>
          </Link>
        }
      >
        <Suspense fallback={<InternalNavStatic />}>
          <InternalNav />
        </Suspense>
        <div className="border-t border-line pt-4">
          <Link href="/" className="flex min-h-11 items-center px-3 text-sm text-muted no-underline">
            Xem trang khoá học public
          </Link>
        </div>
        <Suspense fallback={<div className="mt-auto h-9" aria-hidden="true" />}>
          <StaffBadge />
        </Suspense>
      </InternalAside>

      <main className="flex min-w-0 flex-1 flex-col gap-6 px-4 py-6 sm:p-8">
        <Suspense fallback={<p className="text-muted">Đang kiểm tra quyền truy cập…</p>}>
          <StaffGate>{children}</StaffGate>
        </Suspense>
      </main>
    </div>
  );
}

// Quyền thật kiểm ở server (và lần nữa ở RLS khi đọc dữ liệu). Proxy chỉ chặn sớm khi chưa đăng nhập.
async function StaffGate({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/dang-nhap?next=/noi-bo");
  if (user.roles.length === 0) {
    return (
      <div role="alert" className="max-w-[640px] rounded-xl border border-line bg-surface p-6">
        <h1 className="text-2xl font-bold">Tài khoản chưa có quyền vào khu nội bộ</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-muted">
          Bạn đang đăng nhập bằng <strong className="text-ink">{user.email}</strong>. Khu nội bộ dành cho nhân viên AI Edu đã được cấp vai trò.
          Nếu bạn là nhân viên, hãy đăng nhập bằng email @aiedu.com.vn và nhờ quản trị cấp vai trò.
        </p>
        <Link href="/" className="mt-4 inline-flex min-h-11 items-center font-semibold">
          Về trang khoá học
        </Link>
      </div>
    );
  }
  return <>{children}</>;
}

async function StaffBadge() {
  const user = await getCurrentUser();
  if (!user) return null;
  const role = user.roles.map((r) => ROLE_LABELS[r]).join(", ") || "Chưa có vai trò";
  return (
    <div className="mt-auto flex items-center gap-2.5 px-2">
      <span aria-hidden="true" className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-line text-xs font-semibold">
        {initials(user.name)}
      </span>
      <span className="flex min-w-0 flex-1 flex-col text-[13px]">
        <span className="truncate font-semibold">{user.name}</span>
        <span className="truncate text-muted">{role}</span>
      </span>
      <form action="/auth/dang-xuat" method="post">
        <button type="submit" className="min-h-11 cursor-pointer px-1 text-[13px] font-semibold text-accent">
          Đăng xuất
        </button>
      </form>
    </div>
  );
}
