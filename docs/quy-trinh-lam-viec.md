# Quy trình làm việc

Repo này có hai bên Claude cùng làm, mỗi bên một vai. Midu là người chốt.

| Vai | Ai | Làm gì |
|---|---|---|
| Code | Claude công ty | Dựng web theo `CLAUDE.md`, từng giai đoạn một |
| Thiết kế + kiểm tra | Claude của Midu | Giữ bản mẫu giao diện, review PR, chạy thử |
| Chốt | Midu | Duyệt PR, trả lời các mục "Chưa chốt" |

## Luồng một thay đổi

1. **Nhánh.** Bên code tạo nhánh từ `main`: `feat/<giai-doan>-<ten-ngan>` (ví dụ `feat/g1-dang-nhap-google`), `fix/<ten-ngan>` cho sửa lỗi.
2. **Commit nhỏ, rõ nghĩa.** Mỗi commit một việc. Không commit `.env*`, khoá, file JSON service account.
3. **Pull Request vào `main`.** Điền mẫu PR (`.github/pull_request_template.md`): màn nào, route nào, ảnh chụp, test đã chạy.
4. **Review.** Bên thiết kế đọc diff và chạy thử, góp ý ngay trong PR theo mức:
   - **Chặn:** sai bảo mật, RLS, rò secret, ghi vào kho nguồn Drive, sai luồng nghiệp vụ, lệch hẳn bản mẫu.
   - **Nên sửa:** a11y, lệch token màu/khoảng cách, thiếu trạng thái rỗng/lỗi/đang tải, thiếu test.
   - **Gợi ý:** cách viết gọn hơn, đặt tên.
5. **Sửa và merge.** Bên code sửa hết mục Chặn. Midu bấm merge (squash).

## Bên thiết kế kiểm gì trong mỗi PR

- **Giao diện:** đúng bố cục, chữ, màu, bo góc so với `design/artboards/<Màn>.dc.html`; có trạng thái rỗng, lỗi, đang tải; hiển thị được ở 1280 px và 390 px.
- **Tiếng Việt và a11y:** chữ đúng dấu; ô nhập có `<label>`; nút biểu tượng có `aria-label`; điều hướng được bằng bàn phím; tương phản ≥ 4.5:1; vùng bấm ≥ 44 px.
- **Dữ liệu và phân quyền:** mọi bảng có RLS; thay đổi schema nằm trong migration mới; khu `/noi-bo` chặn người không phải nhân viên ở cả server lẫn DB; chỉ `quan_ly_noi_dung`/`admin` xuất bản khoá học; chỉ gắn được phiên bản đã duyệt.
- **Bảo mật:** không secret, ID Drive, email viết cứng; service role key không lộ ra trình duyệt; worker không gọi lệnh ghi/xoá nào vào kho nguồn.
- **Chất lượng:** `npm run lint`, `npm run typecheck`, test đều qua; tìm kiếm bỏ dấu đúng.

## Khi bản mẫu và code lệch nhau

- Code thấy bản mẫu khó làm hoặc thiếu trạng thái: hỏi trong PR, kèm đề xuất. Không tự đổi giao diện.
- Cần màn mới hoặc đổi luồng: mở Issue gắn nhãn `thiet-ke`; bên thiết kế vẽ lên canvas, cập nhật `design/`, rồi bên code mới làm.

## Repo công khai

Repo đang để public. Không đưa vào repo: tên đồng nghiệp, email cá nhân, ID thư mục/Doc trên Drive, nội dung học liệu nội bộ, ảnh chụp có dữ liệu thật. Dữ liệu mẫu dùng tên giả và ngoặc vuông.
