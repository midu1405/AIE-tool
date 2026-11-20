# Thử trọn luồng KHBD trên máy, không cần Supabase thật

Dùng khi máy không ra được supabase.co, hoặc muốn thử phá dữ liệu thoải mái. Cần Postgres 16+, Node, Python + Playwright, và
[PostgREST](https://github.com/PostgREST/postgrest/releases) (bản static).

1. Tạo database `e2e`: chạy `supabase/tests/00_stub_supabase.sql`, mọi file trong `supabase/migrations/` theo thứ tự tên, rồi
   `supabase/seed.sql` và `supabase/seed-khung-mau.sql`. Thêm người dùng thử:
   ```sql
   insert into auth.users (id, email, raw_user_meta_data) values
     ('11111111-1111-1111-1111-111111111111', 'nmduc@aiedu.com.vn', '{"full_name":"Nguyễn Minh Đức"}');
   insert into public.user_roles (user_id, role) values ('11111111-1111-1111-1111-111111111111', 'admin');
   ```
2. Chạy PostgREST ở cổng 3001 với `db-anon-role = "anon"` và `jwt-secret` bất kỳ (≥ 32 ký tự).
3. `JWT_SECRET=<cùng secret> node gateway.cjs`: cổng 54321 giả `/rest/v1` (chuyển sang PostgREST) và `/auth/v1/user`.
4. `JWT_SECRET=<cùng secret> node token.cjs > cookie.txt`: phiên đăng nhập của người dùng thử.
5. Build và chạy web với `NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321` (khoá publishable để chuỗi bất kỳ), cổng 3005.
6. `python3 flow_khbd.py`: tạo 2 bài, chờ xong, thử lỗi `#loi` và chạy lại, góp ý, trả về, duyệt v2, bài mới lớp 8; ảnh lưu ở `shots/`.

7. Giai đoạn 3: thêm giáo viên thử (không vai trò) vào `auth.users` (id `22222222-…`, email giả), tạo cookie của người đó theo mẫu
   `token.cjs` (đổi `sub`, `email`, thêm `name`), rồi `E2E_TEACHER_COOKIE_FILE=<file> python3 flow_khoa_hoc.py`: tạo khoá nháp, học phần,
   bài, gắn KHBD đã duyệt, xuất bản, menu 390 px; giáo viên đăng ký, đánh dấu bài, lưu, xem Khoá học của tôi.

Realtime không có trong cách này (trang vẫn tự cập nhật nhờ vòng gọi `advance_mock_jobs`).
