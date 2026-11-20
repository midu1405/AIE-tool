-- Siết quyền theo Supabase security advisor (20/11/2026).
-- 1. Hàm trigger không cần gọi qua API: thu quyền EXECUTE của public/anon/authenticated (trigger vẫn chạy).
-- 2. Cố định search_path cho hàm còn thiếu.
-- 3. next_version_no chỉ worker (service role) gọi.
-- Còn giữ có chủ đích: has_role, is_staff, can_edit_course, course_visible, course_of_module,
-- course_of_lesson phải để anon/authenticated gọi được vì policy RLS dùng chúng; chúng chỉ trả
-- boolean hoặc id khoá học. course_material_links dành cho giáo viên đã đăng nhập.

revoke execute on function public.handle_new_user()                 from public, anon, authenticated;
revoke execute on function public.user_roles_staff_domain()         from public, anon, authenticated;
revoke execute on function public.courses_guard()                   from public, anon, authenticated;
revoke execute on function public.lesson_materials_check_version()  from public, anon, authenticated;
revoke execute on function public.lesson_progress_complete_course() from public, anon, authenticated;

alter function public.is_attachable_status(public.doc_status) set search_path = '';
alter function public.next_version_no(uuid) set search_path = public;
revoke execute on function public.next_version_no(uuid) from public, anon, authenticated;
