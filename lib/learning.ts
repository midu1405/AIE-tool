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
