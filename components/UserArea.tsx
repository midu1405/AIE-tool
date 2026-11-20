import Link from "next/link";
import { getCurrentUser, initials } from "@/lib/auth";

// Góc phải thanh trên: tên người dùng hoặc nút đăng nhập. Đọc cookie nên luôn nằm trong <Suspense>.
export async function UserArea() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <Link
        href="/dang-nhap"
        className="flex min-h-11 items-center rounded-[10px] bg-accent px-4 text-[15px] font-semibold text-white no-underline hover:bg-accent-dark hover:text-white"
      >
        Đăng nhập
      </Link>
    );
  }
  return (
    <div className="flex items-center gap-2.5">
      {user.roles.length > 0 && (
        <Link href="/noi-bo" className="min-h-11 content-center px-2 text-sm font-semibold">
          Khu nội bộ
        </Link>
      )}
      <span
        aria-hidden="true"
        className="flex h-9 w-9 items-center justify-center rounded-full bg-line text-[13px] font-semibold text-ink"
      >
        {initials(user.name)}
      </span>
      <span className="text-sm text-muted">{user.name}</span>
      <form action="/auth/dang-xuat" method="post">
        <button type="submit" className="min-h-11 cursor-pointer px-2 text-sm font-semibold text-accent hover:text-accent-dark">
          Đăng xuất
        </button>
      </form>
    </div>
  );
}

export function UserAreaFallback() {
  return <span className="block h-9 w-28 rounded-lg bg-line-soft" aria-hidden="true" />;
}
