import { ComingSoon } from "@/components/ComingSoon";

export const metadata = { title: "Sửa khoá học" };

export default function Page() {
  return (
    <ComingSoon
      title="Sửa khoá học"
      phase={3}
      design="QuanLyKhoaHoc.dc.html"
      note="Thông tin khoá, học phần và bài, gắn học liệu đã duyệt, xuất bản hoặc ẩn."
    />
  );
}
