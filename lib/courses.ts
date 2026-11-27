import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import type { CatalogCourse } from "@/lib/catalog";
import { buildOutline, OUTLINE_SELECT, type OModule, type RawModule } from "@/lib/learning";

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
  is_demo: boolean;
};

const COLS = "id, slug, title, summary, description, topic, audiences, hours_min, hours_max, format, level, outcomes, audience_note, legal_basis, is_demo";

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
    demo: r.is_demo,
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
    // Khoá học thật (đăng ký được) xếp trước khoá minh hoạ (is_demo), để người mới vào thấy ngay khoá trải nghiệm.
    .order("is_demo", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw new Error(`Không tải được danh mục khoá học: ${error.message}`);
  return (data as CourseRow[]).map(toCatalog);
}

export type CourseDetail = CatalogCourse & {
  description: string;
  outcomes: string[];
  prerequisites: string[];
  materialsNeeded: string[];
  audienceNote: string;
  legalBasis: string;
  modules: OModule[];
  /** Số KHBD, PBT gắn trong khoá. Link chỉ mở cho người đã đăng ký (course_material_links); ai cũng thấy số lượng. */
  materials: { khbd: number; pbt: number };
};

export async function getPublishedCourse(slug: string): Promise<CourseDetail | null> {
  "use cache";
  cacheTag("courses", `course:${slug}`);
  cacheLife("minutes");
  const { data, error } = await createPublicClient()
    .from("courses")
    .select(`${COLS}, prerequisites, materials_needed, ${OUTLINE_SELECT}`)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (error) throw new Error(`Không tải được khoá học: ${error.message}`);
  if (!data) return null;
  const row = data as unknown as CourseRow & { prerequisites: string[]; materials_needed: string[]; course_modules: RawModule[] };
  const { data: counts } = await createPublicClient().rpc("course_material_counts", { p_course_id: row.id });
  const n = (k: string) => ((counts ?? []) as { kind: string; n: number }[]).find((c) => c.kind === k)?.n ?? 0;
  return {
    ...toCatalog(row),
    description: row.description,
    outcomes: row.outcomes,
    prerequisites: row.prerequisites ?? [],
    materialsNeeded: row.materials_needed ?? [],
    audienceNote: row.audience_note,
    legalBasis: row.legal_basis,
    modules: buildOutline(row.course_modules),
    materials: { khbd: n("khbd"), pbt: n("pbt") },
  };
}
