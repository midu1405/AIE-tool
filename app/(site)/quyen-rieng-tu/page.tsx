import { InfoPage, SupportContact } from "@/components/InfoPage";

export const metadata = { title: "Quyền riêng tư" };

// Bản nháp viết theo đúng những gì web đang lưu (xem supabase/migrations). Chờ pháp chế và người phụ trách dữ liệu duyệt
// trước khi bật đăng nhập Google cho giáo viên; đổi cách lưu dữ liệu thì phải sửa trang này.
export default function PrivacyPage() {
  return (
    <InfoPage
      title="Quyền riêng tư"
      lead="AI Edu Training Hub lưu những thông tin gì của giáo viên, dùng để làm gì và ai xem được."
      updated="23/11/2026"
      draft
    >
      <section className="flex flex-col gap-2">
        <h2>Thông tin chúng tôi lưu</h2>
        <ul>
          <li>
            <strong>Tài khoản:</strong> email và họ tên lấy từ tài khoản Google khi bạn đăng nhập (kèm ảnh đại diện nếu tài khoản Google có).
          </li>
          <li>
            <strong>Việc học:</strong> khoá bạn đăng ký và lưu để học sau, bước đã xong, thời điểm hoàn thành khoá.
          </li>
          <li>
            <strong>Quiz:</strong> mỗi lần nộp bài gồm đáp án bạn chọn, số câu đúng và đạt hay chưa.
          </li>
          <li>
            <strong>Phản tư:</strong> câu trả lời bạn viết và link sản phẩm bạn dán (nếu có).
          </li>
          <li>
            <strong>Giấy chứng nhận:</strong> họ tên bạn xác nhận để in lên giấy, tên khoá, ngày hoàn thành và mã chứng nhận.
          </li>
          <li>
            <strong>Cookie:</strong> chỉ cookie giữ phiên đăng nhập. Web không dùng cookie quảng cáo hay công cụ theo dõi bên ngoài.
          </li>
        </ul>
      </section>
      <section className="flex flex-col gap-2">
        <h2>Dùng để làm gì</h2>
        <ul>
          <li>Lưu tiến độ để bạn học tiếp trên mọi thiết bị.</li>
          <li>Chấm quiz, đánh dấu hoàn thành khoá và cấp giấy chứng nhận.</li>
          <li>Giúp người phụ trách khoá hiểu giáo viên học thế nào để cải thiện nội dung.</li>
        </ul>
        <p>AI Edu không bán thông tin của bạn và không dùng thông tin này để quảng cáo.</p>
      </section>
      <section className="flex flex-col gap-2">
        <h2>Ai xem được</h2>
        <ul>
          <li>Bạn xem được mọi thông tin của mình.</li>
          <li>
            Nhân viên AI Edu phụ trách soạn và quản lý khoá học xem được tiến độ, kết quả quiz và câu trả lời phản tư của người học trong khoá.
          </li>
          <li>Giáo viên khác không xem được thông tin của bạn.</li>
          <li>
            Ai có mã giấy chứng nhận của bạn (in trên giấy, trong mã QR) mở được trang xác minh công khai, thấy họ tên, tên khoá, thời lượng và
            ngày hoàn thành. Trang này không hiện email hay kết quả quiz, phản tư.
          </li>
        </ul>
      </section>
      <section className="flex flex-col gap-2">
        <h2>Lưu ở đâu, bao lâu</h2>
        <p>
          Dữ liệu lưu trên Supabase (máy chủ đặt tại Singapore); web chạy trên Vercel. Đăng nhập do Google xử lý: web không nhận và không lưu mật
          khẩu Google của bạn.
        </p>
        <p>Thời hạn lưu dữ liệu sau khi bạn ngừng học: đang chờ AI Edu chốt và sẽ ghi rõ ở đây.</p>
      </section>
      <section className="flex flex-col gap-2">
        <h2>Quyền của bạn</h2>
        <p>
          Bạn có thể yêu cầu xem, sửa hoặc xoá thông tin của mình, kể cả xoá hẳn tài khoản, bằng cách gửi email tới <SupportContact />. AI Edu sẽ
          trả lời và xử lý yêu cầu của bạn.
        </p>
      </section>
      <section className="flex flex-col gap-2">
        <h2>Đối tượng sử dụng</h2>
        <p>Web dành cho giáo viên và cán bộ quản lý giáo dục. Học sinh không đăng ký tài khoản trên web này.</p>
      </section>
    </InfoPage>
  );
}
