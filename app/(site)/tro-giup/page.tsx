import Link from "next/link";
import { InfoPage, SupportContact } from "@/components/InfoPage";

export const metadata = { title: "Trợ giúp" };

const FAQ: { q: string; a: React.ReactNode }[] = [
  {
    q: "Tôi đăng nhập bằng gì?",
    a: "Giáo viên đăng nhập bằng tài khoản Google. Không cần tạo mật khẩu riêng. Nhân viên AI Edu đăng nhập bằng tài khoản công ty.",
  },
  {
    q: "Khoá học có mất phí không?",
    a: "Không. Các khoá trên AI Edu Training Hub miễn phí cho giáo viên.",
  },
  {
    q: "Một khoá học gồm những gì?",
    a: "Mỗi khoá chia thành học phần, mỗi học phần có vài phần, mỗi phần có các bước: bài đọc, video, quiz, câu hỏi phản tư và bước tổng kết. Trang khoá học ghi số bước và thời lượng ước tính.",
  },
  {
    q: "Tiến độ của tôi có được lưu không?",
    a: "Có. Bước bạn đã xong được lưu theo tài khoản, nên học dở trên máy tính rồi mở tiếp trên điện thoại vẫn đúng chỗ. Xem các khoá đang học ở mục Khoá học của tôi.",
  },
  {
    q: "Làm sao để xong một bước?",
    a: "Bài đọc, video và bước tổng kết: bấm “Đánh dấu đã xong”. Quiz: đúng ít nhất 80% số câu. Câu hỏi phản tư: lưu câu trả lời của bạn.",
  },
  {
    q: "Làm sai quiz thì sao?",
    a: "Bạn làm lại bao nhiêu lần cũng được. Sau mỗi lần nộp, trang cho biết câu nào đúng, câu nào chưa và giải thích.",
  },
  {
    q: "Ai đọc được câu trả lời phản tư của tôi?",
    a: (
      <>
        Bạn và người phụ trách khoá học ở AI Edu. Giáo viên khác không xem được. Chi tiết ở trang <Link href="/quyen-rieng-tu">Quyền riêng tư</Link>.
      </>
    ),
  },
  {
    q: "Học xong khoá có chứng nhận không?",
    a: "Bản đầu của web chưa cấp chứng nhận. Học xong mọi bước, khoá được đánh dấu “Đã hoàn thành” trong Khoá học của tôi.",
  },
  {
    q: "Tôi không mở được học liệu (KHBD, phiếu bài tập) gắn trong bước học.",
    a: "Học liệu hiện sau khi bạn đăng ký khoá. Nếu link báo không có quyền truy cập, hãy báo cho AI Edu kèm tên khoá và tên bước.",
  },
];

export default function HelpPage() {
  return (
    <InfoPage title="Trợ giúp" lead="Câu hỏi thường gặp khi học trên AI Edu Training Hub." updated="23/11/2026">
      <section className="flex flex-col gap-2">
        {FAQ.map((f) => (
          <details key={f.q} className="rounded-[10px] border border-line px-4">
            <summary className="flex min-h-12 cursor-pointer items-center py-2 font-semibold">{f.q}</summary>
            <div className="pb-4 text-muted">{f.a}</div>
          </details>
        ))}
      </section>
      <section className="flex flex-col gap-2">
        <h2>Cần hỗ trợ thêm?</h2>
        <p>
          Gửi email tới <SupportContact />. Ghi tên khoá, tên bước và chụp màn hình nếu có lỗi để AI Edu hỗ trợ nhanh hơn.
        </p>
      </section>
    </InfoPage>
  );
}
