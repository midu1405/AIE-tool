-- Kiểm tra màn Quản lý khoá học (giai đoạn 3). Chạy sau 10_ và 20_ (dùng lại user và khoá ở đó).
\set ON_ERROR_STOP 0
reset role;
insert into public.courses (id, slug, title, topic, hours_min, hours_max, format, level, status)
values ('c0000000-0000-0000-0000-000000000009', 'khoa-nhap', 'Khoá nháp', 'ai', 1, 1, 'self', 'basic', 'draft');
insert into public.course_modules (id, course_id, position, title) values
 ('f0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000009', 0, 'HP A'),
 ('f0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000009', 1, 'HP B');
set role authenticated;

\echo '--- người soạn đổi thứ tự học phần trong khoá nháp (ok: HP B lên đầu)'
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
select public.move_course_item('module', 'f0000000-0000-0000-0000-000000000002', -1);
select title, position from public.course_modules where course_id = 'c0000000-0000-0000-0000-000000000009' order by position;

\echo '--- người soạn đổi thứ tự bài trong khoá đã xuất bản (PHẢI LỖI quyền)'
select public.move_course_item('lesson', (select l.id from public.course_lessons l join public.course_modules m on m.id = l.module_id
  where m.course_id = 'c0000000-0000-0000-0000-000000000001' order by l.position limit 1), 1);

\echo '--- Academic lead đổi được (ok: bài đầu xuống cuối)'
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select l.title, l.position from public.course_lessons l join public.course_modules m on m.id = l.module_id
  where m.course_id = 'c0000000-0000-0000-0000-000000000001' order by l.position;
select public.move_course_item('lesson', (select l.id from public.course_lessons l join public.course_modules m on m.id = l.module_id
  where m.course_id = 'c0000000-0000-0000-0000-000000000001' order by l.position limit 1), 1);
select l.title, l.position from public.course_lessons l join public.course_modules m on m.id = l.module_id
  where m.course_id = 'c0000000-0000-0000-0000-000000000001' order by l.position;

\echo '--- danh sách quản lý: nhân viên thấy cả khoá nháp (2 khoá), giáo viên chỉ khoá đã xuất bản'
select title, status, module_count, lesson_count, material_count, update_count from public.course_admin_list order by title;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
select count(*) as gv_thay from public.course_admin_list;
\echo '--- giáo viên gọi đổi thứ tự (PHẢI LỖI quyền)'
select public.move_course_item('module', 'f0000000-0000-0000-0000-000000000001', 1);
