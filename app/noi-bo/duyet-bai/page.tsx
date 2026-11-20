import { Suspense } from "react";
import { KhbdList } from "@/components/khbd/KhbdList";
import { getKhbdRows } from "@/lib/khbd-data";
import { pageLead, pageTitle } from "@/lib/ui";

export const metadata = { title: "Duyệt bài" };

// Hàng chờ duyệt: Danh sách KHBD mở sẵn tab "Chờ duyệt".
export default function Page() {
  return (
    <>
      <div className="flex flex-col gap-2">
        <h1 className={pageTitle}>Duyệt bài</h1>
        <p className={pageLead}>
          Các bản đang chờ duyệt. Mở từng bài để đối chiếu QĐ 2422 và CV 5588, chấm rubric 7 tiêu chí, góp ý rồi duyệt hoặc trả về.
        </p>
      </div>
      <Suspense fallback={<p className="text-muted">Đang tải hàng chờ…</p>}>
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
        Không tải được hàng chờ: {error}. Tải lại trang; nếu vẫn lỗi, báo quản trị.
      </p>
    );
  }
  return <KhbdList rows={rows} initialTab="in_review" />;
}
