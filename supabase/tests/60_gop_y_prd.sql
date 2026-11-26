-- Góp ý PRD 26/11 (20261126074808_gop_y_prd): khoá minh hoạ, cấp giấy cần khoá đủ nội dung, quiz không lộ đáp án,
-- khoá ẩn vẫn mở cho người đã đăng ký, không xoá khoá có người học, không chèn thẳng job.
-- Dùng lại user và khoá ở 10_–50_: a = Academic lead, b = người soạn, c = giáo viên đã đăng ký c…1, f1 = giáo viên khác.
\set ON_ERROR_STOP 0
reset role;
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000f2', 'gv3@example.com');
insert into public.courses (id, slug, title, topic, hours_min, hours_max, format, level)
values ('c0000000-0000-0000-0000-0000000000d1', 'khoa-minh-hoa', 'Khoá minh hoạ', 'ai', 1, 2, 'self', 'basic');
set session_replication_role = replica;
update public.courses set status = 'published', published_at = now(), is_demo = true
where id = 'c0000000-0000-0000-0000-0000000000d1';
set session_replication_role = origin;

set role authenticated;
\echo '--- khách thấy khoá minh hoạ ở danh mục (1)'
set role anon;
select count(*) as thay from public.courses where id = 'c0000000-0000-0000-0000-0000000000d1';
set role authenticated;
\echo '--- giáo viên đăng ký khoá minh hoạ (PHẢI LỖI)'
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000f1';
insert into public.enrollments (course_id) values ('c0000000-0000-0000-0000-0000000000d1');
\echo '--- người soạn đánh dấu khoá nháp là minh hoạ (PHẢI LỖI)'
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
update public.courses set is_demo = true where id = 'c0000000-0000-0000-0000-000000000009';

\echo '--- quiz chưa đạt: có đúng/sai từng câu, không có đáp án và giải thích'
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
select r -> 'results' as dung_sai, r ? 'answers' as lo_dap_an, r ? 'explains' as lo_giai_thich
from public.submit_quiz('5b000000-0000-0000-0000-000000000001', '{0,0,0,0,0}') r;
\echo '--- quiz đạt: thêm đáp án và giải thích (true, true)'
select r ? 'answers' as co_dap_an, r ? 'explains' as co_giai_thich
from public.submit_quiz('5b000000-0000-0000-0000-000000000001', '{1,0,1,0,1}') r;

\echo '--- giáo viên f1 hoàn thành khoá c…1 nhưng có bước bị chuyển về nháp: nhận giấy (PHẢI LỖI)'
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000f1';
insert into public.enrollments (course_id) values ('c0000000-0000-0000-0000-000000000001');
reset role;
update public.enrollments set completed_at = now()
where user_id = '00000000-0000-0000-0000-0000000000f1' and course_id = 'c0000000-0000-0000-0000-000000000001';
update public.course_lessons set ready = false where id = 'b0000000-0000-0000-0000-000000000001';
select public.course_problems('c0000000-0000-0000-0000-000000000001') as con_thieu;
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000f1';
select public.issue_certificate('c0000000-0000-0000-0000-000000000001', 'Trần Văn Minh');
reset role;
update public.course_lessons set ready = true where id = 'b0000000-0000-0000-0000-000000000001';
set role authenticated;
\echo '--- bước sẵn sàng lại: nhận giấy (OK)'
select full_name from public.issue_certificate('c0000000-0000-0000-0000-000000000001', 'Trần Văn Minh');

\echo '--- Academic lead ẩn khoá c…1 (OK)'
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
update public.courses set status = 'hidden' where id = 'c0000000-0000-0000-0000-000000000001';
\echo '--- giáo viên đã đăng ký vẫn thấy khoá (1), học phần (1), đọc nội dung bước (4)'
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
select count(*) as khoa from public.courses where id = 'c0000000-0000-0000-0000-000000000001';
select count(*) as hoc_phan from public.course_modules where course_id = 'c0000000-0000-0000-0000-000000000001';
select count(*) as noi_dung from public.lesson_contents;
\echo '--- khách và giáo viên chưa đăng ký không thấy khoá ẩn (0, 0)'
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000f2';
select count(*) as khoa from public.courses where id = 'c0000000-0000-0000-0000-000000000001';
set role anon;
select count(*) as khoa from public.courses where id = 'c0000000-0000-0000-0000-000000000001';
set role authenticated;
\echo '--- giáo viên mới đăng ký khoá ẩn (PHẢI LỖI)'
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000f2';
insert into public.enrollments (course_id) values ('c0000000-0000-0000-0000-000000000001');

\echo '--- Academic lead xoá khoá ẩn đã có người học: không xoá (0 dòng, khoá còn 1)'
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
delete from public.courses where id = 'c0000000-0000-0000-0000-000000000001';
select count(*) as con from public.courses where id = 'c0000000-0000-0000-0000-000000000001';
\echo '--- xuất bản lại khoá đủ nội dung (OK)'
update public.courses set status = 'published' where id = 'c0000000-0000-0000-0000-000000000001';
select status from public.courses where id = 'c0000000-0000-0000-0000-000000000001';

\echo '--- người soạn chèn thẳng job PBT (PHẢI LỖI: job chỉ tạo qua hàm)'
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
insert into public.generation_jobs (kind, requested_by) values ('pbt', '00000000-0000-0000-0000-00000000000b');
reset role;
