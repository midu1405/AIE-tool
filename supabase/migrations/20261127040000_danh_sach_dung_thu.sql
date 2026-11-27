-- Giai đoạn dùng thử (Midu, 27/11): đã bật đăng nhập Google, nhưng trang Quyền riêng tư và Điều khoản còn là bản nháp, nên
-- chỉ cho tạo tài khoản mới với email @aiedu.com.vn hoặc email có trong danh sách dùng thử. Người khác bấm "Đăng nhập bằng
-- Google" bị từ chối trước khi tài khoản được tạo (không lưu gì về họ).
--
-- Cơ chế: Auth Hook "Before User Created" của Supabase gọi public.hook_truoc_khi_tao_tai_khoan(event). Hook chỉ chạy khi TẠO
-- tài khoản mới; người đã có tài khoản đăng nhập lại không bị ảnh hưởng. Bật/tắt hook ở Dashboard › Authentication › Hooks:
-- migration này chỉ tạo hàm, chưa bật. Khi mở cho mọi giáo viên (sau khi duyệt Quyền riêng tư, Điều khoản) thì tắt hook,
-- không cần xoá bảng.
--
-- Thêm người thử: insert into public.signup_allowlist (email, note) values ('ten@gmail.com', 'GV trường X');
-- (quản trị làm qua SQL editor, hoặc bằng tài khoản admin qua API).

create table public.signup_allowlist (
  email      text primary key check (email = lower(btrim(email)) and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  note       text not null default '',
  added_by   uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
comment on table public.signup_allowlist is
  'Email được tạo tài khoản trong giai đoạn dùng thử (ngoài @aiedu.com.vn). Dùng bởi hook_truoc_khi_tao_tai_khoan.';

alter table public.signup_allowlist enable row level security;
create policy "Quản trị xem danh sách dùng thử" on public.signup_allowlist
  for select to authenticated using ((select public.has_role('admin')));
create policy "Quản trị thêm vào danh sách dùng thử" on public.signup_allowlist
  for insert to authenticated with check ((select public.has_role('admin')));
create policy "Quản trị sửa danh sách dùng thử" on public.signup_allowlist
  for update to authenticated using ((select public.has_role('admin'))) with check ((select public.has_role('admin')));
create policy "Quản trị xoá khỏi danh sách dùng thử" on public.signup_allowlist
  for delete to authenticated using ((select public.has_role('admin')));
revoke all on public.signup_allowlist from anon;

-- security definer (chủ hàm là postgres) để đọc bảng mà không cần policy cho supabase_auth_admin; chỉ supabase_auth_admin
-- gọi được. Thông báo lỗi bắt đầu bằng "chua_duoc_moi:" để /auth/callback nhận ra và hiện lời nhắn tiếng Việt cố định.
create or replace function public.hook_truoc_khi_tao_tai_khoan(event jsonb)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  e text := lower(btrim(coalesce(event -> 'user' ->> 'email', '')));
begin
  if e like '%@aiedu.com.vn' or exists (select 1 from public.signup_allowlist where email = e) then
    return '{}'::jsonb;
  end if;
  return jsonb_build_object('error', jsonb_build_object(
    'http_code', 403,
    'message', 'chua_duoc_moi: Email này chưa có trong danh sách dùng thử của AI Edu Training Hub.'));
end $$;

revoke execute on function public.hook_truoc_khi_tao_tai_khoan(jsonb) from public, anon, authenticated;
do $$ begin
  grant execute on function public.hook_truoc_khi_tao_tai_khoan(jsonb) to supabase_auth_admin;
exception when undefined_object then null;  -- Postgres thử cục bộ không có vai trò này
end $$;
