# AI Edu Training Hub

Web giáo dục của AI Edu, gồm hai khu dùng chung một codebase và một database:

- **Trang giáo viên** (`/`): danh mục khoá học, chi tiết khoá, "Khoá học của tôi". Ai cũng xem được danh mục; đăng nhập Google để đăng ký học và lưu tiến độ.
- **Khu nội bộ** (`/noi-bo`): nhân viên AI Edu tạo KHBD bằng skill `aca-khbd-ai12`, theo dõi tiến độ, duyệt bài, quản lý và xuất bản khoá học. Chỉ tài khoản `@aiedu.com.vn` có vai trò nhân viên mới vào được.

Đọc file này trước mọi việc. Chi tiết nằm ở `docs/`; schema nằm ở `supabase/migrations/`.

## Thiết kế giao diện

Bản mẫu bấm thử được (canvas, 8 màn): https://claude.ai/artifact/VgnCQGvYs9rCRsU1BBCwx1 (riêng tư, nhờ Midu chia sẻ nếu cần). Bản sao mã nguồn từng màn nằm ở `design/artboards/*.dc.html` (đọc được bằng trình soạn thảo: HTML + dữ liệu mẫu + logic lọc/tìm). Canvas là nguồn chuẩn; khi canvas đổi, bên thiết kế cập nhật lại thư mục `design/`.

| Màn trong bản mẫu | Route |
|---|---|
| Danh mục khoá học | `/` |
| Chi tiết khoá học | `/khoa-hoc/[slug]` |
| Khoá học của tôi | `/khoa-hoc-cua-toi` |
| Tạo KHBD | `/noi-bo/tao-khbd` |
| Tiến độ | `/noi-bo/tien-do` |
| Danh sách KHBD | `/noi-bo/khbd` |
| Duyệt bài | `/noi-bo/khbd/[id]` |
| Quản lý khoá học | `/noi-bo/khoa-hoc` và `/noi-bo/khoa-hoc/[id]` |

Giữ đúng giao diện bản mẫu. Token gốc:

- Phông: Be Vietnam Pro (400, 500, 600, 700).
- Màu: nền `#F6F7F9`, bề mặt `#FFFFFF`, chữ `#172033`, chữ phụ `#4B5565`, viền `#E3E6EB`, viền ô nhập `#CDD2DA`, nhấn `#2152C5`, nhấn nhạt `#E8EEFB`.
- Màu chủ đề: Hiểu biết AI `#E8EEFB/#2152C5`, Dạy học với AI `#E2F3EA/#1D6E47`, An toàn & đạo đức AI `#FCECE3/#A3470F`, Năng lực số `#F1EAFB/#6A3D9E`.
- Bo góc 8 (nút, ô nhập), 10–12 (thẻ), 999 (chip). Vùng bấm tối thiểu 44 px.
- Khu nội bộ: menu trái 256 px, nhãn "Nội bộ" nền `#172033`.

## Phân vai và quy trình làm việc

Xem chi tiết ở `docs/quy-trinh-lam-viec.md`. Tóm tắt:

- **Thiết kế và code (Claude của Midu):** giữ canvas và thư mục `design/`, viết code theo từng giai đoạn. Mỗi phần làm trên nhánh `feat/<giai-doan>-<ten-ngan>`, mở Pull Request vào `main`, tự kiểm theo mẫu PR rồi mới merge.
- **Theo dõi (Claude công ty):** chỉ đọc repo (không có quyền ghi), xem PR và commit mới, đối chiếu với nghiệp vụ KHBD và skill `aca-khbd-ai12`. Góp ý gửi Midu để chuyển lại.
- **Chốt:** Midu duyệt PR trước khi merge và trả lời các mục "Chưa chốt".

## Stack

- Next.js (App Router) + TypeScript + Tailwind (khai báo token ở trên trong theme). Triển khai web trên Vercel.
- Supabase: Postgres, Auth (Google), Row Level Security, Realtime (màn Tiến độ).
- Worker Node.js (thư mục `worker/`, chạy Cloud Run): đồng bộ cây kho học liệu từ Drive, chạy job soạn KHBD.
- Google Drive/Docs/Sheets API qua service account: **chỉ đọc** kho nguồn; ghi duy nhất vào thư mục `AI Agent`.

## Quyết định đã chốt

1. **Chứng nhận:** bản đầu chưa cấp, chỉ đánh dấu "Đã hoàn thành". Nếu cấp sau này: PDF có mã/QR xác minh trên web. Chưa tạo bảng `certificates`.
2. **Quản lý khoá học:** có màn riêng trong khu nội bộ. Chỉ vai trò `quan_ly_noi_dung` và `admin` được xuất bản hoặc ẩn khoá học.
3. **KHBD và khoá học:** không tự biến KHBD thành bài học. KHBD/PBT **đã duyệt** được gắn tay làm *học liệu* của một bài trong khoá, ghim đúng một phiên bản. Bản chưa duyệt không gắn được. Khi bản đã gắn có phiên bản mới được duyệt, màn Quản lý khoá học báo để người quản lý chọn cập nhật.
4. **Khoá học vs KHBD:** khoá học dạy giáo viên *cách dạy*; KHBD là tài liệu giáo viên dùng *dạy học sinh*.

## Quy trình KHBD (theo skill `aca-khbd-ai12` v6)

- Hai cách soạn: **soạn lại từ kho** (bài trong cây `3. Giáo dục trí tuệ nhân tạo dành cho học sinh phổ thông › 1. Học liệu › Tiểu học | THCS | THPT › Chủ đề › Bài`) và **soạn bài mới** (lớp, chủ đề theo khung NLS, tên bài, số tiết, tài liệu, ý tưởng).
- Căn cứ bắt buộc: QĐ 2422, CV 5588. Tùy chọn: TT 02, TT 16, TT 18, TT 85.
- Lớp 1–3: chưa soạn được. Lớp 4–5: chưa có khung NLS, Claude ghi giả định. Lớp 6–12: theo khung NLS.
- **Hai giai đoạn:** giai đoạn 1 soạn KHBD + spec KHBD + spec PBT; giai đoạn 2 dựng PBT chỉ sau khi KHBD được duyệt.
- 6 bước của một job: đọc bài nguồn → chọn mã 2422 → soạn KHBD + spec → kiểm tra 2422/5588 → lưu Google Doc → ghi nhật ký chạy.
- Lưu: `AIE Product › 1. Pre-Review › AI Agent › <yyyy-mm-dd> › <sao y đường dẫn bài nguồn> › Bài N`, Doc đuôi ` – vN`, hai spec trong `_spec (Claude dùng)`. Không ghi đè: sửa là ra bản v(N+1).
- Mỗi ngày một Google Sheet `Nhật ký chạy yyyy-mm-dd` trong thư mục ngày.
- ID thư mục và Doc mẫu: lấy từ `luu-drive.md` của skill, đặt trong biến môi trường (xem `.env.example`), không viết cứng trong code.

## Chưa chốt (hỏi Midu trước khi làm)

- **Bên thực hiện soạn KHBD** (executor): Claude API, routine của Claude Code, hay API khác. Trước khi chốt, mọi job chạy qua interface `KhbdExecutor` với bản giả lập `MockExecutor` (chạy 6 bước, vài giây một bước).
- Tên đầy đủ và phạm vi TT 02, TT 16, TT 18.
- Màn Duyệt bài dùng skill `aca-khbd-review` hay checklist của `aca-khbd-ai12`.
- Tiêu chí lọc khoá học (đối tượng, chủ đề, thời lượng, hình thức) đã khớp với cách Academic phân loại chưa.

## Các giai đoạn dựng

1. **Nền:** Next.js, Supabase (migration `0001_init.sql`), đăng nhập Google, phân quyền, layout hai khu, danh mục khoá học đọc từ DB với dữ liệu seed.
2. **Khu nội bộ – KHBD:** đồng bộ cây kho (chỉ đọc), Tạo KHBD với `MockExecutor`, Tiến độ qua Realtime, Danh sách, Duyệt bài (checklist, rubric 7 tiêu chí, góp ý, duyệt/trả về).
3. **Khoá học:** Quản lý khoá học (học phần, bài, gắn học liệu đã duyệt, xuất bản), chi tiết khoá, Khoá học của tôi, tiến độ học.
4. **Executor thật** khi đã chốt.

## Quy tắc khi code

- Mọi thay đổi schema là một migration mới trong `supabase/migrations/`. Hỏi trước khi đổi schema đã chạy.
- Bật RLS cho mọi bảng. Trình duyệt chỉ dùng anon key; service role key chỉ ở worker và server action.
- Không viết cứng secret, ID Drive hay email; dùng `.env.local` (mẫu ở `.env.example`).
- Không bao giờ ghi, đổi tên, di chuyển hay xoá file trong kho nguồn trên Drive. Chỉ tạo mới trong `AI Agent`.
- Giao diện tiếng Việt, đúng dấu. Mọi ô nhập có `<label>`; nút chỉ có biểu tượng có `aria-label`; tương phản chữ ≥ 4.5:1.
- Chỗ bản mẫu để trong ngoặc vuông (`[Tên giáo viên]`, `[dd/mm/yyyy]`) là dữ liệu thật lấy từ DB, không giữ ngoặc trong code.
- Tìm kiếm phải bỏ dấu tiếng Việt (chuẩn hoá NFD, bỏ dấu, `đ` → `d`).
- Chạy `npm run lint`, `npm run typecheck` và test trước khi báo xong.

## Thư mục

```
app/                 Next.js (route ở bảng trên)
components/          UI dùng chung
lib/                 supabase client, executor, drive
worker/              đồng bộ Drive, chạy job
supabase/migrations/ schema
docs/                quy trình làm việc, tài liệu lịch sử
design/              bản sao canvas (8 màn .dc.html + canvas.json)
```
