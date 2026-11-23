# Thử trọn luồng KHBD trên máy, không cần Supabase thật

Dùng khi máy không ra được supabase.co, hoặc muốn thử phá dữ liệu thoải mái. Cần Postgres 16+, Node, Python + Playwright, và
[PostgREST](https://github.com/PostgREST/postgrest/releases) (bản static).

1. Tạo database `e2e`: chạy `supabase/tests/00_stub_supabase.sql`, mọi file trong `supabase/migrations/` theo thứ tự tên, rồi
   `supabase/seed.sql` và `supabase/seed-khung-mau.sql`. Thêm người dùng thử:
   ```sql
   insert into auth.users (id, email, raw_user_meta_data) values
     ('11111111-1111-1111-1111-111111111111', 'nhanvien.thu@aiedu.com.vn', '{"full_name":"Nhân viên thử"}');
   insert into public.user_roles (user_id, role) values ('11111111-1111-1111-1111-111111111111', 'admin');
   ```
2. Chạy PostgREST ở cổng 3001 với `db-anon-role = "anon"` và `jwt-secret` bất kỳ (≥ 32 ký tự).
3. `JWT_SECRET=<cùng secret> node gateway.cjs`: cổng 54321 giả `/rest/v1` (chuyển sang PostgREST) và `/auth/v1/user`.
4. `JWT_SECRET=<cùng secret> node token.cjs > cookie.txt`: phiên đăng nhập của người dùng thử.
5. Build và chạy web với `NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321` (khoá publishable để chuỗi bất kỳ), cổng 3005.
6. `python3 flow_khbd.py`: tạo 2 bài, chờ xong, thử lỗi `#loi` và chạy lại, góp ý, trả về, duyệt v2, bài mới lớp 8; ảnh lưu ở `shots/`.

7. Khoá học (khung 3 tầng): thêm giáo viên thử (không vai trò) vào `auth.users` (id `22222222-…`, email giả), tạo cookie của người đó theo
   mẫu `token.cjs` (đổi `sub`, `email`, thêm `name`), rồi `E2E_TEACHER_COOKIE_FILE=<file> python3 flow_noi_dung.py`: nhân viên tạo khoá,
   soạn thông tin trang khoá, học phần, phần, 4 bước (bài đọc có học liệu, quiz, phản tư, tổng kết), kiểm tra, xuất bản; giáo viên
   đăng ký, học từng bước (quiz sai rồi làm lại đạt 80%), hoàn thành khoá; menu nội bộ 390 px; người phụ trách xem câu trả lời phản tư.

Realtime không có trong cách này (trang vẫn tự cập nhật nhờ vòng gọi `advance_mock_jobs`).
