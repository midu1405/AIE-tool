import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { StepView, type StepMaterial } from "@/components/learn/StepView";
import { getCurrentUser } from "@/lib/auth";
import { buildOutline, locateStep, OUTLINE_SELECT, type RawModule } from "@/lib/learning";
import type { StepBody } from "@/lib/steps";
import { createClient } from "@/lib/supabase/server";

// Học một bước (design/artboards/HocBuoc.dc.html). Cần đăng nhập và đã đăng ký khoá; nhân viên xem trước được
// cả khoá nháp (RLS cho nhân viên đọc mọi khoá), tiến độ của nhân viên không được lưu.
export const metadata = { title: "Học một bước" };

export default function StepPage({ params }: PageProps<"/khoa-hoc/[slug]/buoc/[id]">) {
  return (
    <Suspense fallback={<div className="mx-auto max-w-[1280px] px-6 py-10 text-muted">Đang tải bước học…</div>}>
      <Body params={params} />
    </Suspense>
  );
}

async function Body({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const user = await getCurrentUser();
  if (!user) redirect(`/dang-nhap?next=${encodeURIComponent(`/khoa-hoc/${slug}/buoc/${id}`)}`);
  const supabase = await createClient();
  const { data: course } = await supabase.from("courses").select(`id, slug, title, status, ${OUTLINE_SELECT}`).eq("slug", slug).maybeSingle();
  if (!course) notFound();
  const c = course as unknown as { id: string; slug: string; title: string; status: string; course_modules: RawModule[] };
  const modules = buildOutline(c.course_modules);
  const loc = locateStep(modules, id);
  if (!loc) notFound();

  const ids = modules.flatMap((m) => m.lessons.map((l) => l.id));
  const [{ data: en }, { data: content }, { data: progress }, { data: reflection }, { data: attempt }, { data: mats }] = await Promise.all([
    supabase.from("enrollments").select("course_id").eq("course_id", c.id).eq("user_id", user.id).maybeSingle(),
    supabase.from("lesson_contents").select("body").eq("lesson_id", id).maybeSingle(),
    supabase.from("lesson_progress").select("lesson_id").eq("user_id", user.id).in("lesson_id", ids),
    supabase.from("reflections").select("answer, link, updated_at").eq("lesson_id", id).eq("user_id", user.id).maybeSingle(),
    supabase.from("quiz_attempts").select("correct, total, passed, created_at").eq("lesson_id", id).eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.rpc("course_material_links", { p_course_id: c.id }),
  ]);
  const staff = user.roles.length > 0;
  if (!en && !staff) redirect(`/khoa-hoc/${slug}#noi-dung`);

  return (
    <StepView
      course={{ id: c.id, slug: c.slug, title: c.title, draft: c.status !== "published" }}
      modules={modules}
      stepId={id}
      body={((content as { body: StepBody } | null)?.body ?? {}) as StepBody}
      done={((progress ?? []) as { lesson_id: string }[]).map((r) => r.lesson_id)}
      reflection={reflection as { answer: string; link: string; updated_at: string } | null}
      lastAttempt={attempt as { correct: number; total: number; passed: boolean } | null}
      materials={((mats ?? []) as (StepMaterial & { lesson_id: string })[]).filter((m) => m.lesson_id === id)}
      preview={!en}
    />
  );
}
