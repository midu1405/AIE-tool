import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Icon } from "@/components/Icon";
import { CourseContents, CourseLearner, EnrollBox } from "@/components/learn/CourseLearner";
import { FORMATS, LEVELS, TOPICS, audienceText, hoursText } from "@/lib/catalog";
import { getPublishedCourse, getPublishedCourses } from "@/lib/courses";

// Trang chi tiết khoá theo design/artboards/Detail.dc.html. Nội dung khoá đọc từ server (lưu đệm, thẻ "courses");
// đăng ký, lưu, đánh dấu bài đã học và học liệu đọc theo phiên trong CourseLearner.
export async function generateStaticParams() {
  const courses = await getPublishedCourses();
  return courses.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: PageProps<"/khoa-hoc/[slug]">) {
  const { slug } = await params;
  const c = await getPublishedCourse(slug);
  return c ? { title: c.title, description: c.summary } : { title: "Không tìm thấy khoá học" };
}

export default function CoursePage({ params }: PageProps<"/khoa-hoc/[slug]">) {
  return (
    <Suspense fallback={<div className="mx-auto max-w-[1200px] px-6 py-10 text-muted">Đang tải khoá học…</div>}>
      <CourseDetail params={params} />
    </Suspense>
  );
}

async function CourseDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [c, all] = await Promise.all([getPublishedCourse(slug), getPublishedCourses()]);
  if (!c) notFound();
  const t = TOPICS[c.topic];
  const lessonCount = c.modules.reduce((n, m) => n + m.lessons.length, 0);
  const others = all.filter((x) => x.id !== c.id);
  const related = [...others.filter((x) => x.topic === c.topic), ...others.filter((x) => x.topic !== c.topic)].slice(0, 3);
  const modules = c.modules.map((m) => ({ id: m.id, title: m.title, lessons: m.lessons.map((l) => ({ id: l.id, title: l.title })) }));

  return (
    <CourseLearner courseId={c.id} modules={modules}>
      <section className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-start gap-8 px-6 pt-6 pb-10">
          <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-4">
            <nav aria-label="Đường dẫn" className="flex flex-wrap gap-2 text-sm text-muted">
              <Link href="/" className="text-muted">
                Khoá học
              </Link>
              <span aria-hidden="true">›</span>
              <span>{t.label}</span>
            </nav>
            <span className="self-start rounded-md px-2.5 py-1 text-[13px] font-semibold" style={{ background: t.tint, color: t.ink }}>
              {t.label}
            </span>
            <h1 className="text-[30px] leading-tight font-bold sm:text-[38px]">{c.title}</h1>
            <p className="max-w-[720px] text-[17px] leading-relaxed text-muted">{c.description || c.summary}</p>
            <ul className="mt-2 flex flex-wrap gap-x-6 gap-y-2.5 text-[15px]">
              <li className="flex items-center gap-2">
                <Icon d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2" stroke="#4B5565" />
                {hoursText(c.hoursMin, c.hoursMax)}
              </li>
              <li className="flex items-center gap-2">
                <Icon d="M4 5h16M4 12h16M4 19h10" stroke="#4B5565" />
                {c.modules.length} học phần · {lessonCount} bài
              </li>
              <li>{FORMATS[c.format]}</li>
              <li>{LEVELS[c.level]}</li>
              <li>Đối tượng: {audienceText(c.audiences)}</li>
            </ul>
          </div>
          <div className="flex w-full max-w-[380px] flex-[1_1_300px] flex-col gap-4 rounded-[14px] border border-line bg-bg p-6">
            <EnrollBox />
          </div>
        </div>
      </section>

      <main className="mx-auto flex max-w-[1200px] flex-wrap items-start gap-8 px-6 pt-8 pb-14">
        <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-8">
          {c.outcomes.length > 0 && (
            <section className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-7">
              <h2 className="text-[22px] font-bold">Bạn sẽ học được gì</h2>
              <ul className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-x-6 gap-y-3 text-[15px] leading-normal">
                {c.outcomes.map((o) => (
                  <li key={o} className="flex gap-2.5">
                    <Icon d="M5 12l5 5L19 7" size={20} stroke="#1D6E47" width={2} className="mt-0.5 flex-none" />
                    {o}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <CourseContents />

          {c.audienceNote && (
            <section className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-7">
              <h2 className="text-[22px] font-bold">Dành cho ai</h2>
              <p className="text-[15px] leading-relaxed text-muted">{c.audienceNote}</p>
            </section>
          )}
        </div>

        <aside className="flex w-full max-w-[380px] flex-[1_1_300px] flex-col gap-5">
          <section className="flex flex-col gap-3.5 rounded-xl border border-line bg-surface p-6">
            <h2 className="text-lg font-bold">Thông tin khoá học</h2>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2.5 text-sm">
              <dt className="text-muted">Thời lượng</dt>
              <dd>{hoursText(c.hoursMin, c.hoursMax)}</dd>
              <dt className="text-muted">Hình thức</dt>
              <dd>{FORMATS[c.format]}</dd>
              <dt className="text-muted">Trình độ</dt>
              <dd>{LEVELS[c.level]}</dd>
              {c.legalBasis && (
                <>
                  <dt className="text-muted">Căn cứ</dt>
                  <dd>{c.legalBasis}</dd>
                </>
              )}
              {/* Quyết định đã chốt 1: bản đầu chưa cấp chứng nhận. */}
              <dt className="text-muted">Chứng nhận</dt>
              <dd>Không</dd>
            </dl>
          </section>
          {related.length > 0 && (
            <section className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-6">
              <h2 className="text-lg font-bold">Khoá học liên quan</h2>
              {related.map((r) => (
                <Link key={r.id} href={`/khoa-hoc/${r.slug}`} className="flex min-h-11 items-center text-[15px] font-semibold no-underline">
                  {r.title}
                </Link>
              ))}
            </section>
          )}
        </aside>
      </main>
    </CourseLearner>
  );
}
