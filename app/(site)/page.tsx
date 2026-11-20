import Link from "next/link";
import { Catalog } from "@/components/Catalog";
import { getPublishedCourses } from "@/lib/courses";

export default async function HomePage() {
  const courses = await getPublishedCourses();
  return (
    <>
      <Catalog courses={courses} />
      <section className="mx-auto max-w-[1200px] px-6 pb-14">
        <div className="flex flex-wrap items-center justify-between gap-6 rounded-2xl border border-line bg-surface p-8">
          <div className="flex flex-[1_1_420px] flex-col gap-2">
            <h2 className="text-2xl font-bold">Theo dõi việc học của bạn</h2>
            <p className="text-[15px] leading-relaxed text-muted">
              Đăng nhập bằng tài khoản Google để đăng ký khoá học, lưu tiến độ và xem lại các khoá đã hoàn thành.
            </p>
          </div>
          <Link
            href="/khoa-hoc-cua-toi"
            className="flex min-h-12 items-center rounded-[10px] bg-accent px-[22px] text-[15px] font-semibold text-white no-underline hover:bg-accent-dark hover:text-white"
          >
            Xem khoá học của tôi
          </Link>
        </div>
      </section>
    </>
  );
}
