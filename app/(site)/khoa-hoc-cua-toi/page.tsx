import { redirect } from "next/navigation";
import { Suspense } from "react";
import { MyCourses, MyCoursesHeader, type MyItem } from "@/components/learn/MyCourses";
import { getCurrentUser } from "@/lib/auth";
import { type Topic, FORMATS, hoursText } from "@/lib/catalog";
import { courseProgress, nextLabel, type LModule } from "@/lib/learning";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Khoá học của tôi" };

// Theo design/artboards/MyCourses.dc.html: ba tab Đang học / Đã hoàn thành / Đã lưu.
// Khoá đã xong có thêm nút giấy chứng nhận (nhận giấy hoặc xem giấy đã cấp).
export default function MyCoursesPage() {
  return (
    <Suspense fallback={<MyCoursesHeader />}>
      <Body />
    </Suspense>
  );
}

type CourseRow = {
  id: string;
  slug: string;
  title: string;
  topic: Topic;
  status: string;
  hours_min: number;
  hours_max: number;
  format: keyof typeof FORMATS;
  course_modules: { id: string; title: string; position: number; course_lessons: { id: string; title: string; position: number }[] }[];
};

const COURSE_COLS = "id, slug, title, topic, status, hours_min, hours_max, format, course_modules(id, title, position, course_lessons(id, title, position))";

function toModules(c: CourseRow): LModule[] {
  return [...c.course_modules]
    .sort((a, b) => a.position - b.position)
    .map((m) => ({ id: m.id, title: m.title, lessons: [...m.course_lessons].sort((a, b) => a.position - b.position).map((l) => ({ id: l.id, title: l.title })) }));
}

const dateVN = (s: string) => new Date(s).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Asia/Ho_Chi_Minh" });

async function Body() {
  const user = await getCurrentUser();
  if (!user) redirect("/dang-nhap?next=/khoa-hoc-cua-toi");
  const supabase = await createClient();
  const [en, sv, lp, ce] = await Promise.all([
    supabase.from("enrollments").select(`course_id, enrolled_at, completed_at, courses(${COURSE_COLS})`).order("enrolled_at", { ascending: false }),
    supabase.from("saved_courses").select(`course_id, saved_at, courses(${COURSE_COLS})`).order("saved_at", { ascending: false }),
    supabase.from("lesson_progress").select("lesson_id"),
    supabase.from("certificates").select("course_id").eq("user_id", user.id).is("revoked_at", null),
  ]);
  const certified = new Set(((ce.data ?? []) as { course_id: string }[]).map((r) => r.course_id));
  const error = en.error ?? sv.error ?? lp.error;
  const done = new Set(((lp.data ?? []) as { lesson_id: string }[]).map((r) => r.lesson_id));
  const enrolledIds = new Set<string>();
  const items: MyItem[] = [];

  for (const e of (en.data ?? []) as unknown as { course_id: string; completed_at: string | null; courses: CourseRow | null }[]) {
    enrolledIds.add(e.course_id);
    const c = e.courses;
    // RLS trả khoá đang xuất bản và khoá đã ẩn mà mình đã đăng ký (B7, 20261126074808_gop_y_prd). Không đọc được
    // (khoá chuyển về nháp hoặc đã xoá) thì chỉ báo tên.
    if (!c || (c.status !== "published" && c.status !== "hidden")) {
      items.push({
        key: e.course_id,
        group: e.completed_at ? "done" : "learning",
        title: c?.title ?? "Khoá học đã tạm ẩn",
        topic: c?.topic ?? null,
        note: "Khoá này đang tạm ẩn. Tiến độ của bạn vẫn được giữ và hiện lại khi khoá mở lại.",
        progress: null,
        href: null,
      });
      continue;
    }
    const modules = toModules(c);
    const p = courseProgress(modules, done);
    const group = e.completed_at ? "done" : "learning";
    // Khoá đã ẩn không còn trang giới thiệu: mở thẳng bước đang học (hoặc bước đầu).
    const hidden = c.status === "hidden";
    const step = p.nextLesson ?? modules[0]?.lessons[0] ?? null;
    const note = group === "done" ? `Hoàn thành ngày ${dateVN(e.completed_at!)}` : nextLabel(modules, done);
    items.push({
      key: c.id,
      group,
      title: c.title,
      topic: c.topic,
      note: hidden ? `${note} · Khoá đã ngừng nhận người mới, bạn vẫn học tiếp và nhận giấy được.` : note,
      progress: group === "done" ? 100 : p.percent,
      href: hidden ? (step ? `/khoa-hoc/${c.slug}/buoc/${step.id}` : null) : `/khoa-hoc/${c.slug}`,
      certHref: group === "done" ? `/khoa-hoc/${c.slug}/chung-nhan` : undefined,
      certIssued: certified.has(c.id),
    });
  }
  for (const s of (sv.data ?? []) as unknown as { course_id: string; courses: CourseRow | null }[]) {
    const c = s.courses;
    if (!c || c.status !== "published") continue;
    items.push({
      key: `luu-${c.id}`,
      group: "saved",
      title: c.title,
      topic: c.topic,
      note: `${hoursText(Number(c.hours_min), Number(c.hours_max))} · ${FORMATS[c.format]} · ${enrolledIds.has(c.id) ? "Đã đăng ký" : "Đã lưu để học sau"}`,
      progress: null,
      href: `/khoa-hoc/${c.slug}`,
      enrolled: enrolledIds.has(c.id),
    });
  }

  return <MyCourses items={items} error={error ? `Không tải được khoá học của bạn: ${error.message}. Tải lại trang sau ít phút.` : ""} />;
}
