-- Bản giả lập soạn KHBD thêm mục "II. Thiết bị dạy học và học liệu" (content.equipment), cho khớp mẫu KHBD của skill
-- aca-khbd-ai12 và canvas DuyetBai. Thứ tự mục khi xem trước nằm ở lib/khbd.ts (KHBD_SECTIONS).
-- Chỉ thay hàm tạo nội dung giả lập; bản đã soạn trước đó giữ nguyên (màn Duyệt bài ghi "chưa có mục" cho bản cũ).

create or replace function public.mock_khbd_content(p_title text, p_grade int, p_periods int, p_codes text[])
returns jsonb language sql immutable set search_path = '' as $$
  select jsonb_build_object(
    'mock', true,
    'objectives', jsonb_build_array(
      'Nêu được ý chính của bài “' || p_title || '” bằng lời của mình.',
      'Thực hiện được hoạt động khám phá theo nhóm và trình bày kết quả.',
      'Vận dụng được điều đã học vào một tình huống quen thuộc ở lớp ' || p_grade || '.'),
    'codes', to_jsonb(coalesce(p_codes, array[]::text[])),
    'equipment', jsonb_build_array(
      'Máy tính kết nối máy chiếu hoặc màn hình tương tác.',
      'Phiếu học tập (PBT) của bài “' || p_title || '”.',
      'Video minh hoạ chiếu trên lớp (cần kết nối mạng).'),
    'activities', jsonb_build_array(
      jsonb_build_object('name', 'Khởi động', 'minutes', round(45 * p_periods * 0.12), 'desc', 'GV nêu câu hỏi gợi mở, HS trả lời nhanh.', 'product', 'Câu trả lời miệng'),
      jsonb_build_object('name', 'Hình thành kiến thức', 'minutes', round(45 * p_periods * 0.42), 'desc', 'HS khám phá theo nhóm với phiếu học tập, GV chốt kiến thức.', 'product', 'PBT – phần A'),
      jsonb_build_object('name', 'Luyện tập', 'minutes', round(45 * p_periods * 0.27), 'desc', 'HS làm bài tập áp dụng, đổi chéo kiểm tra.', 'product', 'PBT – phần B'),
      jsonb_build_object('name', 'Vận dụng', 'minutes', 45 * p_periods - round(45 * p_periods * 0.12) - round(45 * p_periods * 0.42) - round(45 * p_periods * 0.27), 'desc', 'HS liên hệ thực tế; GV tổng kết và giao nhiệm vụ về nhà.', 'product', 'Sản phẩm vận dụng')),
    'checks', jsonb_build_array(
      jsonb_build_object('tag', 'pass', 'text', 'Mã 2422 đúng lớp, 2 đến 4 mã, bám nội dung bài'),
      jsonb_build_object('tag', 'pass', 'text', 'Mục tiêu bài học phủ đủ yêu cầu của khung NLS'),
      jsonb_build_object('tag', 'pass', 'text', 'Không bài kiểm tra định kì, không điểm riêng'),
      jsonb_build_object('tag', 'warn', 'text', 'Hoạt động có AI: cần thêm bước nhắc HS khai báo khi sản phẩm dùng AI'),
      jsonb_build_object('tag', 'fixed', 'text', 'Bài nguồn bắt HS đăng nhập tài khoản: đã đổi thành GV thao tác'),
      jsonb_build_object('tag', 'pass', 'text', 'Công cụ nêu rõ độ tuổi, không đưa dữ liệu cá nhân của HS vào công cụ'),
      jsonb_build_object('tag', 'pass', 'text', 'Hình thức triển khai đúng lựa chọn'),
      jsonb_build_object('tag', 'warn', 'text', 'Video trong bài chưa có phương án khi mất mạng'))
  );
$$;
