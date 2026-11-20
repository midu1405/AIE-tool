import { ComingSoon } from "@/components/ComingSoon";

export const metadata = { title: "Duyệt bài" };

export default function Page() {
  return (
    <ComingSoon
      title="Duyệt bài"
      phase={2}
      design="DuyetBai.dc.html"
      note="Xem trước KHBD, đối chiếu checklist 2422/5588, chấm rubric 7 tiêu chí, góp ý, duyệt hoặc trả về."
    />
  );
}
