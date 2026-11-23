import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { IssueCertificate } from "@/components/cert/IssueCertificate";
import { Icon } from "@/components/Icon";
import { getCurrentUser } from "@/lib/auth";
import { certMeta, viDate, type Certificate } from "@/lib/certificate";
import { certSigner } from "@/lib/certificate-pdf";
import { siteOrigin } from "@/lib/site-url";
import { createClient } from "@/lib/supabase/server";
import { btnPrimary } from "@/lib/ui";

// Nhận giấy chứng nhận (design/artboards/NhanChungNhan.dc.html): xác nhận họ tên rồi cấp; đã cấp thì tải PDF, mở trang xác minh.
export const metadata = { title: "Giấy chứng nhận" };

export default function CertificatePage({ params }: PageProps<"/khoa-hoc/[slug]/chung-nhan">) {
  return (
    <Suspense fallback={<div className="mx-auto max-w-[1200px] px-6 py-10 text-muted">Đang tải giấy chứng nhận…</div>}>
      <Body params={params} />
    </Suspense>
  );
}

async function Body({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/dang-nhap?next=${encodeURIComponent(`/khoa-hoc/${slug}/chung-nhan`)}`);
  const supabase = await createClient();
  const { data: course } = await supabase
    .from("courses")
    .select("id, slug, title, status, hours_min, hours_max, course_modules(id, course_lessons(id))")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (!course) notFound();
  const c = course as { id: string; slug: string; title: string; hours_min: number; hours_max: number; course_modules: { id: string; course_lessons: { id: string }[] }[] };
  const lessonIds = c.course_modules.flatMap((m) => m.course_lessons.map((l) => l.id));
  const [{ data: en }, { data: cert }, { count: doneCount }] = await Promise.all([
    supabase.from("enrollments").select("completed_at").eq("course_id", c.id).eq("user_id", user.id).maybeSingle(),
    supabase.from("certificates").select("*").eq("course_id", c.id).eq("user_id", user.id).is("revoked_at", null).maybeSingle(),
    supabase.from("lesson_progress").select("lesson_id", { count: "exact", head: true }).eq("user_id", user.id).in("lesson_id", lessonIds),
  ]);
  const completedAt = (en as { completed_at: string | null } | null)?.completed_at ?? null;
  const origin = await siteOrigin();
  const signer = certSigner();

  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-6 pt-6 pb-14">
      <nav aria-label="Đường dẫn" className="flex flex-wrap gap-2 text-sm text-muted">
        <Link href="/khoa-hoc-cua-toi" className="text-muted">
          Khoá học của tôi
        </Link>
        <span aria-hidden="true">›</span>
        <Link href={`/khoa-hoc/${c.slug}`} className="text-muted">
          {c.title}
        </Link>
        <span aria-hidden="true">›</span>
        <span>Giấy chứng nhận</span>
      </nav>

      {completedAt ? (
        <section className="flex flex-wrap items-center gap-5 rounded-xl border border-line bg-surface p-7">
          <span aria-hidden="true" className="flex h-14 w-14 flex-none items-center justify-center rounded-full bg-ok-soft">
            <Icon d="M5 12.5l4.2 4.2L19 7" size={28} stroke="#1D6E47" width={2.2} />
          </span>
          <div className="flex min-w-0 flex-[999_1_420px] flex-col gap-1.5">
            <h1 className="text-[28px] leading-tight font-bold">Chúc mừng, bạn đã hoàn thành khoá học!</h1>
            <p className="text-base text-muted">
              {c.title} · {c.course_modules.length} học phần · {lessonIds.length} bước · Hoàn thành ngày {viDate(completedAt)}
            </p>
          </div>
        </section>
      ) : (
        <section className="flex flex-col items-start gap-3 rounded-xl border border-line bg-surface p-7">
          <h1 className="text-[28px] leading-tight font-bold">Giấy chứng nhận</h1>
          <p className="max-w-[720px] text-base leading-relaxed text-muted">
            {en
              ? `Bạn cần xong mọi bước của khoá để nhận giấy chứng nhận. Còn ${Math.max(0, lessonIds.length - (doneCount ?? 0))} bước.`
              : "Bạn chưa đăng ký khoá này. Đăng ký và học xong mọi bước để nhận giấy chứng nhận."}
          </p>
          <Link href={`/khoa-hoc/${c.slug}#noi-dung`} className={btnPrimary}>
            {en ? "Tiếp tục học" : "Xem khoá học"}
          </Link>
        </section>
      )}

      {completedAt && (
        <IssueCertificate
          courseId={c.id}
          slug={c.slug}
          defaultName={user.name.includes("@") ? "" : user.name}
          origin={origin}
          signer={signer}
          courseTitle={c.title}
          meta={certMeta({ hours_min: c.hours_min, hours_max: c.hours_max, module_count: c.course_modules.length, completed_at: completedAt })}
          cert={(cert as Certificate | null) ?? null}
        />
      )}
    </main>
  );
}
