# AI Edu Training Hub

Web khoá học cho giáo viên và khu nội bộ tạo KHBD của AI Edu.

- Hướng dẫn cho Claude Code và người phát triển: [`CLAUDE.md`](CLAUDE.md)
- Schema: `supabase/migrations/` (lõi + khoá học), thử bằng `supabase/tests/run.sh <ten_db>` trên PostgreSQL 16
- Biến môi trường mẫu: [`.env.example`](.env.example)

## Bắt đầu

1. Tạo project Supabase, bật đăng nhập Google.
2. Chạy migration: `supabase db push` (hoặc dán file SQL vào SQL editor).
3. Chép `.env.example` thành `.env.local` và điền giá trị.
4. Mở Claude Code trong thư mục này và yêu cầu: "Đọc CLAUDE.md, dựng giai đoạn 1."
