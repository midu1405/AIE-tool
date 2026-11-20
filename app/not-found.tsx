import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex max-w-[640px] flex-col items-start gap-3 px-6 py-16">
      <p className="text-sm font-semibold text-muted">Lỗi 404</p>
      <h1 className="text-[30px] font-bold">Không tìm thấy trang này</h1>
      <p className="text-[15px] leading-relaxed text-muted">
        Đường dẫn có thể đã đổi, hoặc khoá học chưa được xuất bản. Quay lại danh mục để chọn khoá khác.
      </p>
      <Link
        href="/"
        className="mt-2 flex min-h-11 items-center rounded-[10px] bg-accent px-5 font-semibold text-white no-underline hover:bg-accent-dark hover:text-white"
      >
        Về danh mục khoá học
      </Link>
    </main>
  );
}
