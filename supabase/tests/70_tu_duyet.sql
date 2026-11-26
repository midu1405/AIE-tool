-- Cờ "Tự duyệt" ở Danh sách KHBD (20261126090000_tu_duyet). Dùng lại 20_: b tạo "Bài 2", "Bài 3"; d là người duyệt.
\set ON_ERROR_STOP 0
set role authenticated;
\echo '--- người duyệt d duyệt "Bài 3" do người soạn b tạo: không phải tự duyệt (false)'
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000d';
select public.review_version((select current_version_id from public.documents where title = 'Bài 3. AI tạo sinh' and current_version_id is not null), 'approved') is null as da_duyet;
select list_status, self_approved from public.khbd_list where title = 'Bài 3. AI tạo sinh' and current_version_id is not null;

\echo '--- Academic lead a tự tạo bài mới rồi tự duyệt: được phép, cờ tự duyệt (approved, true)'
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select public.create_khbd_jobs('moi', '[{"grade":8,"title":"Bài thử tự duyệt"}]') is not null as tao;
select public.advance_mock_jobs(0) >= 0;
select public.advance_mock_jobs(0) >= 0;
select public.review_version((select current_version_id from public.documents where title = 'Bài thử tự duyệt'), 'approved') is null as da_duyet;
select list_status, self_approved from public.khbd_list where title = 'Bài thử tự duyệt';
reset role;
