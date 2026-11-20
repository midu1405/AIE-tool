import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { FORMATS, LEVELS, TOPICS, audienceText, hoursText } from "@/lib/catalog";
import { getPublishedCourse } from "@/lib/courses";

// Bản đầu của trang chi tiết (giai đoạn 1): thông tin khoá và danh sách học phần.
// Đăng ký học, tiến độ, học liệu làm ở giai đoạn 3 theo design/artboards/Detail.dc.html.
export default function CoursePage({ params }: PageProps<"/khoa-hoc/[slug]">) {
  return (
    <Suspense fallback={<div className="mx-auto max-w-[1200px] px-6 py-10 text-muted">Đang tải khoá học…</div>}>
      <CourseDetail params={params} />
    </Suspense>
  );
}

async function CourseDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = await getPublishedCourse(slug);
  if (!c) notFound();
  const t = TOPICS[c.topic];
  return (
    <>
      <section className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-4 px-6 pt-8 pb-8">
          <nav aria-label="Đường dẫn" className="text-sm text-muted">
            <Link href="/">Khoá học</Link> <span aria-hidden="true">›</span> <span>{c.title}</span>
          </nav>
          <span className="self-start rounded-md px-2 py-[3px] text-xs font-semibold" style={{ background: t.tint, color: t.ink }}>
            {t.label}
          </span>
          <h1 className="max-w-[860px] text-[34px] leading-tight font-bold">{c.title}</h1>
          <p className="max-w-[760px] text-[17px] leading-relaxed text-muted">{c.description || c.summary}</p>
          <dl className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
            <Meta k="Thời lượng" v={hoursText(c.hoursMin, c.hoursMax)} />
            <Meta k="Hình thức" v={FORMATS[c.format]} />
            <Meta k="Trình độ" v={LEVELS[c.level]} />
            <Meta k="Đối tượng" v={audienceText(c.audiences)} />
            <Meta k="Căn cứ" v={c.legalBasis} />
          </dl>
        </div>
      </section>

      <main className="mx-auto flex max-w-[1200px] flex-col gap-8 px-6 py-8">
        {c.outcomes.length > 0 && (
          <section className="rounded-xl border border-line bg-surface p-6">
            <h2 className="mb-3 text-xl font-bold">Bạn sẽ học được gì</h2>
            <ul className="list-disc space-y-1.5 pl-5 text-[15px]">
              {c.outcomes.map((o) => (
                <li key={o}>{o}</li>
              ))}
            </ul>
          </section>
        )}
        <section className="rounded-xl border border-line bg-surface p-6">
          <h2 className="mb-3 text-xl font-bold">Nội dung khoá học</h2>
          {c.modules.length === 0 ? (
            <p className="text-muted">Nội dung đang được soạn.</p>
          ) : (
            <ol className="flex flex-col gap-4">
              {c.modules.map((m, i) => (
                <li key={m.id}>
                  <h3 className="font-semibold">
                    Học phần {i + 1}. {m.title}
                  </h3>
                  <ul className="mt-1 list-disc pl-5 text-[15px] text-muted">
                    {m.lessons.map((l) => (
                      <li key={l.id}>{l.title}</li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          )}
        </section>
      </main>
    </>
  );
}

function Meta({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-1.5">
      <dt className="text-muted">{k}:</dt>
      <dd className="font-medium">{v}</dd>
    </div>
  );
}
