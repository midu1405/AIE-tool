// Biểu tượng nét mảnh dùng chung, vẽ bằng path như trong bản mẫu. Luôn aria-hidden: chữ đi kèm mới mang nghĩa.
export const ICONS = {
  search: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4",
  close: "M6 6l12 12M18 6L6 18",
  clock: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2",
  plus: "M12 5v14M5 12h14",
  pulse: "M3 12h4l3-7 4 14 3-7h4",
  list: "M9 6h11M9 12h11M9 18h11M4 6h1M4 12h1M4 18h1",
  check: "M9 11l3 3 8-8M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9",
  book: "M4 19V5a2 2 0 0 1 2-2h14v14H6a2 2 0 0 0-2 2zm0 0a2 2 0 0 0 2 2h14M8 7h8",
} as const;

export function Icon({
  d,
  size = 18,
  stroke = "currentColor",
  width = 1.8,
  className,
}: {
  d: string;
  size?: number;
  stroke?: string;
  width?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="none"
      stroke={stroke}
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={d} />
    </svg>
  );
}

