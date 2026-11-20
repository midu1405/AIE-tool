/** Chặn mở chuyển hướng ra ngoài: chỉ nhận đường dẫn nội bộ bắt đầu bằng "/". */
export function safeNext(next: string | null | undefined, fallback = "/") {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : fallback;
}
