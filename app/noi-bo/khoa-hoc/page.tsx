import { Suspense } from "react";
import { AdminCourseList } from "@/components/courses/AdminCourseList";
import { NewCourse } from "@/components/courses/NewCourse";
import { getCurrentUser } from "@/lib/auth";
import { canCreateCourse, getAdminCourses } from "@/lib/course-admin-data";
import { card, pageLead, pageTitle } from "@/lib/ui";

export const metadata = { title: "Quản lý khoá học" };

export default function Page() {
  return (
    <>
      <div className="flex flex-col gap-2">
        <h1 className={pageTitle}>Quản lý khoá học</h1>
        <p className={pageLead}>
          Sắp xếp học phần, gắn KHBD và PBT đã duyệt làm học liệu, rồi xuất bản lên trang giáo viên. Chỉ Academic lead (Quản lý nội dung)
          được xuất bản.
        </p>
      </div>
      <Suspense fallback={<p className="text-muted">Đang tải khoá học…</p>}>
        <Body />
      </Suspense>
    </>
  );
}

async function Body() {
  const [{ courses, error }, user] = await Promise.all([getAdminCourses(), getCurrentUser()]);
  if (error) {
    return (
      <p role="alert" className="rounded-lg bg-err-soft px-4 py-3 text-sm text-err">
        Không tải được danh sách khoá: {error}. Tải lại trang; nếu vẫn lỗi, báo quản trị.
      </p>
    );
  }
  return (
    <>
      {canCreateCourse(user?.roles ?? []) && (
        <div>
          <NewCourse />
        </div>
      )}
      <div className="flex flex-wrap items-start gap-6">
        <AdminCourseList courses={courses} />
        <div className={`${card} flex-[999_1_520px] p-6 text-[15px] text-muted`}>Chọn một khoá ở cột bên trái để sửa học phần, gắn học liệu và xuất bản.</div>
      </div>
    </>
  );
}
