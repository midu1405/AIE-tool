import { ComingSoon } from "@/components/ComingSoon";

export const metadata = { title: "Danh sách KHBD" };

export default function Page() {
  return <ComingSoon title="Danh sách KHBD" phase={2} design="DanhSachKHBD.dc.html" note="Lọc theo trạng thái, lớp, cách soạn; mỗi dòng mở được bản mới nhất và lịch sử phiên bản." />;
}
