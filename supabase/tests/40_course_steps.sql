-- Khung 3 tầng (20261120081713_course_steps): phần, nội dung bước, quiz chấm ở database, phản tư.
-- Dùng lại user và khoá ở 10_: a = Academic lead, b = người soạn, c = giáo viên đã đăng ký khoá c…1; f1 = giáo viên chưa đăng ký.
\set ON_ERROR_STOP 0
reset role;
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000f1', 'gv2@example.com');
insert into public.course_sections (id, module_id, position, title) values
 ('5e000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 1, 'Tổng kết');
insert into public.course_lessons (id, section_id, position, title, kind, ready) values
 ('5b000000-0000-0000-0000-000000000001', '5e000000-0000-0000-0000-000000000001', 0, 'Quiz học phần 1', 'quiz', true),
 ('5b000000-0000-0000-0000-000000000002', '5e000000-0000-0000-0000-000000000001', 1, 'Phản tư', 'reflect', true);
insert into public.lesson_contents (lesson_id, body) values
 ('5b000000-0000-0000-0000-000000000001', '{"questions":[{"text":"C1","options":["a","b"]},{"text":"C2","options":["a","b"]},{"text":"C3","options":["a","b"]},{"text":"C4","options":["a","b"]},{"text":"C5","options":["a","b"]}]}');
insert into public.quiz_keys (lesson_id, answers, explains) values
 ('5b000000-0000-0000-0000-000000000001', '{1,0,1,0,1}', '{e1,e2,e3,e4,e5}');

\echo '--- bước cũ (thêm bằng module_id) đã vào phần "Nội dung"; module_id của bước mới do trigger điền'
select s.title as phan, count(*) as so_buoc, bool_and(l.module_id = s.module_id) as dung_hoc_phan
from public.course_lessons l join public.course_sections s on s.id = l.section_id
where s.module_id = 'a0000000-0000-0000-0000-000000000001' group by s.title, s.position order by s.position;

set role authenticated;
\echo '--- giáo viên chưa đăng ký: thấy tên phần (2) nhưng không đọc nội dung (0), không đọc đáp án (0)'
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000f1';
select count(*) as phan from public.course_sections where module_id = 'a0000000-0000-0000-0000-000000000001';
select count(*) as noi_dung from public.lesson_contents;
select count(*) as dap_an from public.quiz_keys;
\echo '--- giáo viên chưa đăng ký nộp quiz (PHẢI LỖI)'
select public.submit_quiz('5b000000-0000-0000-0000-000000000001', '{1,0,1,0,1}');

\echo '--- giáo viên đã đăng ký: đọc được nội dung (1), vẫn không đọc đáp án (0)'
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
select count(*) as noi_dung from public.lesson_contents;
select count(*) as dap_an from public.quiz_keys;
\echo '--- tự đánh dấu xong bước quiz (PHẢI LỖI: quiz chỉ tính xong khi đạt)'
insert into public.lesson_progress (lesson_id) values ('5b000000-0000-0000-0000-000000000001');
\echo '--- nộp thiếu câu (PHẢI LỖI)'
select public.submit_quiz('5b000000-0000-0000-0000-000000000001', '{1,0}');
\echo '--- đúng 3/5 = 60% (chưa đạt, chưa tính xong)'
select public.submit_quiz('5b000000-0000-0000-0000-000000000001', '{1,0,1,1,0}') ->> 'passed' as dat;
select count(*) as xong from public.lesson_progress where lesson_id = '5b000000-0000-0000-0000-000000000001';
\echo '--- đúng 4/5 = 80% (đạt, tính xong; trả về đáp án và giải thích)'
select r ->> 'passed' as dat, r ->> 'need' as can, r -> 'explains' ->> 0 as giai_thich
from public.submit_quiz('5b000000-0000-0000-0000-000000000001', '{1,0,1,0,0}') r;
select count(*) as xong from public.lesson_progress where lesson_id = '5b000000-0000-0000-0000-000000000001';
\echo '--- tự ghi kết quả quiz (PHẢI LỖI RLS)'
insert into public.quiz_attempts (lesson_id, answers, correct, total, passed) values ('5b000000-0000-0000-0000-000000000001', '{1}', 5, 5, true);

\echo '--- đánh dấu xong bước phản tư khi chưa trả lời (PHẢI LỖI)'
insert into public.lesson_progress (lesson_id) values ('5b000000-0000-0000-0000-000000000002');
\echo '--- trả lời phản tư rồi đánh dấu xong (OK)'
insert into public.reflections (lesson_id, answer, link) values ('5b000000-0000-0000-0000-000000000002', 'Lớp em bắt đầu từ trò chơi phân loại.', 'https://docs.google.com/x');
insert into public.lesson_progress (lesson_id) values ('5b000000-0000-0000-0000-000000000002');
\echo '--- link không phải http (PHẢI LỖI)'
update public.reflections set link = 'javascript:alert(1)' where lesson_id = '5b000000-0000-0000-0000-000000000002';

\echo '--- giáo viên khác không thấy phản tư của người này (0); người phụ trách khoá thấy (1) và thấy kết quả quiz (2)'
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000f1';
select count(*) as thay from public.reflections;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
select count(*) as thay from public.reflections;
select count(*) as lan_nop from public.quiz_attempts;

\echo '--- người soạn sửa nội dung bước của khoá đã xuất bản (0 dòng)'
update public.lesson_contents set body = '{}' where lesson_id = '5b000000-0000-0000-0000-000000000001';
\echo '--- Academic lead đổi thứ tự 2 phần (OK: Tổng kết lên đầu)'
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select public.move_course_item('section', '5e000000-0000-0000-0000-000000000001', -1);
select title, position from public.course_sections where module_id = 'a0000000-0000-0000-0000-000000000001' order by position;
\echo '--- loại bước không hợp lệ (PHẢI LỖI)'
update public.course_lessons set kind = 'reading' where id = '5b000000-0000-0000-0000-000000000001';
reset role;
