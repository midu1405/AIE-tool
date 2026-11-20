import { asKind, type StepKind } from "@/lib/steps";
// Tính tiến độ học của giáo viên trên một khoá (trang chi tiết và Khoá học của tôi). Không phụ thuộc React.

export type LModule = { id: string; title: string; lessons: { id: string; title: string }[] };

export function courseProgress(modules: LModule[], done: Set<string>) {
  const lessons = modules.flatMap((m) => m.lessons);
  const total = lessons.length;
  const doneCount = lessons.filter((l) => done.has(l.id)).length;
  const percent = total ? Math.round((doneCount / total) * 100) : 0;
  const currentIndex = modules.findIndex((m) => m.lessons.some((l) => !done.has(l.id)));
  const moduleState = modules.map((m, i) => {
    const d = m.lessons.filter((l) => done.has(l.id)).length;
    const complete = m.lessons.length > 0 && d === m.lessons.length;
    return { complete, current: i === currentIndex, done: d, total: m.lessons.length };
  });
  const nextLesson = currentIndex >= 0 ? modules[currentIndex].lessons.find((l) => !done.has(l.id)) ?? null : null;
  return { total, doneCount, percent, currentIndex, moduleState, nextLesson };
}

export function nextLabel(modules: LModule[], done: Set<string>) {
  const p = courseProgress(modules, done);
  if (p.total === 0) return "Khoá chưa có bài";
  if (p.currentIndex < 0) return "Đã học hết các bài";
  return `Tiếp theo: Học phần ${p.currentIndex + 1}. ${modules[p.currentIndex].title}`;
}

// ---------------------------------------------------------------- khung 3 tầng: Học phần → Phần → Bước

export type OStep = { id: string; title: string; kind: StepKind; mins: number | null; ready: boolean };
export type OSection = { id: string; title: string; steps: OStep[] };
/** lessons = mọi bước của học phần theo thứ tự (để tính tiến độ như LModule). */
export type OModule = { id: string; title: string; sections: OSection[]; lessons: OStep[] };

type RawLesson = { id: string; title: string; position: number; duration_minutes: number | null; kind: string; ready?: boolean };
type RawSection = { id: string; title: string; position: number; course_lessons: RawLesson[] };
export type RawModule = { id: string; title: string; position: number; course_sections: RawSection[] };

/** Câu select lồng nhau dùng chung cho trang khoá, trang học một bước và màn soạn. */
export const OUTLINE_SELECT =
  "course_modules(id, title, position, course_sections(id, title, position, course_lessons(id, title, position, duration_minutes, kind, ready)))";

const byPos = <T extends { position: number }>(xs: T[] | null | undefined) => [...(xs ?? [])].sort((a, b) => a.position - b.position);

export function buildOutline(raw: RawModule[] | null | undefined): OModule[] {
  return byPos(raw).map((m) => {
    const sections = byPos(m.course_sections).map((s) => ({
      id: s.id,
      title: s.title,
      steps: byPos(s.course_lessons).map((l) => ({ id: l.id, title: l.title, kind: asKind(l.kind), mins: l.duration_minutes, ready: !!l.ready })),
    }));
    return { id: m.id, title: m.title, sections, lessons: sections.flatMap((s) => s.steps) };
  });
}

/** Vị trí một bước trong khoá: học phần, phần, số thứ tự trong học phần, bước trước/sau. */
export function locateStep(mods: OModule[], id: string) {
  const flat = mods.flatMap((m, mi) => m.sections.flatMap((s) => s.steps.map((st) => ({ st, mi, section: s }))));
  const k = flat.findIndex((x) => x.st.id === id);
  if (k < 0) return null;
  const { mi, section, st } = flat[k];
  return {
    step: st,
    moduleIndex: mi,
    module: mods[mi],
    section,
    indexInModule: mods[mi].lessons.findIndex((x) => x.id === id),
    prev: flat[k - 1]?.st ?? null,
    next: flat[k + 1]?.st ?? null,
    nextModuleFirst: mods[mi + 1]?.lessons[0] ?? null,
  };
}
