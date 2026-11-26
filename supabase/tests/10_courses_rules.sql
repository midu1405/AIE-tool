-- Kiểm tra quyền và quy tắc của vai trò và khoá học. Chạy sau 00_stub_supabase.sql và hai migration.
-- Dòng có chữ PHẢI LỖI là lỗi mong đợi.
\set ON_ERROR_STOP 0
\set VERBOSITY terse
-- users: lead, editor, teacher
insert into auth.users (id, email) values
 ('00000000-0000-0000-0000-00000000000a','lead@aiedu.com.vn'),
 ('00000000-0000-0000-0000-00000000000b','editor@aiedu.com.vn'),
 ('00000000-0000-0000-0000-00000000000c','teacher@example.com');
\echo '--- profile tự tạo khi có user (3)'
select count(*) from public.profiles;
insert into public.user_roles (user_id, role) values ('00000000-0000-0000-0000-00000000000a','content_manager'),('00000000-0000-0000-0000-00000000000b','khbd_editor');
\echo '--- cấp vai trò nhân viên cho email ngoài công ty (PHẢI LỖI)'
insert into public.user_roles (user_id, role) values ('00000000-0000-0000-0000-00000000000c','reviewer');
insert into public.documents (id, kind, title, grade, created_mode) values
 ('d0000000-0000-0000-0000-000000000001','khbd','Bài 1. AI là gì?',6,'soan_lai'),
 ('d0000000-0000-0000-0000-000000000002','khbd','Bài 3. AI tạo sinh',6,'soan_lai');
insert into public.document_versions (id, document_id, version_no, drive_file_id, web_view_link, status) values
 ('e0000000-0000-0000-0000-000000000011','d0000000-0000-0000-0000-000000000001',1,'f1','https://docs.example/1','approved'),
 ('e0000000-0000-0000-0000-000000000012','d0000000-0000-0000-0000-000000000001',2,'f2','https://docs.example/2','approved'),
 ('e0000000-0000-0000-0000-000000000021','d0000000-0000-0000-0000-000000000002',1,'f3','https://docs.example/3','in_review');

set role authenticated;
\echo '--- editor tạo khoá nháp (OK)'
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
insert into public.courses (id, slug, title, topic, hours_min, hours_max, format, level) values ('c0000000-0000-0000-0000-000000000001','gd-ai-thcs','Dạy chuyên đề Giáo dục AI 12 tiết – THCS','teach',4,6,'guided','basic');
insert into public.course_modules (id, course_id, position, title) values ('a0000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000001',0,'Tổng quan');
insert into public.course_lessons (id, module_id, position, title) values ('b0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000001',0,'Bài A'),('b0000000-0000-0000-0000-000000000002','a0000000-0000-0000-0000-000000000001',1,'Bài B');
\echo '--- editor gắn bản chưa duyệt (PHẢI LỖI)'
insert into public.lesson_materials (lesson_id, document_version_id) values ('b0000000-0000-0000-0000-000000000001','e0000000-0000-0000-0000-000000000021');
\echo '--- editor gắn Bài 1 v1 đã duyệt (OK)'
insert into public.lesson_materials (lesson_id, document_version_id) values ('b0000000-0000-0000-0000-000000000001','e0000000-0000-0000-0000-000000000011');
\echo '--- gắn thêm v2 cùng tài liệu vào cùng bài (PHẢI LỖI trùng)'
insert into public.lesson_materials (lesson_id, document_version_id) values ('b0000000-0000-0000-0000-000000000001','e0000000-0000-0000-0000-000000000012');
\echo '--- view báo có bản mới (1 dòng, v1 -> v2)'
select attached_version, latest_version from public.lesson_material_updates;
\echo '--- editor xuất bản (PHẢI LỖI)'
update public.courses set status = 'published' where id = 'c0000000-0000-0000-0000-000000000001';
\echo '--- teacher chưa thấy khoá nháp (0)'
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
select count(*) from public.courses;
\echo '--- lead xuất bản khoá chưa đủ nội dung (PHẢI LỖI: database chạy danh sách tự kiểm)'
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
update public.courses set status = 'published' where id = 'c0000000-0000-0000-0000-000000000001';
-- Soạn đủ: thông tin trang khoá, 2 bài đọc có nội dung và "Sẵn sàng".
reset role;
update public.courses set summary = 'Tóm tắt', description = 'Giới thiệu', audience_note = 'Giáo viên THCS',
  outcomes = array['Ý 1', 'Ý 2', 'Ý 3'] where id = 'c0000000-0000-0000-0000-000000000001';
update public.course_lessons set ready = true where module_id = 'a0000000-0000-0000-0000-000000000001';
insert into public.lesson_contents (lesson_id, body) values
 ('b0000000-0000-0000-0000-000000000001', '{"text":"Nội dung A"}'), ('b0000000-0000-0000-0000-000000000002', '{"text":"Nội dung B"}');
set role authenticated;
\echo '--- lead xuất bản (OK, published_by = a)'
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
update public.courses set status = 'published' where id = 'c0000000-0000-0000-0000-000000000001';
select status, published_by from public.courses;
\echo '--- editor sửa khoá đã xuất bản (0 dòng bị sửa)'
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
update public.courses set title = 'x' where id = 'c0000000-0000-0000-0000-000000000001';
\echo '--- editor thêm bài vào khoá đã xuất bản (PHẢI LỖI RLS)'
insert into public.course_lessons (module_id, position, title) values ('a0000000-0000-0000-0000-000000000001',2,'Bài C');
\echo '--- lead cập nhật học liệu lên v2 (OK) và view hết báo'
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
update public.lesson_materials set document_version_id = 'e0000000-0000-0000-0000-000000000012';
select count(*) as con_ban_moi from public.lesson_material_updates;
\echo '--- lead đổi thứ tự 2 bài (deferrable unique, OK)'
begin; update public.course_lessons set position = 1 - position where module_id = 'a0000000-0000-0000-0000-000000000001'; commit;
select title, position from public.course_lessons order by position;
\echo '--- teacher: thấy khoá (1), đánh dấu bài khi chưa đăng ký (PHẢI LỖI)'
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
select count(*) from public.courses;
insert into public.lesson_progress (lesson_id) values ('b0000000-0000-0000-0000-000000000001');
\echo '--- teacher đăng ký, học xong 2 bài -> completed_at có giá trị, 100%'
insert into public.enrollments (course_id) values ('c0000000-0000-0000-0000-000000000001');
insert into public.lesson_progress (lesson_id) values ('b0000000-0000-0000-0000-000000000001');
select percent, completed_at is not null as xong from public.my_course_progress;
insert into public.lesson_progress (lesson_id) values ('b0000000-0000-0000-0000-000000000002');
select percent, completed_at is not null as xong from public.my_course_progress;
\echo '--- teacher tự sửa completed_at (0 dòng, không có quyền update)'
update public.enrollments set completed_at = null;
\echo '--- teacher thấy học liệu (1) nhưng không gắn được (PHẢI LỖI)'
select count(*) from public.lesson_materials;
insert into public.lesson_materials (lesson_id, document_version_id) values ('b0000000-0000-0000-0000-000000000002','e0000000-0000-0000-0000-000000000011');
\echo '--- teacher không đọc trực tiếp phiên bản KHBD (0) nhưng lấy được link học liệu đang gắn (1 dòng, v2)'
select count(*) from public.document_versions;
select title, version_no, web_view_link from public.course_material_links('c0000000-0000-0000-0000-000000000001');
\echo '--- editor (email công ty, không phải admin) tự cấp quyền admin (PHẢI LỖI RLS)'
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
insert into public.user_roles (user_id, role) values ('00000000-0000-0000-0000-00000000000b','admin');
\echo '--- anon thấy khoá đã xuất bản (1) và học phần (1)'
reset role; set role anon; reset request.jwt.claim.sub;
select (select count(*) from public.courses) as khoa, (select count(*) from public.course_modules) as hoc_phan;
\echo '--- anon gọi hàm link học liệu (PHẢI LỖI quyền)'
select * from public.course_material_links('c0000000-0000-0000-0000-000000000001');
