-- Giấy chứng nhận hoàn thành khoá (đổi quyết định đã chốt 1, Midu 23/11/2026).
-- Cấp khi enrollments.completed_at có giá trị (xong mọi bước). Họ tên và tên khoá chụp lại lúc cấp, sau đó không đổi.
-- Trang xác minh công khai /chung-nhan/<mã> gọi verify_certificate(): chỉ trả họ tên, khoá, thời lượng, ngày (không email).

create table public.certificates (
  id            uuid primary key default gen_random_uuid(),
  code          text not null unique check (code ~ '^AIE-[0-9]{4}-[A-Z0-9]{6}$'),
  user_id       uuid not null references auth.users (id) on delete cascade,
  course_id     uuid not null references public.courses (id) on delete restrict,
  full_name     text not null check (char_length(full_name) between 2 and 80),
  course_title  text not null,
  course_slug   text not null,
  hours_min     numeric not null,
  hours_max     numeric not null,
  module_count  int not null,
  completed_at  timestamptz not null,
  issued_at     timestamptz not null default now(),
  revoked_at    timestamptz,
  revoked_by    uuid references auth.users (id),
  revoke_reason text
);
-- Mỗi người một giấy còn hiệu lực cho mỗi khoá. Giấy đã thu hồi (cấp nhầm, sai họ tên) không chặn việc cấp lại.
create unique index certificates_one_valid on public.certificates (user_id, course_id) where revoked_at is null;
alter table public.certificates enable row level security;

-- Người học xem giấy của mình; Academic lead và quản trị xem mọi giấy. Không ai ghi trực tiếp: chỉ qua các hàm bên dưới.
create policy certificates_read on public.certificates for select to authenticated
  using (user_id = (select auth.uid()) or public.has_role('content_manager'));

-- Mã dạng AIE-<năm>-XXXXXX, bỏ các ký tự dễ nhầm (0/O, 1/I/L).
create or replace function public.new_certificate_code()
returns text language plpgsql volatile set search_path = '' as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  s text := '';
begin
  for i in 1..6 loop
    s := s || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
  end loop;
  return 'AIE-' || to_char(now() at time zone 'Asia/Ho_Chi_Minh', 'YYYY') || '-' || s;
end $$;

-- Giáo viên đã hoàn thành khoá xác nhận họ tên rồi nhận giấy. Gọi lại khi đã có giấy còn hiệu lực thì trả giấy đó (họ tên không đổi).
create or replace function public.issue_certificate(p_course uuid, p_full_name text)
returns public.certificates language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  e public.enrollments;
  c public.courses;
  cert public.certificates;
  nm text := regexp_replace(btrim(coalesce(p_full_name, '')), '\s+', ' ', 'g');
begin
  if uid is null then raise exception 'Đăng nhập để nhận giấy chứng nhận.' using errcode = '42501'; end if;
  select * into cert from public.certificates where user_id = uid and course_id = p_course and revoked_at is null;
  if found then return cert; end if;
  select * into e from public.enrollments where user_id = uid and course_id = p_course;
  if not found or e.completed_at is null then
    raise exception 'Bạn cần hoàn thành mọi bước của khoá trước khi nhận giấy chứng nhận.' using errcode = '22023';
  end if;
  if array_length(regexp_split_to_array(nm, ' '), 1) < 2 or char_length(nm) > 80 then
    raise exception 'Nhập họ và tên đầy đủ (ít nhất 2 chữ, tối đa 80 ký tự).' using errcode = '22023';
  end if;
  select * into c from public.courses where id = p_course;
  for i in 1..5 loop
    begin
      insert into public.certificates (code, user_id, course_id, full_name, course_title, course_slug, hours_min, hours_max,
                                       module_count, completed_at)
      values (public.new_certificate_code(), uid, p_course, nm, c.title, c.slug, c.hours_min, c.hours_max,
              (select count(*) from public.course_modules where course_id = p_course), e.completed_at)
      returning * into cert;
      return cert;
    exception when unique_violation then
      -- Trùng mã (hiếm) thì thử mã khác; trùng (user, khoá) do bấm hai lần thì trả giấy đã có.
      select * into cert from public.certificates where user_id = uid and course_id = p_course and revoked_at is null;
      if found then return cert; end if;
    end;
  end loop;
  raise exception 'Chưa tạo được mã giấy chứng nhận. Thử lại sau ít phút.';
end $$;

-- Xác minh công khai (cả khách chưa đăng nhập). Không trả email, user_id hay lý do thu hồi.
create or replace function public.verify_certificate(p_code text)
returns table (code text, full_name text, course_title text, course_slug text, hours_min numeric, hours_max numeric,
               module_count int, completed_at timestamptz, issued_at timestamptz, revoked_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select c.code, c.full_name, c.course_title, c.course_slug, c.hours_min, c.hours_max, c.module_count,
         c.completed_at, c.issued_at, c.revoked_at
  from public.certificates c
  where c.code = upper(btrim(p_code));
$$;

-- Thu hồi (Academic lead, quản trị). Không xoá: trang xác minh báo "Đã thu hồi".
create or replace function public.revoke_certificate(p_code text, p_reason text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.has_role('content_manager') then
    raise exception 'Chỉ Academic lead hoặc quản trị được thu hồi giấy chứng nhận.' using errcode = '42501';
  end if;
  if coalesce(btrim(p_reason), '') = '' then raise exception 'Ghi lý do thu hồi.' using errcode = '22023'; end if;
  update public.certificates set revoked_at = now(), revoked_by = auth.uid(), revoke_reason = btrim(p_reason)
  where code = upper(btrim(p_code)) and revoked_at is null;
  if not found then raise exception 'Không tìm thấy giấy chứng nhận còn hiệu lực có mã %.', p_code using errcode = '22023'; end if;
end $$;

revoke all on function public.new_certificate_code() from public, anon, authenticated;
revoke all on function public.issue_certificate(uuid, text) from public, anon;
revoke all on function public.revoke_certificate(text, text) from public, anon;
grant execute on function public.issue_certificate(uuid, text) to authenticated;
grant execute on function public.revoke_certificate(text, text) to authenticated;
grant execute on function public.verify_certificate(text) to anon, authenticated;
-- Supabase mặc định cấp mọi quyền trên bảng mới cho anon/authenticated: thu lại, chỉ để authenticated đọc (RLS lọc).
revoke all on public.certificates from anon, authenticated;
grant select on public.certificates to authenticated;
