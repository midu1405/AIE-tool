-- Giai đoạn 3: tiện ích cho màn Quản lý khoá học.
-- Đổi thứ tự học phần / bài cần đổi chỗ hai dòng trong một giao dịch (unique deferrable trên position),
-- nên làm bằng hàm. Hàm chạy với quyền người gọi (security invoker): RLS của course_modules / course_lessons
-- vẫn quyết định ai được sửa.

create or replace function public.move_course_item(p_kind text, p_id uuid, p_dir int)
returns void language plpgsql set search_path = '' as $$
declare
  cur record;
  other record;
  n int;
begin
  if p_dir not in (-1, 1) then raise exception 'Hướng di chuyển không hợp lệ.'; end if;
  if p_kind = 'module' then
    select id, course_id as parent, position into cur from public.course_modules where id = p_id;
    if not found then raise exception 'Không tìm thấy học phần.'; end if;
    select id, position into other from public.course_modules
      where course_id = cur.parent and (case when p_dir < 0 then position < cur.position else position > cur.position end)
      order by case when p_dir < 0 then -position else position end limit 1;
    if not found then return; end if;
    update public.course_modules set position = other.position where id = cur.id;
    get diagnostics n = row_count;
    update public.course_modules set position = cur.position where id = other.id;
  elsif p_kind = 'lesson' then
    select id, module_id as parent, position into cur from public.course_lessons where id = p_id;
    if not found then raise exception 'Không tìm thấy bài.'; end if;
    select id, position into other from public.course_lessons
      where module_id = cur.parent and (case when p_dir < 0 then position < cur.position else position > cur.position end)
      order by case when p_dir < 0 then -position else position end limit 1;
    if not found then return; end if;
    update public.course_lessons set position = other.position where id = cur.id;
    get diagnostics n = row_count;
    update public.course_lessons set position = cur.position where id = other.id;
  else
    raise exception 'Loại không hợp lệ: %', p_kind;
  end if;
  if n = 0 then
    raise exception 'Bạn không sửa được khoá này. Khoá đã xuất bản chỉ Academic lead sửa được.' using errcode = '42501';
  end if;
end $$;

revoke execute on function public.move_course_item(text, uuid, int) from public, anon;
grant execute on function public.move_course_item(text, uuid, int) to authenticated;

-- Danh sách quản lý: mỗi khoá kèm số học phần, số bài, số học liệu, số học liệu có bản mới, số người học.
create view public.course_admin_list with (security_invoker = true) as
select c.id, c.slug, c.title, c.status, c.topic, c.audiences, c.hours_min, c.hours_max, c.format, c.level, c.updated_at,
       (select count(*) from public.course_modules m where m.course_id = c.id) as module_count,
       (select count(*) from public.course_lessons l join public.course_modules m on m.id = l.module_id where m.course_id = c.id) as lesson_count,
       (select count(*) from public.lesson_materials lm join public.course_lessons l on l.id = lm.lesson_id
          join public.course_modules m on m.id = l.module_id where m.course_id = c.id) as material_count,
       (select count(*) from public.lesson_material_updates u join public.course_lessons l on l.id = u.lesson_id
          join public.course_modules m on m.id = l.module_id where m.course_id = c.id) as update_count,
       (select count(*) from public.enrollments e where e.course_id = c.id) as learner_count
from public.courses c;
