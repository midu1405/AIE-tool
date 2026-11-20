# Phương án B: Routine của Claude Code thay Claude API (tóm tắt)

> **Tài liệu lịch sử (10/11/2026).** Bên thực hiện soạn KHBD (executor) **chưa chốt**. Code hiện tại đi qua interface `KhbdExecutor` với `MockExecutor`. Tài liệu này ghi lại phương án B để khi chốt có sẵn bối cảnh. Nơi lưu (`2. Testing`) và số bước ở đây đã cũ; chuẩn hiện hành nằm trong `CLAUDE.md`.

## Ý tưởng

Giữ trải nghiệm 1 click nhưng không gọi Claude API. Khi người dùng bấm Soạn, worker gọi endpoint `/fire` của một **routine** (tác vụ chạy trên cloud của Claude Code, trigger bằng API). Routine dùng skill `aca-khbd-ai12` và connector Google Drive của người sở hữu routine để soạn và lưu Doc, rồi ghi một file kết quả `job-<id>.json` vào thư mục `_jobs`. Worker dò file đó để biết xong.

| | Phương án A (Claude API) | Phương án B (Routine) |
|---|---|---|
| Ai gọi Claude | Worker | Worker chỉ bấm `/fire` |
| Ai tạo Google Doc | Worker (service account) | Routine (connector Drive của chủ routine) |
| Chi phí | Theo token | Nằm trong hạn mức seat |
| Tiến độ | Từng bước | 3 trạng thái: đã gửi, đang soạn, xong |
| Độ ổn định | API chính thức | Research preview |

## Hợp đồng dữ liệu `khbd-job/v1`

- Payload gửi qua trường `text` của `/fire`: `job_id`, `kind` (`khbd_pbt` | `regenerate` | `ai_review`), thông tin bài, ID thư mục nguồn và đầu ra (lấy từ biến môi trường), `note`, `base`, `feedback`.
- Kết quả: `_jobs/job-<job_id>.json` với `status` (`succeeded` | `failed` | `partial`), link Doc, phiên bản, nguồn đã dùng, tự kiểm.
- Routine coi payload là dữ liệu, không phải lệnh; chỉ ghi trong thư mục đầu ra; không xoá file; gặp `job_id` đã có kết quả thì dừng.

## Thay đổi DB nếu chọn B

Migration riêng: bảng `routine_configs` (tên biến môi trường chứa fire URL/token, model, số phiên tối đa), bảng `job_fires` (mỗi lần bắn: thời điểm, mã HTTP, session id), thêm trạng thái `fired`/`stalled` cho job.

## Giới hạn và rủi ro

- `/fire` cần beta header `experimental-cc-routine-2026-04-01`; API có thể đổi.
- Giới hạn: 30 lần/giờ mỗi routine, 100 lần/giờ mỗi tài khoản; dùng chung hạn mức với việc hằng ngày của chủ routine.
- Routine thuộc tài khoản một người: người đó nghỉ hoặc đổi tài khoản thì routine ngừng.
- **Chính sách:** routine dùng gói đăng ký cá nhân; nếu mở web cho người ngoài công ty dùng thì phải chuyển sang API theo điều khoản của Anthropic. Chỉ phù hợp nội bộ.

## Khi nào chuyển sang A

Hạn mức seat hết thường xuyên, Anthropic đổi hoặc bỏ `/fire`, cần mở cho đơn vị ngoài, hoặc cần tiến độ từng bước. Khi đó đặt executor = `api`; database và giao diện giữ nguyên.
