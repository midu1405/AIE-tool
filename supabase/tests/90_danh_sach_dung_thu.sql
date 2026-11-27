-- Danh sách dùng thử và hook tạo tài khoản (20261127040000_danh_sach_dung_thu).
-- c = giáo viên teacher@example.com (10_). Thêm một quản trị riêng cho file này.
\set ON_ERROR_STOP 0
\set VERBOSITY terse
reset role;
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000d1', 'quantri@aiedu.com.vn');
insert into public.user_roles (user_id, role) values ('00000000-0000-0000-0000-0000000000d1', 'admin');

set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000d1';
\echo '--- quản trị thêm email (OK)'
insert into public.signup_allowlist (email, note) values ('gv.thu@gmail.com', 'GV thử');
\echo '--- email viết hoa hoặc có khoảng trắng (PHẢI LỖI)'
insert into public.signup_allowlist (email) values (' GV2@Gmail.com');
select count(*) as so_email from public.signup_allowlist;

set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
\echo '--- giáo viên không thấy danh sách (0)'
select count(*) as thay from public.signup_allowlist;
\echo '--- giáo viên tự thêm mình (PHẢI LỖI)'
insert into public.signup_allowlist (email) values ('teacher2@example.com');
\echo '--- giáo viên gọi hook qua API (PHẢI LỖI không có quyền)'
select public.hook_truoc_khi_tao_tai_khoan('{"user":{"email":"teacher2@example.com"}}');

reset role;
set role anon;
\echo '--- khách đọc danh sách (PHẢI LỖI không có quyền)'
select count(*) from public.signup_allowlist;

reset role;
\echo '--- hook: @aiedu.com.vn qua, email trong danh sách qua (kể cả viết hoa), email khác bị chặn với mã chua_duoc_moi'
select public.hook_truoc_khi_tao_tai_khoan('{"user":{"email":"Moi.Vao@AIEDU.com.vn"}}') = '{}'::jsonb as nhan_vien_qua,
       public.hook_truoc_khi_tao_tai_khoan('{"user":{"email":" GV.Thu@Gmail.com"}}') = '{}'::jsonb as trong_danh_sach_qua,
       public.hook_truoc_khi_tao_tai_khoan('{"user":{"email":"la@gmail.com"}}') #>> '{error,http_code}' as ma_chan,
       public.hook_truoc_khi_tao_tai_khoan('{"user":{"email":"la@gmail.com"}}') #>> '{error,message}' like 'chua_duoc_moi:%' as co_ma,
       public.hook_truoc_khi_tao_tai_khoan('{"user":{"email":"x@aiedu.com.vn.evil.com"}}') ? 'error' as duoi_gia_bi_chan,
       public.hook_truoc_khi_tao_tai_khoan('{"user":{}}') ? 'error' as khong_email_bi_chan;
