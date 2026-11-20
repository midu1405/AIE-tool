import Link from "next/link";
import { StatusChip } from "@/components/khbd/StatusChip";
import { COURSE_STATUS, audienceShort, type AdminCourse } from "@/lib/course-admin";

// Cột trái màn Quản lý khoá học: mọi khoá (nhân viên thấy cả nháp và đã ẩn).
export function AdminCourseList({ courses, activeId }: { courses: AdminCourse[]; activeId?: string }) {
  return (
    <nav aria-label="Danh sách khoá học" className="flex-[1_1_300px] overflow-hidden rounded-xl border border-line bg-surface md:max-w-[360px]">
      {courses.length === 0 ? (
        <p className="p-4 text-sm text-muted">Chưa có khoá học nào.</p>
      ) : (
        <ul>
          {courses.map((c, i) => {
            const active = c.id === activeId;
            return (
              <li key={c.id} className={i ? "border-t border-line" : ""}>
                <Link
                  href={`/noi-bo/khoa-hoc/${c.id}`}
                  aria-current={active ? "page" : undefined}
                  className={
                    "flex min-h-16 flex-col gap-1.5 border-l-[3px] px-4 py-3 text-ink no-underline hover:text-ink " +
                    (active ? "border-accent bg-[#F3F6FD]" : "border-transparent bg-surface hover:bg-bg")
                  }
                >
                  <span className="text-sm leading-snug font-semibold">{c.title}</span>
                  <span className="flex flex-wrap items-center gap-2 text-xs text-muted">
                    <StatusChip chip={COURSE_STATUS[c.status]} size="sm" />
                    {audienceShort(c.audiences)}
                    {c.update_count > 0 && <span className="font-semibold text-warn">· {c.update_count} học liệu có bản mới</span>}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </nav>
  );
}
