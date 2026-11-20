import { ComingSoon } from "@/components/ComingSoon";

export const metadata = { title: "Tiến độ soạn" };

export default function Page() {
  return <ComingSoon title="Tiến độ soạn" phase={2} design="TienDo.dc.html" note="Mỗi bài một thẻ với 6 bước, cập nhật trực tiếp qua Supabase Realtime; chạy lại từ bước lỗi." />;
}
