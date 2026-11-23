import { InfoPage, SupportContact } from "@/components/InfoPage";

export const metadata = { title: "Điều khoản sử dụng" };

// Bản nháp, chờ pháp chế AI Edu duyệt.
export default function TermsPage() {
  return (
    <InfoPage title="Điều khoản sử dụng" lead="Những điều cần biết khi học trên AI Edu Training Hub." updated="23/11/2026" draft>
      <section className="flex flex-col gap-2">
        <h2>Tài khoản</h2>
        <ul>
          <li>Bạn đăng nhập bằng tài khoản Google của chính mình và tự giữ an toàn cho tài khoản đó.</li>
          <li>Mỗi tài khoản dành cho một người học; không dùng chung tài khoản.</li>
        </ul>
      </section>
      <section className="flex flex-col gap-2">
        <h2>Nội dung khoá học và học liệu</h2>
        <ul>
          <li>Nội dung khoá học, kế hoạch bài dạy (KHBD) và phiếu học tập trên web do AI Edu soạn hoặc được phép sử dụng.</li>
          <li>Bạn được dùng học liệu để học và để dạy trong lớp của mình. Muốn đăng lại, bán hoặc chia sẻ rộng, hãy liên hệ AI Edu trước.</li>
        </ul>
      </section>
      <section className="flex flex-col gap-2">
        <h2>Nội dung bạn gửi</h2>
        <ul>
          <li>Câu trả lời phản tư và link sản phẩm là của bạn. Người phụ trách khoá đọc được để hỗ trợ việc học và cải thiện khoá học.</li>
          <li>Không gửi thông tin cá nhân của học sinh (họ tên, ảnh, điểm số) vào câu trả lời hay link sản phẩm.</li>
        </ul>
      </section>
      <section className="flex flex-col gap-2">
        <h2>Thay đổi</h2>
        <p>AI Edu có thể cập nhật khoá học và các điều khoản này; ngày cập nhật ghi ở đầu trang.</p>
      </section>
      <section className="flex flex-col gap-2">
        <h2>Liên hệ</h2>
        <p>
          Câu hỏi về điều khoản: gửi email tới <SupportContact />.
        </p>
      </section>
    </InfoPage>
  );
}
