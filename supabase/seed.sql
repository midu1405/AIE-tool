-- Dữ liệu mẫu cho danh mục khoá học, lấy từ design/prototype.html (9 khoá, 81 bước).
-- Chạy bằng tài khoản quản trị database (SQL editor hoặc psql), không qua API.
-- Khoá được xuất bản ở cuối file để giao diện có dữ liệu mẫu như bản thiết kế (Midu chốt 23/11): các bước mới có tên,
-- chưa có nội dung; Academic soạn dần ở màn Soạn nội dung khoá. Khi chèn không tắt trigger: bước chỉ ghi module_id được trigger
-- course_lessons_sync_section xếp vào phần "Nội dung" của học phần.
-- Chạy lại được: khoá trùng slug thì bỏ qua.
begin;

with c as (
  insert into public.courses (slug, title, summary, description, topic, audiences, hours_min, hours_max, format, level, outcomes, audience_note, status, published_at, created_at)
  values ('hieu-biet-ai', 'Hiểu biết AI cho giáo viên và cán bộ quản lý', 'Nắm các khái niệm cốt lõi về AI, cách AI học từ dữ liệu và những gì AI chưa làm được.', 'Nắm các khái niệm cốt lõi về AI, cách AI học từ dữ liệu và những gì AI chưa làm được.', 'ai', array['th', 'thcs', 'thpt', 'ql']::text[], 1, 2, 'self', 'basic', array['Giải thích AI là gì bằng ví dụ đời thường', 'Phân biệt AI theo luật và AI học từ dữ liệu', 'Nhận ra khi nào câu trả lời của AI có thể sai', 'Thấy cơ hội dùng AI trong công việc ở trường']::text[], 'Mọi giáo viên và cán bộ quản lý, không cần kiến thức kỹ thuật.', 'draft', null, now() + interval '0 second')
  on conflict (slug) do nothing
  returning id
), m as (
  insert into public.course_modules (course_id, position, title)
  select c.id, x.pos - 1, x.title from c, unnest(array['AI quanh ta', 'AI học từ dữ liệu', 'Giới hạn của AI', 'AI trong nhà trường']::text[]) with ordinality as x(title, pos)
  returning id, position
)
insert into public.course_lessons (module_id, position, title)
select m.id, l.pos - 1, l.title from m
join (values (0, 1, 'AI trong đời sống hằng ngày'), (0, 2, 'AI khác phần mềm thường ở đâu'), (1, 1, 'Dữ liệu và mẫu'), (1, 2, 'Huấn luyện và dự đoán'), (2, 1, 'AI sai khi nào'), (2, 2, 'Ảo giác của mô hình ngôn ngữ'), (3, 1, 'Cơ hội cho giáo viên'), (3, 2, 'Cơ hội cho cán bộ quản lý')) as l(mpos, pos, title) on l.mpos = m.position;

with c as (
  insert into public.courses (slug, title, summary, description, topic, audiences, hours_min, hours_max, format, level, outcomes, audience_note, status, published_at, created_at)
  values ('gd-ai-thcs', 'Dạy chuyên đề Giáo dục AI 12 tiết – THCS', 'Đi qua 12 tiết theo QĐ 2422 cho khối 6–9: mục tiêu, hoạt động mẫu, phiếu học tập và cách đánh giá.', 'Đi qua 12 tiết theo QĐ 2422 cho khối 6–9: mục tiêu từng tiết, hoạt động mẫu, phiếu học tập và cách đánh giá học sinh. Cuối khoá, bạn chuẩn bị một bộ dạy thử cho lớp của mình.', 'teach', array['thcs']::text[], 4, 6, 'guided', 'basic', array['Nắm mục tiêu và cấu trúc 12 tiết của chuyên đề cho khối 6–9', 'Giải thích AI cho học sinh mà không nhân hoá AI', 'Tổ chức hoạt động huấn luyện mô hình bằng Teachable Machine', 'Tự đánh giá kế hoạch bài dạy theo rubric 7 tiêu chí']::text[], 'Giáo viên THCS dạy chuyên đề Giáo dục AI, kể cả giáo viên chưa từng dạy Tin học. Không cần biết lập trình; cần máy tính có trình duyệt và kết nối mạng.', 'draft', null, now() + interval '1 second')
  on conflict (slug) do nothing
  returning id
), m as (
  insert into public.course_modules (course_id, position, title)
  select c.id, x.pos - 1, x.title from c, unnest(array['Tổng quan chương trình và QĐ 2422', 'AI là gì: giúp học sinh hiểu đúng', 'Dữ liệu và học máy với Teachable Machine', 'Thiết kế hoạt động và phiếu học tập', 'An toàn và đạo đức khi dùng AI trong lớp', 'Đánh giá theo rubric và dạy thử']::text[]) with ordinality as x(title, pos)
  returning id, position
)
insert into public.course_lessons (module_id, position, title)
select m.id, l.pos - 1, l.title from m
join (values (0, 1, 'Mục tiêu của chuyên đề'), (0, 2, 'Cấu trúc 12 tiết theo khối'), (0, 3, 'Cách dùng bộ học liệu'), (1, 1, 'AI theo luật và AI học từ dữ liệu'), (1, 2, 'Nói về AI mà không nhân hoá'), (1, 3, 'Hoạt động khởi động mẫu'), (2, 1, 'Thu thập dữ liệu trong lớp'), (2, 2, 'Huấn luyện và kiểm thử mô hình'), (2, 3, 'Thảo luận về sai lệch dữ liệu'), (3, 1, 'Chuỗi Khởi động – Khám phá – Luyện tập – Vận dụng'), (3, 2, 'Phiếu học tập và exit ticket'), (4, 1, 'Quy tắc dùng AI với học sinh'), (4, 2, 'Hướng dẫn học sinh kiểm chứng thông tin'), (5, 1, 'Rubric 7 tiêu chí'), (5, 2, 'Chuẩn bị bộ dạy thử'), (5, 3, 'Gửi phản hồi sau tiết dạy')) as l(mpos, pos, title) on l.mpos = m.position;

with c as (
  insert into public.courses (slug, title, summary, description, topic, audiences, hours_min, hours_max, format, level, outcomes, audience_note, status, published_at, created_at)
  values ('gd-ai-th', 'Dạy chuyên đề Giáo dục AI 12 tiết – Tiểu học', 'Tổ chức tiết học AI 35 phút cho lớp 4–5 với trò chơi, thẻ và hoạt động trải nghiệm.', 'Tổ chức tiết học AI 35 phút cho lớp 4–5 với trò chơi, thẻ và hoạt động trải nghiệm.', 'teach', array['th']::text[], 3, 5, 'guided', 'basic', array['Tổ chức tiết AI 35 phút đúng nhịp lớp 4–5', 'Dùng trò chơi và thẻ để dạy khái niệm', 'Đánh giá bằng quan sát, không chấm điểm riêng']::text[], 'Giáo viên tiểu học dạy lớp 4–5, không cần biết lập trình.', 'draft', null, now() + interval '2 second')
  on conflict (slug) do nothing
  returning id
), m as (
  insert into public.course_modules (course_id, position, title)
  select c.id, x.pos - 1, x.title from c, unnest(array['Tổng quan chuyên đề cho lớp 4–5', 'Trò chơi và thẻ hoạt động', 'Tiết học 35 phút mẫu', 'Đánh giá bằng quan sát']::text[]) with ordinality as x(title, pos)
  returning id, position
)
insert into public.course_lessons (module_id, position, title)
select m.id, l.pos - 1, l.title from m
join (values (0, 1, 'Mục tiêu từng tiết'), (0, 2, 'Chuẩn bị lớp học'), (1, 1, 'Trò chơi Người hay máy'), (1, 2, 'Bộ thẻ phân loại'), (2, 1, 'Xem tiết mẫu'), (2, 2, 'Điều chỉnh cho lớp đông'), (3, 1, 'Phiếu quan sát'), (3, 2, 'Nhận xét học sinh')) as l(mpos, pos, title) on l.mpos = m.position;

with c as (
  insert into public.courses (slug, title, summary, description, topic, audiences, hours_min, hours_max, format, level, outcomes, audience_note, status, published_at, created_at)
  values ('gd-ai-thpt', 'Dạy chuyên đề Giáo dục AI 12 tiết – THPT', 'Dẫn dắt học sinh lớp 10–12 tìm hiểu dữ liệu, mô hình học máy và ứng dụng AI có trách nhiệm.', 'Dẫn dắt học sinh lớp 10–12 tìm hiểu dữ liệu, mô hình học máy và ứng dụng AI có trách nhiệm.', 'teach', array['thpt']::text[], 4, 6, 'guided', 'advanced', array['Dạy dữ liệu và thiên kiến bằng ví dụ thật', 'Giải thích mô hình học máy và mô hình ngôn ngữ lớn', 'Hướng dẫn dự án nhóm có sản phẩm']::text[], 'Giáo viên THPT dạy chuyên đề Giáo dục AI cho lớp 10–12.', 'draft', null, now() + interval '3 second')
  on conflict (slug) do nothing
  returning id
), m as (
  insert into public.course_modules (course_id, position, title)
  select c.id, x.pos - 1, x.title from c, unnest(array['Tổng quan QĐ 2422 cho THPT', 'Dữ liệu và thiên kiến', 'Mô hình học máy', 'Mô hình ngôn ngữ lớn', 'Dự án và đánh giá']::text[]) with ordinality as x(title, pos)
  returning id, position
)
insert into public.course_lessons (module_id, position, title)
select m.id, l.pos - 1, l.title from m
join (values (0, 1, 'Yêu cầu cần đạt lớp 10–12'), (0, 2, 'Phân bổ tiết'), (1, 1, 'Dữ liệu lệch dẫn tới kết quả lệch'), (1, 2, 'Hoạt động tranh luận'), (2, 1, 'Cây quyết định'), (2, 2, 'Thẻ mô hình'), (3, 1, 'Cách mô hình tạo câu trả lời'), (3, 2, 'Dùng có trách nhiệm'), (4, 1, 'Thiết kế dự án nhóm'), (4, 2, 'Rubric sản phẩm')) as l(mpos, pos, title) on l.mpos = m.position;

with c as (
  insert into public.courses (slug, title, summary, description, topic, audiences, hours_min, hours_max, format, level, outcomes, audience_note, status, published_at, created_at)
  values ('teachable-machine', 'Teachable Machine trong lớp học', 'Hướng dẫn học sinh tự huấn luyện mô hình nhận dạng hình ảnh, âm thanh mà không cần lập trình.', 'Hướng dẫn học sinh tự huấn luyện mô hình nhận dạng hình ảnh, âm thanh mà không cần lập trình.', 'teach', array['thcs', 'thpt']::text[], 2, 3, 'self', 'basic', array['Tạo mô hình nhận dạng ảnh và âm thanh', 'Thiết kế hoạt động nhóm quanh mô hình', 'Giải thích vì sao mô hình đoán sai']::text[], 'Giáo viên THCS và THPT, chỉ cần máy tính có webcam.', 'draft', null, now() + interval '4 second')
  on conflict (slug) do nothing
  returning id
), m as (
  insert into public.course_modules (course_id, position, title)
  select c.id, x.pos - 1, x.title from c, unnest(array['Làm quen công cụ', 'Huấn luyện mô hình', 'Tổ chức tiết học']::text[]) with ordinality as x(title, pos)
  returning id, position
)
insert into public.course_lessons (module_id, position, title)
select m.id, l.pos - 1, l.title from m
join (values (0, 1, 'Giao diện Teachable Machine'), (0, 2, 'Chuẩn bị máy và webcam'), (1, 1, 'Mô hình hình ảnh'), (1, 2, 'Mô hình âm thanh'), (2, 1, 'Hoạt động nhóm'), (2, 2, 'Thảo luận khi mô hình sai')) as l(mpos, pos, title) on l.mpos = m.position;

with c as (
  insert into public.courses (slug, title, summary, description, topic, audiences, hours_min, hours_max, format, level, outcomes, audience_note, status, published_at, created_at)
  values ('prompt-gv', 'Viết prompt hiệu quả cho giáo viên', 'Cách giao việc cho trợ lý AI để soạn bài, ra đề và nhận xét học sinh, kèm mẫu câu lệnh dùng ngay.', 'Cách giao việc cho trợ lý AI để soạn bài, ra đề và nhận xét học sinh, kèm mẫu câu lệnh dùng ngay.', 'ai', array['th', 'thcs', 'thpt', 'ql']::text[], 1, 2, 'self', 'basic', array['Viết câu lệnh có bối cảnh, yêu cầu và định dạng', 'Dùng mẫu câu lệnh soạn bài, ra đề', 'Kiểm tra lại kết quả trước khi dùng']::text[], 'Mọi giáo viên và cán bộ quản lý đã từng dùng trợ lý AI.', 'draft', null, now() + interval '5 second')
  on conflict (slug) do nothing
  returning id
), m as (
  insert into public.course_modules (course_id, position, title)
  select c.id, x.pos - 1, x.title from c, unnest(array['Cấu trúc một câu lệnh tốt', 'Mẫu câu lệnh dùng ngay', 'Kiểm tra kết quả của AI']::text[]) with ordinality as x(title, pos)
  returning id, position
)
insert into public.course_lessons (module_id, position, title)
select m.id, l.pos - 1, l.title from m
join (values (0, 1, 'Bối cảnh, yêu cầu, định dạng'), (0, 2, 'Ví dụ trước và sau'), (1, 1, 'Soạn bài'), (1, 2, 'Ra đề và đáp án'), (1, 3, 'Nhận xét học sinh'), (2, 1, 'Danh sách kiểm tra'), (2, 2, 'Khi nào không nên dùng AI')) as l(mpos, pos, title) on l.mpos = m.position;

with c as (
  insert into public.courses (slug, title, summary, description, topic, audiences, hours_min, hours_max, format, level, outcomes, audience_note, status, published_at, created_at)
  values ('an-toan-ai', 'An toàn, đạo đức và bảo vệ dữ liệu khi dùng AI', 'Nhận diện rủi ro, quy tắc dùng AI trong trường học và cách hướng dẫn học sinh kiểm chứng thông tin.', 'Nhận diện rủi ro, quy tắc dùng AI trong trường học và cách hướng dẫn học sinh kiểm chứng thông tin.', 'safe', array['th', 'thcs', 'thpt', 'ql']::text[], 2, 3, 'self', 'basic', array['Nhận diện rủi ro thường gặp khi dùng AI', 'Bảo vệ dữ liệu cá nhân của học sinh', 'Xây quy tắc dùng AI cho lớp và trường']::text[], 'Mọi giáo viên và cán bộ quản lý.', 'draft', null, now() + interval '6 second')
  on conflict (slug) do nothing
  returning id
), m as (
  insert into public.course_modules (course_id, position, title)
  select c.id, x.pos - 1, x.title from c, unnest(array['Rủi ro khi dùng AI', 'Bảo vệ dữ liệu học sinh', 'Quy tắc dùng AI trong trường', 'Kiểm chứng thông tin', 'Trao đổi với phụ huynh']::text[]) with ordinality as x(title, pos)
  returning id, position
)
insert into public.course_lessons (module_id, position, title)
select m.id, l.pos - 1, l.title from m
join (values (0, 1, 'Thông tin sai'), (0, 2, 'Thiên kiến'), (1, 1, 'Dữ liệu nào không đưa vào AI'), (1, 2, 'Độ tuổi dùng công cụ'), (2, 1, 'Mẫu quy tắc lớp học'), (2, 2, 'Khai báo khi dùng AI'), (3, 1, 'Ba bước kiểm chứng'), (3, 2, 'Hoạt động cho học sinh'), (4, 1, 'Thư mẫu'), (4, 2, 'Câu hỏi thường gặp')) as l(mpos, pos, title) on l.mpos = m.position;

with c as (
  insert into public.courses (slug, title, summary, description, topic, audiences, hours_min, hours_max, format, level, outcomes, audience_note, status, published_at, created_at)
  values ('nang-luc-so', 'Tích hợp năng lực số vào bài dạy', 'Gắn mục tiêu năng lực số vào kế hoạch bài dạy và chọn công cụ số phù hợp từng hoạt động.', 'Gắn mục tiêu năng lực số vào kế hoạch bài dạy và chọn công cụ số phù hợp từng hoạt động.', 'digital', array['th', 'thcs', 'thpt']::text[], 3, 4, 'guided', 'basic', array['Đọc khung năng lực số theo lớp', 'Gắn mục tiêu năng lực số vào KHBD', 'Chọn công cụ số cho từng hoạt động']::text[], 'Giáo viên mọi môn ở tiểu học, THCS và THPT.', 'draft', null, now() + interval '7 second')
  on conflict (slug) do nothing
  returning id
), m as (
  insert into public.course_modules (course_id, position, title)
  select c.id, x.pos - 1, x.title from c, unnest(array['Khung năng lực số', 'Gắn mục tiêu vào KHBD', 'Chọn công cụ số', 'Đánh giá năng lực số']::text[]) with ordinality as x(title, pos)
  returning id, position
)
insert into public.course_lessons (module_id, position, title)
select m.id, l.pos - 1, l.title from m
join (values (0, 1, 'Các miền năng lực'), (0, 2, 'Yêu cầu theo lớp'), (1, 1, 'Viết mục tiêu'), (1, 2, 'Ví dụ theo môn'), (2, 1, 'Tiêu chí chọn'), (2, 2, 'Danh sách gợi ý'), (3, 1, 'Minh chứng'), (3, 2, 'Rubric')) as l(mpos, pos, title) on l.mpos = m.position;

with c as (
  insert into public.courses (slug, title, summary, description, topic, audiences, hours_min, hours_max, format, level, outcomes, audience_note, status, published_at, created_at)
  values ('soan-khbd-ai', 'Soạn kế hoạch bài dạy với trợ lý AI', 'Dùng AI để soạn nháp KHBD, tự rà soát theo rubric và chỉnh sửa trước khi đưa vào lớp.', 'Dùng AI để soạn nháp KHBD, tự rà soát theo rubric và chỉnh sửa trước khi đưa vào lớp.', 'teach', array['th', 'thcs', 'thpt']::text[], 2, 4, 'guided', 'advanced', array['Soạn nháp KHBD theo CV 5588 với trợ lý AI', 'Rà soát bằng rubric 7 tiêu chí', 'Giữ phần sư phạm do giáo viên quyết định']::text[], 'Giáo viên đã quen dùng trợ lý AI và muốn soạn bài nhanh hơn.', 'draft', null, now() + interval '8 second')
  on conflict (slug) do nothing
  returning id
), m as (
  insert into public.course_modules (course_id, position, title)
  select c.id, x.pos - 1, x.title from c, unnest(array['Cấu trúc KHBD theo CV 5588', 'Giao việc cho trợ lý AI', 'Rà soát theo rubric 7 tiêu chí', 'Chỉnh sửa và đưa vào lớp']::text[]) with ordinality as x(title, pos)
  returning id, position
)
insert into public.course_lessons (module_id, position, title)
select m.id, l.pos - 1, l.title from m
join (values (0, 1, 'Bốn hoạt động'), (0, 2, 'Mục tiêu và sản phẩm'), (1, 1, 'Câu lệnh soạn nháp'), (1, 2, 'Đưa học liệu nguồn'), (2, 1, 'Chấm thử'), (2, 2, 'Sửa theo góp ý'), (3, 1, 'Dạy thử'), (3, 2, 'Rút kinh nghiệm')) as l(mpos, pos, title) on l.mpos = m.position;

-- Xuất bản 9 khoá mẫu dưới dạng khoá minh hoạ (is_demo: hiện ở danh mục, không đăng ký, không cấp giấy; xem
-- 20261126080000_gop_y_prd.sql). Trigger courses_guard chỉ cho quản lý nội dung xuất bản và đánh dấu minh hoạ (seed chạy
-- bằng tài khoản database, không có vai trò), nên tắt trigger riêng cho hai câu này. Chỉ xuất bản khoá nháp chưa từng
-- xuất bản (published_at rỗng): khoá mẫu đã bị ẩn hoặc chuyển nháp có chủ đích sẽ không bị xuất bản lại khi chạy lại file.
set local session_replication_role = replica;
update public.courses set is_demo = true
where not is_demo
  and slug in ('hieu-biet-ai', 'gd-ai-thcs', 'gd-ai-th', 'gd-ai-thpt', 'teachable-machine', 'prompt-gv', 'an-toan-ai', 'nang-luc-so', 'soan-khbd-ai');
update public.courses set status = 'published', published_at = now()
where status = 'draft' and published_at is null
  and slug in ('hieu-biet-ai', 'gd-ai-thcs', 'gd-ai-th', 'gd-ai-thpt', 'teachable-machine', 'prompt-gv', 'an-toan-ai', 'nang-luc-so', 'soan-khbd-ai');
set local session_replication_role = origin;

commit;
