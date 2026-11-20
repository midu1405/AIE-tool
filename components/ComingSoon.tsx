// Chỗ giữ cho các màn sẽ dựng ở giai đoạn sau; ghi rõ màn thiết kế tương ứng để bên theo dõi đối chiếu.
export function ComingSoon({ title, phase, design, note }: { title: string; phase: 2 | 3; design: string; note: string }) {
  return (
    <>
      <h1 className="text-[30px] font-bold">{title}</h1>
      <div className="max-w-[720px] rounded-xl border border-dashed border-edge bg-surface p-6">
        <p className="font-semibold">Màn này dựng ở giai đoạn {phase}.</p>
        <p className="mt-2 text-[15px] leading-relaxed text-muted">{note}</p>
        <p className="mt-3 text-sm text-muted">
          Thiết kế: <code className="rounded bg-bg px-1.5 py-0.5">design/artboards/{design}</code>
        </p>
      </div>
    </>
  );
}
