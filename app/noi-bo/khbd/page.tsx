import Link from "next/link";
import { Suspense } from "react";
import { KhbdList } from "@/components/khbd/KhbdList";
import { getKhbdRows } from "@/lib/khbd-data";
import { btnPrimary, pageLead, pageTitle } from "@/lib/ui";

export const metadata = { title: "Danh sách KHBD" };

export default function Page() {
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className={pageTitle}>Danh sách KHBD</h1>
          <p className={pageLead}>Mọi bản Claude đã soạn trong AI Agent, mới nhất ở trên. Mỗi lần sửa là một bản mới, bản cũ vẫn giữ.</p>
        </div>
        <Link href="/noi-bo/tao-khbd" className={btnPrimary}>
          Tạo KHBD
        </Link>
      </div>
      <Suspense fallback={<p className="text-muted">Đang tải danh sách…</p>}>
        <Body />
      </Suspense>
    </>
  );
}

async function Body() {
  const { rows, error } = await getKhbdRows();
  if (error) {
    return (
      <p role="alert" className="rounded-lg bg-err-soft px-4 py-3 text-sm text-err">
        Không tải được danh sách KHBD: {error}. Tải lại trang; nếu vẫn lỗi, báo quản trị.
      </p>
    );
  }
  return <KhbdList rows={rows} />;
}
