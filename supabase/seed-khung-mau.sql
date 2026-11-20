-- Khung chương trình mẫu để thử màn Tạo KHBD trong lúc chưa đồng bộ kho Drive (lấy từ design/artboards/TaoKHBD.dc.html).
-- Khi worker đồng bộ Drive chạy, bảng này được ghi lại từ khung NLS thật. Chạy lại không bị trùng.
insert into public.curriculum_lessons (level, grade, topic_no, topic_name, lesson_no, title, periods) values
 ('thcs', 6, 1, 'Nền tảng của công nghệ AI', 1, 'Bài 1. Làm quen với nền tảng Google Deepmind', 1),
 ('thcs', 6, 1, 'Nền tảng của công nghệ AI', 2, 'Bài 2. AI là gì?', 2),
 ('thcs', 6, 1, 'Nền tảng của công nghệ AI', 3, 'Bài 3. AI tạo sinh', 1),
 ('thcs', 6, 1, 'Nền tảng của công nghệ AI', 4, 'Bài 4. Mô hình', 1),
 ('thcs', 6, 1, 'Nền tảng của công nghệ AI', 5, 'Bài 5. Dữ liệu', 2),
 ('thcs', 6, 1, 'Nền tảng của công nghệ AI', 6, 'Bài 6. Thị giác máy tính', 1),
 ('thcs', 6, 1, 'Nền tảng của công nghệ AI', 7, 'Bài 7. Ứng dụng của AI', 2),
 ('thcs', 6, 1, 'Nền tảng của công nghệ AI', 8, 'Bài 8. Ôn tập chủ đề 1', 1),
 ('thcs', 6, 2, 'Máy tính học từ dữ liệu như thế nào?', 9, 'Bài 9. Làm quen với máy học (Machine Learning)', 2),
 ('thcs', 6, 2, 'Máy tính học từ dữ liệu như thế nào?', 10, 'Bài 10. Cách máy học hoạt động', 1)
on conflict (grade, lesson_no) do nothing;
