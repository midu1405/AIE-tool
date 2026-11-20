# Bản mẫu giao diện

Bản sao mã nguồn của canvas thiết kế (8 màn). Canvas trên claude.ai là nguồn chuẩn; thư mục này được cập nhật mỗi khi canvas đổi.

| File | Màn | Route |
|---|---|---|
| `artboards/Main.dc.html` | Danh mục khoá học | `/` |
| `artboards/Detail.dc.html` | Chi tiết khoá học | `/khoa-hoc/[slug]` |
| `artboards/MyCourses.dc.html` | Khoá học của tôi | `/khoa-hoc-cua-toi` |
| `artboards/TaoKHBD.dc.html` | Tạo KHBD | `/noi-bo/tao-khbd` |
| `artboards/TienDo.dc.html` | Tiến độ | `/noi-bo/tien-do` |
| `artboards/DanhSachKHBD.dc.html` | Danh sách KHBD | `/noi-bo/khbd` |
| `artboards/DuyetBai.dc.html` | Duyệt bài | `/noi-bo/khbd/[id]` |
| `artboards/QuanLyKhoaHoc.dc.html` | Quản lý khoá học | `/noi-bo/khoa-hoc`, `/noi-bo/khoa-hoc/[id]` |

`canvas.json` ghi vị trí và kích thước từng màn trên canvas.

## Cách đọc một file `.dc.html`

- Phần HTML dùng thẻ riêng của canvas: `<sc-for>` là vòng lặp, `<sc-if>` là điều kiện, `{{ ... }}` là giá trị. Khi dựng bằng React, đổi lần lượt thành `.map()`, điều kiện `&&`, và biểu thức JSX.
- Phần `<script>` có `class Component extends DCLogic`: dữ liệu mẫu, state và hàm `renderVals()`. Logic lọc, đếm, sắp xếp và tìm bỏ dấu (`fold()`) ở đây là hành vi mong muốn; chuyển sang truy vấn DB khi có dữ liệu thật.
- Style viết inline. Khi code, gom về token Tailwind trong `CLAUDE.md`, không chép nguyên style inline.
- Chữ trong ngoặc vuông (`[Tên giáo viên]`) là chỗ dữ liệu thật.
