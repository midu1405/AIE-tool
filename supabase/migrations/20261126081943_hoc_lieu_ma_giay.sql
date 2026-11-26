-- Trả lời 3 câu chưa chốt ngày 26/11 (Midu chốt theo đề xuất của Claude công ty):
--   1. Học liệu (link KHBD/PBT gắn vào bước) chỉ dành cho người đã đăng ký khoá và nhân viên. Trước khi đăng ký,
--      trang chi tiết khoá chỉ hiện số lượng học liệu (course_material_counts), không hiện link.
--   2. Mã giấy chứng nhận mới dài 10 ký tự, chia nhóm AIE-<năm>-XXXX-XXXX-XX, sinh bằng bộ sinh ngẫu nhiên an toàn
--      (pgcrypto gen_random_bytes) thay cho random(). Giấy cũ mã 6 ký tự vẫn hợp lệ. Tra mã bỏ qua gạch và khoảng trắng.
--   3. Khoá đổi nội dung sau khi đã có người hoàn thành: giữ "Đã hoàn thành" và giấy (không mở lại khoá). Sửa lỗi xoá bước:
--      người đang học đã xong mọi bước còn lại thì được đánh dấu "Đã hoàn thành" ngay (trước đây kẹt ở 100%).

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------- 1. học liệu
create or replace function public.course_material_links(p_course_id uuid)
returns table (lesson_id uuid, material_id uuid, label text, kind public.doc_kind,
               title text, version_no int, web_view_link text)
language sql stable security definer set search_path = '' as $$
  select lm.lesson_id, lm.id, lm.label, d.kind, d.title, dv.version_no, dv.web_view_link
  from public.lesson_materials lm
  join public.course_lessons cl on cl.id = lm.lesson_id
  join public.course_sections cs on cs.id = cl.section_id
  join public.course_modules cm on cm.id = cs.module_id
  join public.courses c on c.id = cm.course_id
  join public.document_versions dv on dv.id = lm.document_version_id
  join public.documents d on d.id = dv.document_id
  where c.id = p_course_id
    and (public.is_staff()
         or (public.is_enrolled(c.id) and c.status in ('published', 'hidden')))
  order by cm.position, cs.position, cl.position, lm.position;
$$;

-- Số học liệu theo loại của một khoá đang xuất bản: cho trang chi tiết (cả khách xem) biết khoá kèm gì, không lộ link.
create or replace function public.course_material_counts(p_course_id uuid)
returns table (kind public.doc_kind, n int)
language sql stable security definer set search_path = '' as $$
  select d.kind, count(distinct d.id)::int
  from public.lesson_materials lm
  join public.course_lessons cl on cl.id = lm.lesson_id
  join public.course_modules cm on cm.id = cl.module_id
  join public.courses c on c.id = cm.course_id
  join public.documents d on d.id = lm.document_id
  where c.id = p_course_id and c.status = 'published'
  group by d.kind;
$$;
revoke execute on function public.course_material_counts(uuid) from public;
grant execute on function public.course_material_counts(uuid) to anon, authenticated;

-- ---------------------------------------------------------------- 2. mã giấy chứng nhận
-- Dạng chuẩn của mã người dùng gõ: bỏ gạch, khoảng trắng, viết hoa, rồi chia nhóm lại. Sai dạng trả null.
create or replace function public.canonical_certificate_code(p_code text)
returns text language sql immutable set search_path = '' as $$
  select case
    when s ~ '^AIE[0-9]{4}[A-Z0-9]{10}$' then 'AIE-' || substr(s, 4, 4) || '-' || substr(s, 8, 4) || '-' || substr(s, 12, 4) || '-' || substr(s, 16, 2)
    when s ~ '^AIE[0-9]{4}[A-Z0-9]{6}$' then 'AIE-' || substr(s, 4, 4) || '-' || substr(s, 8, 6)
  end
  from (select regexp_replace(upper(coalesce(p_code, '')), '[^A-Z0-9]', '', 'g') as s) x;
$$;

-- 10 ký tự từ 31 ký tự dễ đọc (bỏ 0, O, 1, I, L), khoảng 8×10^14 tổ hợp. Lấy byte ngẫu nhiên an toàn, bỏ byte ≥ 248
-- để mỗi ký tự có xác suất như nhau.
create or replace function public.new_certificate_code()
returns text language plpgsql volatile set search_path = '' as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  s text := '';
  b bytea;
  v int;
begin
  while length(s) < 10 loop
    b := extensions.gen_random_bytes(16);
    for i in 0..15 loop
      v := get_byte(b, i);
      if v < 248 and length(s) < 10 then
        s := s || substr(alphabet, 1 + v % 31, 1);
      end if;
    end loop;
  end loop;
  return 'AIE-' || to_char(now() at time zone 'Asia/Ho_Chi_Minh', 'YYYY') || '-'
         || substr(s, 1, 4) || '-' || substr(s, 5, 4) || '-' || substr(s, 9, 2);
end $$;
revoke all on function public.new_certificate_code() from public, anon, authenticated;
revoke all on function public.canonical_certificate_code(text) from public;
grant execute on function public.canonical_certificate_code(text) to anon, authenticated;

alter table public.certificates drop constraint certificates_code_check;
alter table public.certificates add constraint certificates_code_check
  check (code ~ '^AIE-[0-9]{4}-([A-Z0-9]{6}|[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{2})$');

create or replace function public.verify_certificate(p_code text)
returns table (code text, full_name text, course_title text, course_slug text, hours_min numeric, hours_max numeric,
               module_count int, completed_at timestamptz, issued_at timestamptz, revoked_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select c.code, c.full_name, c.course_title, c.course_slug, c.hours_min, c.hours_max, c.module_count,
         c.completed_at, c.issued_at, c.revoked_at
  from public.certificates c
  where c.code = public.canonical_certificate_code(p_code);
$$;

create or replace function public.revoke_certificate(p_code text, p_reason text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.has_role('content_manager') then
    raise exception 'Chỉ Academic lead hoặc quản trị được thu hồi giấy chứng nhận.' using errcode = '42501';
  end if;
  if coalesce(btrim(p_reason), '') = '' then
    raise exception 'Ghi lý do thu hồi.' using errcode = '22023';
  end if;
  update public.certificates set revoked_at = now(), revoked_by = auth.uid(), revoke_reason = btrim(p_reason)
  where code = public.canonical_certificate_code(p_code) and revoked_at is null;
  if not found then
    raise exception 'Không tìm thấy giấy chứng nhận còn hiệu lực có mã %.', p_code using errcode = '22023';
  end if;
end $$;

-- ---------------------------------------------------------------- 3. xoá bước không làm người học kẹt
-- Đặt completed_at cho người đã đăng ký mà đã xong mọi bước còn lại của khoá. Không bao giờ xoá completed_at
-- (thêm bước vào khoá thì người đã hoàn thành vẫn giữ "Đã hoàn thành" và giấy).
create or replace function public.recheck_course_completion(p_course uuid)
returns void language sql security definer set search_path = '' as $$
  update public.enrollments e set completed_at = now()
  where e.course_id = p_course and e.completed_at is null
    and exists (select 1 from public.course_lessons cl join public.course_modules cm on cm.id = cl.module_id
                where cm.course_id = p_course)
    and not exists (
      select 1 from public.course_lessons cl
      join public.course_modules cm on cm.id = cl.module_id
      where cm.course_id = p_course
        and not exists (select 1 from public.lesson_progress lp where lp.user_id = e.user_id and lp.lesson_id = cl.id));
$$;
revoke all on function public.recheck_course_completion(uuid) from public, anon, authenticated;

create or replace function public.course_lessons_after_delete()
returns trigger language plpgsql security definer set search_path = '' as $$
declare c uuid;
begin
  select course_id into c from public.course_modules where id = old.module_id;
  if c is not null then
    perform public.recheck_course_completion(c);
  end if;
  return null;
end $$;
create trigger course_lessons_after_delete after delete on public.course_lessons
  for each row execute function public.course_lessons_after_delete();

-- Xoá cả học phần: bước bị xoá theo dây chuyền khi học phần đã mất, nên kiểm lại theo khoá của học phần.
create or replace function public.course_modules_after_delete()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.courses where id = old.course_id) then
    perform public.recheck_course_completion(old.course_id);
  end if;
  return null;
end $$;
create trigger course_modules_after_delete after delete on public.course_modules
  for each row execute function public.course_modules_after_delete();
revoke execute on function public.course_lessons_after_delete(), public.course_modules_after_delete() from public, anon, authenticated;
