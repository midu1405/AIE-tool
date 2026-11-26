-- Học liệu chỉ cho người đã đăng ký, mã giấy 10 ký tự, xoá bước không làm người học kẹt (20261126100000_hoc_lieu_ma_giay).
-- Dùng lại 10_–70_: khoá c…1 đã xuất bản, có học liệu gắn ở bước b…1; c, f1 đã đăng ký; f2 chưa đăng ký.
\set ON_ERROR_STOP 0
set role authenticated;
\echo '--- giáo viên chưa đăng ký: không lấy được link học liệu (0) nhưng biết khoá kèm 1 KHBD'
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000f2';
select count(*) as link from public.course_material_links('c0000000-0000-0000-0000-000000000001');
select kind, n from public.course_material_counts('c0000000-0000-0000-0000-000000000001');
\echo '--- khách cũng thấy số học liệu (1 dòng)'
set role anon;
select count(*) as dong from public.course_material_counts('c0000000-0000-0000-0000-000000000001');
set role authenticated;
\echo '--- giáo viên đã đăng ký lấy được link (1)'
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
select count(*) as link from public.course_material_links('c0000000-0000-0000-0000-000000000001');

\echo '--- mã giấy mới dạng AIE-năm-XXXX-XXXX-XX; tra mã gõ thường, thiếu gạch vẫn ra; mã cũ 6 ký tự vẫn tra được'
reset role;
select public.new_certificate_code() ~ '^AIE-[0-9]{4}-[A-HJKMNP-Z2-9]{4}-[A-HJKMNP-Z2-9]{4}-[A-HJKMNP-Z2-9]{2}$' as ma_moi_dung_dang;
select count(distinct public.new_certificate_code()) = 200 as khong_trung from generate_series(1, 200);
select public.canonical_certificate_code(' aie 2026 k7mq-x3pv 9r ') as chuan_10,
       public.canonical_certificate_code('aie-2026-7f3k9q') as chuan_6,
       public.canonical_certificate_code('AIE-2026-ABC') is null as sai_dang;
\echo '--- giấy cấp sau migration có mã 10 ký tự (khoá c…1, giáo viên c đã có giấy cũ còn hiệu lực nên dùng f1 sau khi thu hồi)'
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select public.revoke_certificate((select code from public.certificates
  where user_id = '00000000-0000-0000-0000-0000000000f1' and revoked_at is null), 'Thử mã mới');
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000f1';
select length(code) = 21 as ma_10_ky_tu from public.issue_certificate('c0000000-0000-0000-0000-000000000001', 'Trần Văn Minh');
reset role;
select code as ma_moi from public.certificates
where user_id = '00000000-0000-0000-0000-0000000000f1' and revoked_at is null \gset
set role anon;
select full_name from public.verify_certificate(lower(replace(:'ma_moi', '-', ' ')));
\echo '--- chèn giấy mã sai dạng (PHẢI LỖI)'
reset role;
insert into public.certificates (code, user_id, course_id, full_name, course_title, course_slug, hours_min, hours_max, module_count, completed_at)
values ('AIE-2026-ABCDEFGH', '00000000-0000-0000-0000-0000000000f1', 'c0000000-0000-0000-0000-000000000001', 'X Y', 'x', 'x', 1, 1, 1, now());

\echo '--- xoá bước: giáo viên f2 đăng ký, học xong mọi bước trừ 1 bài đọc; xoá bài đó thì thành "Đã hoàn thành" (true)'
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000f2';
insert into public.enrollments (course_id) values ('c0000000-0000-0000-0000-000000000001');
insert into public.lesson_progress (lesson_id) values ('b0000000-0000-0000-0000-000000000001');
insert into public.reflections (lesson_id, answer) values ('5b000000-0000-0000-0000-000000000002', 'Trả lời');
insert into public.lesson_progress (lesson_id) values ('5b000000-0000-0000-0000-000000000002');
select public.submit_quiz('5b000000-0000-0000-0000-000000000001', '{1,0,1,0,1}') ->> 'passed' as quiz_dat;
select completed_at is not null as xong from public.enrollments where course_id = 'c0000000-0000-0000-0000-000000000001';
reset role;
insert into public.course_lessons (id, section_id, position, title, kind, ready)
select 'b0000000-0000-0000-0000-0000000000ee', section_id, 9, 'Bài thừa', 'doc', true
from public.course_lessons where id = 'b0000000-0000-0000-0000-000000000002';
delete from public.lesson_progress where user_id = '00000000-0000-0000-0000-0000000000f2' and lesson_id = 'b0000000-0000-0000-0000-000000000002';
update public.enrollments set completed_at = null where user_id = '00000000-0000-0000-0000-0000000000f2';
\echo '    (đang thiếu bài B và bài thừa; xoá bài thừa thì vẫn chưa xong vì còn bài B)'
delete from public.course_lessons where id = 'b0000000-0000-0000-0000-0000000000ee';
select completed_at is not null as xong from public.enrollments where user_id = '00000000-0000-0000-0000-0000000000f2';
\echo '    (học bài B rồi thêm bài thừa mới, xoá bài thừa: thành xong)'
insert into public.lesson_progress (user_id, lesson_id) values ('00000000-0000-0000-0000-0000000000f2', 'b0000000-0000-0000-0000-000000000002');
update public.enrollments set completed_at = null where user_id = '00000000-0000-0000-0000-0000000000f2';
insert into public.course_lessons (id, section_id, position, title, kind, ready)
select 'b0000000-0000-0000-0000-0000000000ef', section_id, 9, 'Bài thừa 2', 'doc', true
from public.course_lessons where id = 'b0000000-0000-0000-0000-000000000002';
delete from public.course_lessons where id = 'b0000000-0000-0000-0000-0000000000ef';
select completed_at is not null as xong from public.enrollments where user_id = '00000000-0000-0000-0000-0000000000f2';
\echo '--- thêm bước vào khoá: người đã hoàn thành vẫn giữ "Đã hoàn thành" (true, true)'
insert into public.course_lessons (id, section_id, position, title, kind, ready)
select 'b0000000-0000-0000-0000-0000000000f0', section_id, 9, 'Bài mới thêm', 'doc', true
from public.course_lessons where id = 'b0000000-0000-0000-0000-000000000002';
select bool_and(completed_at is not null) as van_xong, count(*) > 0 as co_nguoi
from public.enrollments where course_id = 'c0000000-0000-0000-0000-000000000001' and user_id in
  ('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-00000000000c');
delete from public.course_lessons where id = 'b0000000-0000-0000-0000-0000000000f0';
