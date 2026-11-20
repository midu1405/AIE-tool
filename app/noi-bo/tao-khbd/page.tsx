import { ComingSoon } from "@/components/ComingSoon";

export const metadata = { title: "Tạo KHBD" };

export default function Page() {
  return <ComingSoon title="Tạo KHBD" phase={2} design="TaoKHBD.dc.html" note="Soạn lại từ kho (chọn bài trong cây Tiểu học, THCS, THPT) hoặc soạn bài mới theo lớp và chủ đề khung NLS; căn cứ QĐ 2422, CV 5588; chạy qua MockExecutor cho đến khi chốt bên thực hiện." />;
}
