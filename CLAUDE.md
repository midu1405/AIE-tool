# AI Edu Training Hub

Web giáo dục của AI Edu, gồm hai khu dùng chung một codebase và một database:

- **Trang giáo viên** (`/`): danh mục khoá học, chi tiết khoá, "Khoá học của tôi". Ai cũng xem được danh mục; đăng nhập Google để đăng ký học và lưu tiến độ.
- **Khu nội bộ** (`/noi-bo`): nhân viên AI Edu tạo KHBD bằng skill `aca-khbd-ai12`, theo dõi tiến độ, duyệt bài, quản lý và xuất bản khoá học. Chỉ tài khoản `@aiedu.com.vn` có vai trò nhân viên mới vào được.

Đọc file này trước mọi việc. Chi tiết nằm ở `docs/`; schema nằm ở `supabase/migrations/`.

## Thiết kế giao diện

Bản mẫu bấm thử được (canvas, 8 màn): https://claude.ai/artifact/VgnCQGvYs9rCRsU1BBCwx1 (riêng tư, nhờ Midu chia sẻ nếu cần). Bản sao mã nguồn từng màn nằm ở `design/artboards/*.dc.html` (đọc được bằng trình soạn thảo: HTML + dữ liệu mẫu + logic lọc/tìm). Canvas là nguồn chuẩn; khi canvas đổi, bên thiết kế cập nhật lại thư mục `design/`. `design/prototype.html` là bản mẫu bấm thử nối các màn với nhau (có thanh chuyển Trang giáo viên/Khu nội bộ và công tắc vai trò); dùng nó để hiểu luồng đi giữa các màn, chỗ nào khác canvas thì theo canvas.

| Màn trong bản mẫu | Route |
|---|---|
| Danh mục khoá học | `/` |
| Chi tiết khoá học | `/khoa-hoc/[slug]` |
| Khoá học của tôi | `/khoa-hoc-cua-toi` |
| Tạo KHBD | `/noi-bo/tao-khbd` |
| Tiến độ | `/noi-bo/tien-do` |
| Danh sách KHBD | `/noi-bo/khbd` |
| Duyệt bài | `/noi-bo/duyet-bai` (hàng chờ) và `/noi-bo/khbd/[id]` (một bài) |
| Quản lý khoá học | `/noi-bo/khoa-hoc` và `/noi-bo/khoa-hoc/[id]` |
| (không có trong bản mẫu) Đăng nhập | `/dang-nhap` (Google, và tạm thời email + mật khẩu cho nhân viên), `/auth/callback`, `/auth/dang-xuat` (POST) |

Giữ đúng giao diện bản mẫu. Token gốc:

- Phông: Be Vietnam Pro (400, 500, 600, 700).
- Màu: nền `#F6F7F9`, bề mặt `#FFFFFF`, chữ `#172033`, chữ phụ `#4B5565`, viền `#E3E6EB`, viền ô nhập `#CDD2DA`, nhấn `#2152C5`, nhấn nhạt `#E8EEFB`.
- Màu chủ đề: Hiểu biết AI `#E8EEFB/#2152C5`, Dạy học với AI `#E2F3EA/#1D6E47`, An toàn & đạo đức AI `#FCECE3/#A3470F`, Năng lực số `#F1EAFB/#6A3D9E`.
- Bo góc 8 (nút, ô nhập), 10–12 (thẻ), 999 (chip). Vùng bấm tối thiểu 44 px.
- Khu nội bộ: menu trái 256 px, nhãn "Nội bộ" nền `#172033`.
- Nhấn khi hover `#163B91`. Màu trạng thái lấy theo bảng `ST` và `QL_ST` trong `design/prototype.html`.
- Chữ giữ cách đặt dấu như thiết kế ("khoá", "hoá"). Nút ghi rõ việc sẽ xảy ra ("Xuất bản", "Gắn v2"). Thông báo lỗi nói lỗi gì và cách sửa. Dùng được ở chiều rộng 390 px.

## Phân vai và quy trình làm việc

Xem chi tiết ở `docs/quy-trinh-lam-viec.md`. Tóm tắt:

- **Thiết kế và code (Claude của Midu):** giữ canvas và thư mục `design/`, viết code theo từng giai đoạn. Mỗi phần làm trên nhánh `feat/<giai-doan>-<ten-ngan>`, mở Pull Request vào `main`, tự kiểm theo mẫu PR rồi mới merge.
- **Theo dõi (Claude công ty):** chỉ đọc repo (không có quyền ghi), xem PR và commit mới, đối chiếu với nghiệp vụ KHBD và skill `aca-khbd-ai12`. Góp ý gửi Midu để chuyển lại.
- **Chốt:** Midu duyệt PR trước khi merge và trả lời các mục "Chưa chốt".

## Vai trò

| role (bảng `user_roles`) | Là ai | Được làm |
|---|---|---|
| (không có vai trò) | Giáo viên | Xem khoá đã xuất bản, đăng ký, đánh dấu bài đã học, lưu khoá, mở học liệu đã gắn |
| `khbd_editor` | Người soạn KHBD | Tạo job KHBD, tạo và sửa khoá nháp |
| `reviewer` | Người duyệt | Duyệt KHBD |
| `content_manager` | Academic lead | Mọi việc với khoá học, gồm xuất bản và ẩn; duyệt KHBD |
| `admin` | Quản trị | Như mọi vai trò; cấp và thu hồi vai trò |

Một người giữ được nhiều vai trò. Chỉ tài khoản `@aiedu.com.vn` được giữ vai trò (trigger kiểm email trong `auth.users`). Trong SQL kiểm tra bằng `public.has_role('...')` (admin ngầm có mọi vai trò), `public.is_staff()` và `public.can_edit_course(course_id)`.

## Database (Supabase)

- Migration ở `supabase/migrations/`, tên `YYYYMMDDHHMMSS_ten.sql`. **Không sửa migration đã chạy trên dự án thật**; muốn đổi thì viết migration mới. Mọi bảng mới bật RLS và có policy ngay trong cùng migration.
- `20261120043850_core.sql`: người dùng, vai trò, chỉ mục Drive, khung chương trình, job soạn KHBD, phiên bản (`document_versions.status`), duyệt bài, nhật ký.
- `20261120043938_courses.sql`: khoá học, học phần, bài, học liệu, đăng ký, đã lưu, tiến độ; view `lesson_material_updates`, `my_course_progress`; hàm `course_material_links(course_id)`.
- `20261120044017_hardening.sql`: thu quyền gọi hàm trigger qua API, cố định search_path. Security advisor còn cảnh báo 7 hàm `security definer` gọi được qua API (`has_role`, `is_staff`, `can_edit_course`, `course_visible`, `course_of_module`, `course_of_lesson`, `course_material_links`): giữ có chủ đích vì policy RLS dùng chúng, chúng chỉ trả boolean/id hoặc link đã lọc quyền.
- Tên file khớp với version đã chạy trên project Supabase `aie-training-hub` (ref `uqgdxncnlcenhjtrszqr`, vùng Singapore). Tên file nhắc trong chú thích bên trong migration là tên cũ, giữ nguyên vì file đã chạy.
- Thứ tự học phần và bài dùng cột `position` với unique deferrable; đổi chỗ hai dòng thì làm trong một transaction.
- Giáo viên **không** đọc trực tiếp `document_versions`; lấy link học liệu qua `course_material_links()`.
- Thử trên Postgres trống, không cần Supabase: `supabase/tests/run.sh <ten_db>`. Đạt khi số lỗi thực tế bằng số mục "PHẢI LỖI" (hiện là 9).

## Chạy và kiểm tra

```bash
npm install
cp .env.example .env.local      # điền NEXT_PUBLIC_SUPABASE_URL và NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
npm run dev                     # http://localhost:3000
npm run lint && npm run typecheck && npm test
npm run test:db -- <ten_db>     # cần Postgres cục bộ; xem supabase/tests/run.sh
```

Dữ liệu mẫu: `supabase/seed.sql` (9 khoá, đã nạp vào project). Chạy trong SQL editor; chạy lại không bị trùng.

## Lưu ý Next.js 16

- Next.js 16 khác bản cũ: đọc `node_modules/next/dist/docs/` trước khi dùng API lạ (xem `AGENTS.md`).
- Middleware nay là `proxy.ts`: chỉ làm mới phiên Supabase và chặn sớm `/noi-bo`, `/khoa-hoc-cua-toi` khi chưa đăng nhập.
- Bật `cacheComponents`: mọi chỗ đọc cookie/phiên (`getCurrentUser()`, `createClient()` ở `lib/supabase/server.ts`) và `usePathname()` phải nằm trong `<Suspense>`, nếu không build lỗi. Dữ liệu công khai (danh mục khoá) đọc bằng `createPublicClient()` trong hàm `"use cache"` có `cacheTag("courses")`; sửa khoá thì gọi `updateTag("courses")`.
- Global CSS đặt trong `@layer base` để class Tailwind thắng (trước đó `a { color }` đè `text-white` của nút).

## Stack

- Next.js (App Router) + TypeScript + Tailwind (khai báo token ở trên trong theme). Triển khai web trên Vercel.
- Supabase: Postgres, Auth (Google), Row Level Security, Realtime (màn Tiến độ).
- Worker Node.js (thư mục `worker/`, chạy Cloud Run): đồng bộ cây kho học liệu từ Drive, chạy job soạn KHBD.
- Google Drive/Docs/Sheets API qua service account: **chỉ đọc** kho nguồn; ghi duy nhất vào thư mục `AI Agent`.

## Quyết định đã chốt

1. **Chứng nhận:** bản đầu chưa cấp. Học xong mọi bài thì khoá tự được đánh dấu "Đã hoàn thành" (`enrollments.completed_at`); ô "Chứng nhận" ở trang chi tiết giữ chữ `[Có / Không]`. Nếu cấp sau này: PDF có mã/QR xác minh trên web. Chưa tạo bảng `certificates`.
2. **Quản lý khoá học:** có màn riêng trong khu nội bộ. Chỉ `content_manager` (Academic lead) và `admin` được xuất bản, ẩn và sửa khoá đang xuất bản; `khbd_editor` chỉ tạo và sửa khoá nháp. Quyền nằm ở database (RLS và trigger `courses_guard`); giao diện chỉ ẩn nút, không thay kiểm tra ở database.
3. **KHBD và khoá học:** không tự biến KHBD thành bài học. KHBD/PBT **đã duyệt** được gắn tay làm *học liệu* của một bài (`lesson_materials`), ghim đúng một phiên bản; một bài không gắn hai phiên bản của cùng tài liệu. Bản chưa duyệt không gắn được (trigger `lesson_materials_check_version`). Khi có bản mới hơn đã duyệt, view `lesson_material_updates` báo và màn Quản lý khoá học hiện "Có vN đã duyệt" để người quản lý tự chọn cập nhật.
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
- **Đăng nhập Google:** code đã xong nhưng chưa bật provider. Chờ bạn kỹ thuật cloud tạo OAuth Client (Google Auth Platform, loại Web application, redirect URI `https://uqgdxncnlcenhjtrszqr.supabase.co/auth/v1/callback`, Audience External và Publish) rồi dán vào Supabase › Authentication › Providers › Google; thêm Site URL và Redirect URLs (`<địa chỉ web>/**`) ở URL Configuration. Trong lúc chờ, nhân viên đăng nhập bằng email + mật khẩu do quản trị tạo ở Authentication › Users (tích Auto Confirm User); web không có nút tự đăng ký. Giáo viên chưa đăng nhập được cho tới khi bật Google.
- Link học liệu cho giáo viên: Doc trong `AI Agent` là thư mục nội bộ, giáo viên ngoài công ty không mở được. Cần chốt bản đã duyệt được chép/chia sẻ ra đâu (bước public B9–B10) trước khi giáo viên dùng link.

## Các giai đoạn dựng

1. **Nền (đã xong):** Next.js (`@supabase/ssr`), Supabase (project + 3 migration + seed), đăng nhập Google (chờ bật provider) và email + mật khẩu tạm cho nhân viên, chặn khu nội bộ theo vai trò, layout hai khu, danh mục khoá học đọc từ DB, trang chi tiết bản đầu, các màn nội bộ để chỗ.
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
- Chạy `npm run lint`, `npm run typecheck`, `supabase/tests/run.sh` và test trước khi báo xong.

## Không làm

- Không cài thêm skill soạn giáo án nào bên cạnh `aca-khbd-ai12`: skill trùng mô tả làm Claude gọi nhầm.
- Không đưa token LMS, khoá Google hay khoá API vào code, log hoặc commit.
- Không để tên model Claude trong code, commit hay mô tả PR.

## Thư mục

```
app/                 Next.js (route ở bảng trên)
components/          UI dùng chung
lib/                 supabase client, executor, drive
worker/              đồng bộ Drive, chạy job
supabase/migrations/ schema
supabase/tests/      thử migration và quyền trên Postgres trống
docs/                quy trình làm việc, tài liệu lịch sử
design/              bản sao canvas (8 màn .dc.html + canvas.json) và prototype.html
```
