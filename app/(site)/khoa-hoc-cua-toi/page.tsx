import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth";

export const metadata = { title: "Khoá học của tôi" };

// Giai đoạn 1: chỉ chặn đăng nhập. Ba tab Đang học / Đã hoàn thành / Đã lưu làm ở giai đoạn 3.
export default function MyCoursesPage() {
  return (
    <main className="mx-auto flex max-w-[1200px] flex-col gap-4 px-6 py-10">
      <h1 className="text-[34px] font-bold">Khoá học của tôi</h1>
      <Suspense fallback={<p className="text-muted">Đang tải…</p>}>
        <Body />
      </Suspense>
    </main>
  );
}

async function Body() {
  const user = await getCurrentUser();
  if (!user) redirect("/dang-nhap?next=/khoa-hoc-cua-toi");
  return (
    <div className="rounded-xl border border-dashed border-edge bg-surface px-6 py-12 text-center">
      <p className="text-lg font-semibold">Bạn chưa đăng ký khoá học nào</p>
      <p className="mt-2 text-[15px] text-muted">
        Chọn một khoá trong <Link href="/">danh mục khoá học</Link> để bắt đầu.
      </p>
    </div>
  );
}
