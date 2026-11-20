import { ComingSoon } from "@/components/ComingSoon";

export const metadata = { title: "Quản lý khoá học" };

export default function Page() {
  return <ComingSoon title="Quản lý khoá học" phase={3} design="QuanLyKhoaHoc.dc.html" note="Tạo và sửa khoá, học phần, bài; gắn KHBD/PBT đã duyệt; báo khi có bản mới đã duyệt; chỉ Academic lead xuất bản hoặc ẩn." />;
}
