import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import type { CatalogCourse } from "@/lib/catalog";

type CourseRow = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  description: string;
  topic: CatalogCourse["topic"];
  audiences: CatalogCourse["audiences"];
  hours_min: number;
  hours_max: number;
  format: CatalogCourse["format"];
  level: CatalogCourse["level"];
  outcomes: string[];
  audience_note: string;
  legal_basis: string;
};

const COLS = "id, slug, title, summary, description, topic, audiences, hours_min, hours_max, format, level, outcomes, audience_note, legal_basis";

function toCatalog(r: CourseRow): CatalogCourse {
  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    summary: r.summary,
    topic: r.topic,
    audiences: r.audiences,
    hoursMin: Number(r.hours_min),
    hoursMax: Number(r.hours_max),
    format: r.format,
    level: r.level,
  };
}

/** Khoá đã xuất bản (RLS cho vai trò anon chỉ trả khoá published). Lưu đệm vài phút. */
export async function getPublishedCourses(): Promise<CatalogCourse[]> {
  "use cache";
  cacheTag("courses");
  cacheLife("minutes");
  const { data, error } = await createPublicClient()
    .from("courses")
    .select(COLS)
    .eq("status", "published")
    .order("created_at", { ascending: true });
  if (error) throw new Error(`Không tải được danh mục khoá học: ${error.message}`);
  return (data as CourseRow[]).map(toCatalog);
}

export type CourseDetail = CatalogCourse & {
  description: string;
  outcomes: string[];
  audienceNote: string;
  legalBasis: string;
  modules: { id: string; title: string; lessons: { id: string; title: string; durationMinutes: number | null }[] }[];
};

export async function getPublishedCourse(slug: string): Promise<CourseDetail | null> {
  "use cache";
  cacheTag("courses", `course:${slug}`);
  cacheLife("minutes");
  const { data, error } = await createPublicClient()
    .from("courses")
    .select(`${COLS}, course_modules(id, title, position, course_lessons(id, title, position, duration_minutes))`)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (error) throw new Error(`Không tải được khoá học: ${error.message}`);
  if (!data) return null;
  const row = data as CourseRow & {
    course_modules: { id: string; title: string; position: number; course_lessons: { id: string; title: string; position: number; duration_minutes: number | null }[] }[];
  };
  return {
    ...toCatalog(row),
    description: row.description,
    outcomes: row.outcomes,
    audienceNote: row.audience_note,
    legalBasis: row.legal_basis,
    modules: [...row.course_modules]
      .sort((a, b) => a.position - b.position)
      .map((m) => ({
        id: m.id,
        title: m.title,
        lessons: [...m.course_lessons]
          .sort((a, b) => a.position - b.position)
          .map((l) => ({ id: l.id, title: l.title, durationMinutes: l.duration_minutes })),
      })),
  };
}
