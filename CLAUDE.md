# AI Edu Training Hub

Web giáo dục của AI Edu, gồm hai khu dùng chung một codebase và một database:

- **Trang giáo viên** (`/`): danh mục khoá học, chi tiết khoá, "Khoá học của tôi". Ai cũng xem được danh mục; đăng nhập Google để đăng ký học và lưu tiến độ.
- **Khu nội bộ** (`/noi-bo`): nhân viên AI Edu tạo KHBD bằng skill `aca-khbd-ai12`, theo dõi tiến độ, duyệt bài, quản lý và xuất bản khoá học. Chỉ tài khoản `@aiedu.com.vn` có vai trò nhân viên mới vào được.

Đọc file này trước mọi việc. Chi tiết nằm ở `docs/`; schema nằm ở `supabase/migrations/`. PRD, use case và sơ đồ (use case, luồng user story, vòng đời trạng thái, ERD): `docs/prd-usecase.md`, bản gốc là Claude Doc ghi ở đầu file.

## Thiết kế giao diện

Bản mẫu bấm thử được (canvas, 14 màn): https://claude.ai/artifact/VgnCQGvYs9rCRsU1BBCwx1 (riêng tư, nhờ Midu chia sẻ nếu cần). Bản sao mã nguồn từng màn nằm ở `design/artboards/*.dc.html` (đọc được bằng trình soạn thảo: HTML + dữ liệu mẫu + logic lọc/tìm). Canvas là nguồn chuẩn; khi canvas đổi, bên thiết kế cập nhật lại thư mục `design/`. `design/prototype.html` là bản mẫu bấm thử nối các màn với nhau (có thanh chuyển Trang giáo viên/Khu nội bộ và công tắc vai trò); dùng nó để hiểu luồng đi giữa các màn, chỗ nào khác canvas thì theo canvas.

| Màn trong bản mẫu | Route |
|---|---|
| Danh mục khoá học | `/` |
| Chi tiết khoá học | `/khoa-hoc/[slug]` |
| Học một bước | `/khoa-hoc/[slug]/buoc/[id]` (cần đăng ký khoá; nhân viên xem trước được cả khoá nháp) |
| Khoá học của tôi | `/khoa-hoc-cua-toi` |
| Tạo KHBD | `/noi-bo/tao-khbd` |
| Tiến độ | `/noi-bo/tien-do` |
| Danh sách KHBD | `/noi-bo/khbd` |
| Duyệt bài | `/noi-bo/duyet-bai` (hàng chờ) và `/noi-bo/khbd/[id]` (một bài) |
| Quản lý khoá học | `/noi-bo/khoa-hoc` (danh sách, tạo khoá) |
| Soạn nội dung khoá học | `/noi-bo/khoa-hoc/[id]` (3 tab: Thông tin trang khoá, Nội dung, Kiểm tra trước khi xuất bản) |
| Giấy chứng nhận (PDF, A4 ngang) | `/chung-nhan/[code]/pdf` (route handler, `lib/certificate-pdf.ts` vẽ bằng pdf-lib; font và logo ở `assets/certificate/`) |
| Nhận giấy chứng nhận | `/khoa-hoc/[slug]/chung-nhan` (cần đăng nhập và đã hoàn thành khoá; xác nhận họ tên rồi cấp) |
| Xác minh giấy chứng nhận | `/chung-nhan/[code]` (công khai; `/chung-nhan?ma=` nhận mã gõ tay) |
| Email gửi giấy chứng nhận | chưa làm (chờ dịch vụ gửi mail, xem "Chưa chốt") |
| (không có trong bản mẫu) Trợ giúp, Quyền riêng tư, Điều khoản | `/tro-giup`, `/quyen-rieng-tu`, `/dieu-khoan` (hai trang sau là bản nháp, chờ pháp chế và người phụ trách dữ liệu duyệt; đổi cách lưu dữ liệu thì sửa trang Quyền riêng tư) |
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
| (không có vai trò) | Giáo viên | Xem khoá đã xuất bản, đăng ký, học từng bước (đánh dấu xong, làm quiz, viết phản tư), lưu khoá, mở học liệu đã gắn |
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
- `20261120070621_khbd_flow.sql`: luồng KHBD giai đoạn 2. Cột thêm: `documents.topic_name/periods/deploy_format/updated_at`, `document_versions.content` (mục tiêu, 4 hoạt động, kết quả đối chiếu) và `warnings`. Hàm: `create_khbd_jobs(mode, items, options)` tạo lượt chạy (job cha) + job con + 6 bước; `advance_mock_jobs(step_seconds)`; `retry_job`, `cancel_job`; `review_version(version, decision, checklist, rubric, summary)` (trả về thì tự tạo job soạn bản v(N+1), bắt buộc có ít nhất 1 góp ý mở); `undo_approval`. View `khbd_list` (mỗi tài liệu một dòng, `list_status` gồm cả `running`, `error`). Realtime bật cho `generation_jobs`, `job_steps`.
- `20261120072649_course_admin.sql`: giai đoạn 3. Hàm `move_course_item(kind, id, dir)` đổi chỗ học phần/bài với dòng kề (security invoker, RLS quyết định ai được đổi). View `course_admin_list` (khoá + số học phần, bài, học liệu, học liệu có bản mới, người học) cho màn Quản lý khoá học.
- `20261120081713_course_steps.sql`: khung 3 tầng. Bảng `course_sections` (Phần); `course_lessons` là Bước: thêm `section_id` (module_id do trigger điền theo phần; thêm bước chỉ có module_id thì vào phần đầu, chưa có thì tạo phần "Nội dung"), `ready`, `kind` đổi sang `doc|video|quiz|reflect|end` (cột `body` cũ bỏ không dùng). Bảng `lesson_contents` (nội dung bước, chỉ người đã đăng ký khoá đang xuất bản và nhân viên đọc), `quiz_keys` (đáp án, chỉ nhân viên đọc), `quiz_attempts`, `reflections` (giáo viên và người phụ trách khoá xem). Hàm `submit_quiz(lesson, answers)` chấm ở database, đạt ≥ 80% thì ghi `lesson_progress`; policy mới: bước quiz chỉ tính xong qua `submit_quiz`, bước phản tư chỉ tính xong khi đã lưu câu trả lời. `courses.prerequisites`, `courses.materials_needed`. `move_course_item` thêm loại `section`.
- `20261123040747_khbd_equipment.sql`: bản giả lập ghi thêm `content.equipment` (mục "II. Thiết bị dạy học và học liệu"). Thứ tự mục KHBD ở màn Duyệt bài lấy từ `KHBD_SECTIONS` trong `lib/khbd.ts`.
- `20261123090017_certificates.sql`: bảng `certificates` (chụp họ tên, tên khoá, thời lượng, số học phần lúc cấp; mã `AIE-<năm>-XXXXXX`). Không ai ghi thẳng bảng: `issue_certificate(course, full_name)` (đã hoàn thành khoá, họ tên ≥ 2 chữ; gọi lại trả giấy còn hiệu lực, họ tên không đổi; giấy đã thu hồi thì cấp lại được với mã mới), `revoke_certificate(code, reason)` (Academic lead, quản trị), `verify_certificate(code)` (anon gọi được, không trả email/user_id). Người học đọc giấy của mình, Academic lead đọc mọi giấy.
- `20261126074808_gop_y_prd.sql` (sửa theo góp ý PRD 26/11): `courses.is_demo` (khoá minh hoạ: hiện ở danh mục, không đăng ký, không cấp giấy; 9 khoá mẫu). `course_problems(course)` chạy các mục đỏ của danh sách tự kiểm ở database (cùng `readinessChecks` trong `lib/steps.ts`, đổi một bên thì đổi cả bên kia): `courses_guard` chặn xuất bản khi còn mục đỏ, `issue_certificate` chỉ cấp khi khoá không phải minh hoạ và không còn mục đỏ. `submit_quiz` chưa đạt chỉ trả `results` (đúng/sai từng câu), đạt mới trả `answers`, `explains`. Khoá đã ẩn: người đã đăng ký vẫn thấy, học tiếp, nhận giấy (`course_visible`, policy `courses`, `lesson_contents`, `course_material_links`); người mới không đăng ký được. Không xoá được khoá đã có người học (`course_has_learners`). Bỏ policy chèn thẳng `generation_jobs`: mọi job qua hàm.
- `20261126074852_tu_duyet.sql`: view `khbd_list` thêm cột `self_approved` (bản hiện tại đã duyệt và người duyệt là người tạo job đầu tiên của tài liệu); Danh sách KHBD hiện cờ "Tự duyệt".
- `20261126081943_hoc_lieu_ma_giay.sql` (trả lời 3 câu chưa chốt ngày 26/11): `course_material_links` chỉ trả link cho người đã đăng ký và nhân viên; `course_material_counts(course)` (khách gọi được) cho trang chi tiết hiện số KHBD, PBT. Mã giấy mới `AIE-<năm>-XXXX-XXXX-XX` (10 ký tự, `new_certificate_code` dùng `extensions.gen_random_bytes`), `canonical_certificate_code` chuẩn hoá mã gõ tay (bỏ gạch, khoảng trắng); mã 6 ký tự cũ vẫn hợp lệ. Trigger sau khi xoá bước hoặc học phần gọi `recheck_course_completion`: ai đã xong mọi bước còn lại thì được đánh dấu hoàn thành; không bao giờ xoá `completed_at`.
- Tên file khớp với version đã chạy trên project Supabase `aie-training-hub` (ref `uqgdxncnlcenhjtrszqr`, vùng Singapore). Tên file nhắc trong chú thích bên trong migration là tên cũ, giữ nguyên vì file đã chạy.
- Thứ tự học phần và bài dùng cột `position` với unique deferrable; đổi chỗ hai dòng thì làm trong một transaction.
- Giáo viên **không** đọc trực tiếp `document_versions`; lấy link học liệu qua `course_material_links()`.
- Thử trên Postgres trống, không cần Supabase: `supabase/tests/run.sh <ten_db>`. Chạy mọi file `tests/[1-9]*.sql`; đạt khi số lỗi thực tế bằng số mục "PHẢI LỖI" (hiện là 37).

## Bản chạy thật

- Web: https://aie-tool-tici.vercel.app (Vercel, project `aie-tool` của tài khoản midu1405, gói Hobby). Mỗi lần đẩy lên `main` Vercel tự deploy; mỗi nhánh có link xem trước.
- Biến môi trường trên Vercel: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; thêm `NEXT_PUBLIC_SUPPORT_EMAIL` (email hỗ trợ ở trang Trợ giúp, Quyền riêng tư) khi đã chốt hộp thư; `CERTIFICATE_SIGNER_NAME`, `CERTIFICATE_SIGNER_TITLE` (người ký trên giấy chứng nhận; bỏ trống thì in "AI Edu" / "Đơn vị đào tạo") khi đã chốt người ký.
- Gói Hobby chỉ dành cho dùng thử không thương mại; trước khi mở cho giáo viên cần chuyển Pro hoặc tài khoản Vercel của công ty.

## Chạy và kiểm tra

```bash
npm install
cp .env.example .env.local      # điền NEXT_PUBLIC_SUPABASE_URL và NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
npm run dev                     # http://localhost:3000
npm run lint && npm run typecheck && npm test
npm run test:db -- <ten_db>     # cần Postgres cục bộ; xem supabase/tests/run.sh
```

Dữ liệu mẫu (đã nạp vào project, chạy lại không bị trùng): `supabase/seed.sql` (9 khoá học mẫu **đã xuất bản dạng khoá minh hoạ** `is_demo`: hiện ở danh mục, không đăng ký và không cấp giấy được; bước chưa có nội dung; giữ lại để giao diện có dữ liệu như bản thiết kế cho tới khi Academic soạn khoá thật; chạy được trên database mới, không tắt trigger), `supabase/seed-khung-mau.sql` (khung lớp 6, Chủ đề 1–2, 10 bài, để thử Tạo KHBD khi chưa đồng bộ Drive), `supabase/seed-khoa-trai-nghiem.sql` (khoá trải nghiệm `trai-nghiem-ai-tao-sinh`: khoá thật, không minh hoạ, 2 học phần, 10 bước đủ loại, khoảng 45 phút; học trọn tới giấy chứng nhận để mọi người thử web và góp ý; danh mục xếp khoá thật trước khoá minh hoạ; video là của Code.org, ô bản ghi lời đang là bản tóm tắt tiếng Việt; sửa nội dung ở màn Soạn nội dung khoá, không chạy lại file).

Thử trọn luồng KHBD và khoá học trên máy không cần Supabase thật (người dùng thử là tên và email giả, không dùng dữ liệu nhân viên thật): `tests/e2e/README.md` (PostgREST + cổng giả Auth + Playwright; `flow_khbd.py` rồi `flow_noi_dung.py`).

## Bản giả lập soạn KHBD (MockExecutor)

- Mọi job có `executor = 'mock'`. Chưa có worker: trang Tiến độ đang mở gọi `advance_mock_jobs(3)` mỗi 1,5 giây, Danh sách gọi một lần khi mở; hàm đuổi kịp theo thời gian thực (3 giây một bước) nên đóng trang rồi mở lại vẫn đúng.
- Bước Lưu Google Doc tạo `document_versions` trạng thái `in_review`, `web_view_link` rỗng (chưa có Doc thật), `content.mock = true` (giao diện hiện nhãn "Bản giả lập").
- Ghi chú có `#loi` thì lần chạy đầu lỗi ở bước Lưu Google Doc, để thử nút "Chạy lại từ bước lỗi".
- Khi chốt executor thật: worker nhận job `queued`, ghi `job_steps` theo đúng 6 bước và tạo `document_versions` như bản giả lập; đổi `executor` mặc định trong `create_khbd_jobs` và bỏ vòng gọi `advance_mock_jobs` ở `JobProgress`.
- Đọc file nguồn (DOCX, PPTX, PDF) sang Markdown cho bước 1: dùng `markitdown` (đã chạy thử với KHBD tiếng Việt có bảng). Các repo tham khảo khác và lý do chọn/loại: `docs/tham-khao-repo.md`.

## Lưu ý Next.js 16

- Next.js 16 khác bản cũ: đọc `node_modules/next/dist/docs/` trước khi dùng API lạ (xem `AGENTS.md`).
- Middleware nay là `proxy.ts`: chỉ làm mới phiên Supabase và chặn sớm `/noi-bo`, `/khoa-hoc-cua-toi` khi chưa đăng nhập.
- Bật `cacheComponents`: mọi chỗ đọc cookie/phiên (`getCurrentUser()`, `createClient()` ở `lib/supabase/server.ts`) và `usePathname()` phải nằm trong `<Suspense>`, nếu không build lỗi. Dữ liệu công khai (danh mục khoá) đọc bằng `createPublicClient()` trong hàm `"use cache"` có `cacheTag("courses")`; sửa khoá thì gọi `updateTag("courses")`.
- `generateStaticParams` của `/khoa-hoc/[slug]` phải trả ít nhất một slug (cacheComponents); khi chưa có khoá xuất bản thì trả slug giả `chua-co-khoa` (ra 404).
- Global CSS đặt trong `@layer base` để class Tailwind thắng (trước đó `a { color }` đè `text-white` của nút).

## Stack

- Next.js (App Router) + TypeScript + Tailwind (khai báo token ở trên trong theme). Triển khai web trên Vercel.
- Supabase: Postgres, Auth (Google), Row Level Security, Realtime (màn Tiến độ).
- Worker Node.js (thư mục `worker/`, chạy Cloud Run): đồng bộ cây kho học liệu từ Drive, chạy job soạn KHBD.
- Google Drive/Docs/Sheets API qua service account: **chỉ đọc** kho nguồn; ghi duy nhất vào thư mục `AI Agent`.

## Quyết định đã chốt

1. **Chứng nhận (đổi 23/11/2026, bổ sung 26/11):** xong mọi bước (`enrollments.completed_at`) thì giáo viên nhận giấy chứng nhận, với điều kiện khoá không phải khoá minh hoạ và không còn mục đỏ trong danh sách tự kiểm (kiểm ở database). Trước khi cấp, giáo viên xác nhận họ tên in trên giấy (lấy sẵn từ tài khoản Google, sửa được); sau khi cấp họ tên không đổi, cần sửa thì AI Edu thu hồi và cấp lại. Giấy là PDF A4 ngang có logo AI Edu × Google for Education, mã (`AIE-<năm>-XXXX-XXXX-XX` từ 26/11; giấy cũ 6 ký tự vẫn hợp lệ) và QR dẫn tới trang xác minh công khai (hiện đầy đủ họ tên, khoá, thời lượng, ngày; không hiện email). Ô "Chứng nhận" ở trang chi tiết khoá ghi "Có".
2. **Quản lý khoá học:** có màn riêng trong khu nội bộ. Chỉ `content_manager` (Academic lead) và `admin` được xuất bản, ẩn và sửa khoá đang xuất bản; `khbd_editor` chỉ tạo và sửa khoá nháp. Quyền nằm ở database (RLS và trigger `courses_guard`); giao diện chỉ ẩn nút, không thay kiểm tra ở database.
3. **KHBD và khoá học:** không tự biến KHBD thành bài học. KHBD/PBT **đã duyệt** được gắn tay làm *học liệu* của một bài (`lesson_materials`), ghim đúng một phiên bản; một bài không gắn hai phiên bản của cùng tài liệu. Bản chưa duyệt không gắn được (trigger `lesson_materials_check_version`). Khi có bản mới hơn đã duyệt, view `lesson_material_updates` báo và màn Quản lý khoá học hiện "Có vN đã duyệt" để người quản lý tự chọn cập nhật.
4. **Khoá học vs KHBD:** khoá học dạy giáo viên *cách dạy*; KHBD là tài liệu giáo viên dùng *dạy học sinh*.
5. **Khung khoá học 3 tầng (tham khảo Raspberry Pi Training Hub, bản mẫu `Detail`, `HocBuoc`, `SoanNoiDung`):** Học phần → Phần → Bước. Loại bước: bài đọc, video, quiz, phản tư / nộp sản phẩm, tổng kết học phần. Quiz đạt khi đúng ít nhất 80% số câu (làm tròn lên), làm lại không giới hạn; chưa đạt chỉ biết câu nào đúng/sai, đạt rồi mới xem đáp án và giải thích; thứ tự lựa chọn xáo lại mỗi lần làm (chốt 26/11). Câu trả lời phản tư: giáo viên và người phụ trách khoá xem được. Xuất bản cần qua danh sách tự kiểm (mọi bước "Sẵn sàng", quiz có đáp án và giải thích, video có bản ghi lời…), database kiểm lại khi xuất bản; không bắt buộc người khác xem trước. Ẩn khoá: người mới không thấy, người đã đăng ký vẫn học tiếp và nhận giấy (chốt 26/11). Người tạo job KHBD được tự duyệt bản đó, hệ thống ghi người duyệt (chốt 26/11). Sửa khoá đã có người hoàn thành (chốt 26/11): không mở lại khoá; thêm bước thì người đã xong giữ "Đã hoàn thành" và giấy, thấy "Có bước mới"; xoá bước thì ai đã xong mọi bước còn lại được tính hoàn thành; đổi lớn thì tạo khoá mới và ẩn khoá cũ. Mọi màn lấy "Đã hoàn thành" từ `completed_at`, không suy ra từ phần trăm.
6. **Học liệu (chốt 26/11):** link KHBD/PBT gắn vào bước chỉ dành cho người đã đăng ký khoá và nhân viên; trước khi đăng ký chỉ thấy số lượng.

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
- **Trang Quyền riêng tư, Điều khoản:** bản nháp đã có, cần pháp chế/người phụ trách dữ liệu duyệt, chốt email hỗ trợ và thời hạn lưu dữ liệu, rồi bỏ khung "Bản nháp" (prop `draft` của `InfoPage`) trước khi bật Google.
- **Giấy chứng nhận:** tên, chức danh người ký và ảnh chữ ký/con dấu (đang in "AI Edu / Đơn vị đào tạo", chừa chỗ ký). Gửi email kèm PDF khi cấp: chọn dịch vụ gửi mail (Resend hoặc Gmail của Workspace) và nhờ bạn kỹ thuật cloud thêm bản ghi DNS cho `aiedu.com.vn`; giao diện email ở artboard `EmailChungNhan`. Thu hồi hiện chỉ gọi `revoke_certificate` bằng SQL, chưa có màn trong khu nội bộ. Logo Google for Education trên giấy: hỏi lại điều khoản đối tác trước khi cấp rộng.
- Link học liệu cho giáo viên (chỉ người đã đăng ký, chốt 26/11): Doc trong `AI Agent` là thư mục nội bộ, giáo viên ngoài công ty không mở được. Cần chốt bản đã duyệt được chép/chia sẻ ra đâu (bước public B9–B10) trước khi giáo viên dùng link. Chặn ở web chỉ ẩn được link: B9–B10 nên chia sẻ Doc tới đúng tài khoản Google của người đã đăng ký, hoặc web trả PDF qua route có kiểm tra đăng ký.

## Các giai đoạn dựng

1. **Nền (đã xong):** Next.js (`@supabase/ssr`), Supabase (project + 3 migration + seed), đăng nhập Google (chờ bật provider) và email + mật khẩu tạm cho nhân viên, chặn khu nội bộ theo vai trò, layout hai khu, danh mục khoá học đọc từ DB, trang chi tiết bản đầu, các màn nội bộ để chỗ.
2. **Khu nội bộ – KHBD (đã xong, trừ đồng bộ Drive):** Tạo KHBD (soạn lại từ kho, bài mới), Tiến độ (Realtime + bản giả lập, chạy lại, huỷ), Danh sách KHBD, hàng chờ Duyệt bài, màn duyệt một bài (xem trước, checklist, rubric 7 tiêu chí, góp ý theo phần, duyệt/trả về soạn bản mới, hoàn tác duyệt, xem bản cũ). **Còn lại:** đồng bộ cây kho từ Drive (cần service account Google, chờ bạn kỹ thuật cloud); làm PBT sau khi duyệt (giai đoạn 2 của skill).
3. **Khoá học (đã xong):** khung 3 tầng Học phần → Phần → Bước (quyết định đã chốt 5). Soạn nội dung khoá (thông tin trang khoá; cây cấu trúc thêm, đổi tên, xoá, đổi thứ tự; ô soạn theo loại bước, bài đọc dùng Markdown rút gọn ở `lib/steps.ts`; gắn KHBD/PBT đã duyệt vào bước, "Gắn vN" khi có bản mới; xem câu trả lời phản tư; danh sách tự kiểm `readinessChecks` chặn nút Xuất bản khi còn mục đỏ; xuất bản, ẩn, xoá khoá chưa có người học); chi tiết khoá (thẻ thông tin nhanh, cần có, cần chuẩn bị, nội dung 3 tầng, đăng ký, lưu, tiến độ); học một bước (mục lục, bài đọc, video nhúng YouTube/Drive, quiz, phản tư, tổng kết, bước trước/sau); Khoá học của tôi (Đang học / Đã hoàn thành / Đã lưu); menu khu nội bộ gọn lại thành nút "Menu" dưới 768 px. Xuất bản hoặc ẩn khoá thì gọi `refreshCatalog()` (server action, `updateTag("courses")`).
4. **Giấy chứng nhận (đã xong, trừ gửi email):** xác nhận họ tên và cấp giấy (`/khoa-hoc/[slug]/chung-nhan`), PDF (`/chung-nhan/[code]/pdf`), trang xác minh công khai, nút ở thẻ hoàn thành khoá và tab Đã hoàn thành. **Còn lại:** gửi email kèm PDF, màn thu hồi trong khu nội bộ.
5. **Executor thật** khi đã chốt.

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
docs/                PRD và use case (prd-usecase.md, hình ở docs/prd/), quy trình làm việc, repo tham khảo, tài liệu lịch sử
design/              bản sao canvas (14 màn .dc.html + canvas.json) và prototype.html
assets/certificate/  font Be Vietnam Pro (OFL) và logo để vẽ PDF giấy chứng nhận
```
