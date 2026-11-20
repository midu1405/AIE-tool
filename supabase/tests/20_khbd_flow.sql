-- Kiểm tra luồng KHBD giai đoạn 2. Chạy sau 10_courses_rules.sql (dùng lại user a/b/c ở đó).
-- Dòng có chữ PHẢI LỖI là lệnh phải bị từ chối.
\set ON_ERROR_STOP 0
reset role;
insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000000d','reviewer@aiedu.com.vn');
insert into public.user_roles (user_id, role) values ('00000000-0000-0000-0000-00000000000d','reviewer');
insert into public.curriculum_lessons (id, level, grade, topic_no, topic_name, lesson_no, title, periods) values
 ('a0000000-0000-0000-0000-000000000001','thcs',6,1,'Nền tảng của công nghệ AI',2,'Bài 2. AI là gì?',2),
 ('a0000000-0000-0000-0000-000000000002','thcs',6,1,'Nền tảng của công nghệ AI',3,'Bài 3. AI tạo sinh',1);

set role authenticated;
\echo '--- giáo viên tạo job (PHẢI LỖI quyền)'
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
select public.create_khbd_jobs('kho', '[{"lesson_id":"a0000000-0000-0000-0000-000000000001"}]');

\echo '--- người soạn tạo bài mới lớp 3 (PHẢI LỖI lớp 1–3)'
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
select public.create_khbd_jobs('moi', '[{"grade":3,"title":"Bài thử"}]');

\echo '--- người soạn tạo 2 bài từ kho, 1 bài ghi chú #loi (ok)'
select public.create_khbd_jobs('kho', '[{"lesson_id":"a0000000-0000-0000-0000-000000000001"}]', '{"bases":["tt02"]}') is not null as tao_1;
select public.create_khbd_jobs('kho', '[{"lesson_id":"a0000000-0000-0000-0000-000000000002"}]', '{"note":"thử #loi"}') is not null as tao_2;
select count(*) as so_job_con, (select count(*) from public.job_steps) as so_buoc from public.generation_jobs where parent_job_id is not null;
\echo '--- căn cứ bắt buộc luôn có: qd2422, cv5588, tt02'
select options->'bases' from public.generation_jobs where parent_job_id is not null order by created_at limit 1;

\echo '--- chạy giả lập (2 lượt): bài 2 xong v1, bài 3 lỗi ở luu_doc'
select public.advance_mock_jobs(0) > 0 as chay_1;
select public.advance_mock_jobs(0) > 0 as chay_2;
select title, list_status, version_no, warnings from public.khbd_list order by title;

\echo '--- huỷ bài đã lỗi (PHẢI LỖI chỉ huỷ bài đang chờ)'
select public.cancel_job((select id from public.generation_jobs where status = 'failed' and parent_job_id is not null));

\echo '--- chạy lại bài lỗi → xong v1'
select public.retry_job((select id from public.generation_jobs where status = 'failed' and parent_job_id is not null));
select public.advance_mock_jobs(0) >= 0;
select title, list_status, version_no from public.khbd_list order by title;

\echo '--- người soạn tự duyệt (PHẢI LỖI quyền)'
select public.review_version((select current_version_id from public.documents where title = 'Bài 2. AI là gì?'), 'approved');

set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000d';
\echo '--- người duyệt trả về khi chưa có góp ý (PHẢI LỖI)'
select public.review_version((select current_version_id from public.documents where title = 'Bài 2. AI là gì?'), 'changes_requested');

\echo '--- thêm góp ý, trả về → soạn v2, góp ý được đánh dấu đã xử lý'
insert into public.feedback_items (document_version_id, source, author, anchor, content)
select current_version_id, 'web', 'Người duyệt', 'Hoạt động 2', 'Cần ví dụ gần gũi hơn' from public.documents where title = 'Bài 2. AI là gì?';
select public.review_version((select current_version_id from public.documents where title = 'Bài 2. AI là gì?'), 'changes_requested', null, '{"1":2}', 'Sửa HĐ2') is not null as tra_ve;
select public.advance_mock_jobs(0) >= 0;
select public.advance_mock_jobs(0) >= 0;
select title, list_status, version_no from public.khbd_list where title = 'Bài 2. AI là gì?';
select status, addressed_in_version_id is not null as co_ban_moi from public.feedback_items;

\echo '--- duyệt v2 rồi duyệt lại lần nữa (PHẢI LỖI không còn chờ duyệt)'
select public.review_version((select current_version_id from public.documents where title = 'Bài 2. AI là gì?'), 'approved', '[]', '{"1":3}', null) is null as da_duyet;
select public.review_version((select current_version_id from public.documents where title = 'Bài 2. AI là gì?'), 'approved');
select list_status from public.khbd_list where title = 'Bài 2. AI là gì?';

\echo '--- hoàn tác duyệt → chờ duyệt'
select public.undo_approval((select current_version_id from public.documents where title = 'Bài 2. AI là gì?'));
select list_status from public.khbd_list where title = 'Bài 2. AI là gì?';

\echo '--- giáo viên đọc danh sách KHBD (0 dòng) và gọi giả lập (0)'
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
select count(*) from public.khbd_list;
select public.advance_mock_jobs(0);
