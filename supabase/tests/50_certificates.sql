-- Giấy chứng nhận (20261123090017_certificates). Dùng lại user và khoá ở 10_, 40_:
-- a = Academic lead, b = người soạn, c = giáo viên đã đăng ký khoá c…1, f1 = giáo viên chưa đăng ký.
\set ON_ERROR_STOP 0
reset role;
update public.enrollments set completed_at = null
where user_id = '00000000-0000-0000-0000-00000000000c' and course_id = 'c0000000-0000-0000-0000-000000000001';

set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
\echo '--- nhận giấy khi chưa hoàn thành khoá (PHẢI LỖI)'
select public.issue_certificate('c0000000-0000-0000-0000-000000000001', 'Nguyễn Thị Lan');

reset role;
update public.enrollments set completed_at = now()
where user_id = '00000000-0000-0000-0000-00000000000c' and course_id = 'c0000000-0000-0000-0000-000000000001';
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
\echo '--- họ tên một chữ (PHẢI LỖI)'
select public.issue_certificate('c0000000-0000-0000-0000-000000000001', '  Lan ');
\echo '--- nhận giấy (OK: mã đúng dạng, họ tên gọn khoảng trắng, chụp tên khoá)'
select code ~ '^AIE-[0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{2}$' as ma_dung, full_name, course_title
from public.issue_certificate('c0000000-0000-0000-0000-000000000001', '  Nguyễn   Thị Lan ');
\echo '--- gọi lại với tên khác: vẫn giấy cũ, họ tên không đổi (1 giấy, Nguyễn Thị Lan)'
select full_name from public.issue_certificate('c0000000-0000-0000-0000-000000000001', 'Nguyen Thi Lan');
select count(*) as so_giay from public.certificates;
\echo '--- tự chèn giấy (PHẢI LỖI)'
insert into public.certificates (code, user_id, course_id, full_name, course_title, course_slug, hours_min, hours_max, module_count, completed_at)
values ('AIE-2026-ZZZZZZ', '00000000-0000-0000-0000-00000000000c', 'c0000000-0000-0000-0000-000000000001', 'Giả mạo', 'x', 'x', 1, 1, 1, now());
\echo '--- tự sửa họ tên trên giấy (PHẢI LỖI không có quyền), họ tên giữ nguyên'
update public.certificates set full_name = 'Người khác';
select full_name from public.certificates;

\echo '--- giáo viên khác không thấy giấy của người này (0); khách xác minh bằng mã thấy họ tên, chưa thu hồi'
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000f1';
select count(*) as thay from public.certificates;
reset role;
select code as ma from public.certificates \gset
set role anon;
select full_name, revoked_at is null as con_hieu_luc from public.verify_certificate(lower(:'ma'));
\echo '--- khách đọc thẳng bảng (PHẢI LỖI không có quyền)'
select count(*) from public.certificates;
\echo '--- mã không có (0 dòng)'
select count(*) as thay from public.verify_certificate('AIE-2026-AAAAAA');

set role authenticated;
\echo '--- người soạn thu hồi (PHẢI LỖI)'
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
select public.revoke_certificate(:'ma', 'Thử');
\echo '--- Academic lead thu hồi (OK), trang xác minh báo đã thu hồi'
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select public.revoke_certificate(:'ma', 'Cấp nhầm khi thử');
select revoked_at is not null as da_thu_hoi from public.verify_certificate(:'ma');
\echo '--- thu hồi rồi giáo viên nhận lại với họ tên đúng (OK: mã mới, 2 giấy, 1 còn hiệu lực)'
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
select code <> :'ma' as ma_moi, full_name from public.issue_certificate('c0000000-0000-0000-0000-000000000001', 'Nguyễn Thị Lan Anh');
select count(*) as tong, count(*) filter (where revoked_at is null) as con_hieu_luc from public.certificates;
reset role;
