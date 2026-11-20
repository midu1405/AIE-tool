-- Khoá học trên trang giáo viên + học liệu gắn từ KHBD/PBT đã duyệt.
--
-- Chạy sau 20261120000000_core.sql: cần user_roles, has_role(), is_staff(),
-- documents và document_versions(status doc_status) từ phần lõi.
--
-- Quy tắc nghiệp vụ (chốt ngày 20/11/2026):
--   1. Chưa cấp chứng nhận ở bản đầu. Hoàn thành = enrollments.completed_at có giá trị.
--   2. Chỉ content_manager (Academic lead) được xuất bản hoặc ẩn khoá học và sửa khoá
--      đang xuất bản. khbd_editor chỉ tạo và sửa khoá ở trạng thái nháp.
--   3. KHBD/PBT gắn tay vào bài, đúng một phiên bản đã duyệt. Có bản mới đã duyệt thì
--      view lesson_material_updates báo để người quản lý chọn cập nhật.

do $$
begin
  if to_regclass('public.document_versions') is null or to_regclass('public.user_roles') is null then
    raise exception 'Thiếu phần lõi. Chạy 20261120000000_core.sql trước migration này.';
  end if;
end $$;

-- ---------------------------------------------------------------- học liệu gắn được
create or replace function public.is_attachable_status(s public.doc_status)
returns boolean language sql immutable as $$ select s = 'approved' $$;

-- ---------------------------------------------------------------- khoá học
create table public.courses (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title         text not null check (length(btrim(title)) > 0),
  summary       text not null default '',          -- mô tả ngắn trên thẻ khoá học
  description   text not null default '',          -- đoạn mở đầu ở trang chi tiết
  topic         text not null check (topic in ('ai', 'teach', 'safe', 'digital')),
  audiences     text[] not null default '{}' check (audiences <@ array['th', 'thcs', 'thpt', 'ql']::text[]),
  hours_min     numeric(4, 1) not null check (hours_min >= 0),
  hours_max     numeric(4, 1) not null,
  format        text not null check (format in ('self', 'guided')),
  level         text not null check (level in ('basic', 'advanced')),
  outcomes      text[] not null default '{}',      -- "Bạn sẽ học được gì"
  audience_note text not null default '',          -- "Dành cho ai"
  legal_basis   text not null default 'QĐ 2422/QĐ-BGDĐT',
  status        text not null default 'draft' check (status in ('draft', 'published', 'hidden')),
  published_at  timestamptz,
  published_by  uuid references auth.users (id),
  created_by    uuid default auth.uid() references auth.users (id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  check (hours_max >= hours_min)
);

create table public.course_modules (
  id         uuid primary key default gen_random_uuid(),
  course_id  uuid not null references public.courses (id) on delete cascade,
  position   int  not null check (position >= 0),
  title      text not null check (length(btrim(title)) > 0),
  created_at timestamptz not null default now(),
  constraint course_modules_order unique (course_id, position) deferrable initially deferred
);

create table public.course_lessons (
  id               uuid primary key default gen_random_uuid(),
  module_id        uuid not null references public.course_modules (id) on delete cascade,
  position         int  not null check (position >= 0),
  title            text not null check (length(btrim(title)) > 0),
  kind             text not null default 'reading' check (kind in ('video', 'reading', 'activity', 'quiz', 'download')),
  body             jsonb not null default '{}',
  duration_minutes int check (duration_minutes > 0),
  created_at       timestamptz not null default now(),
  constraint course_lessons_order unique (module_id, position) deferrable initially deferred
);

-- Học liệu: trỏ tới đúng một phiên bản KHBD/PBT. document_id do trigger điền,
-- để một bài không gắn hai phiên bản của cùng một tài liệu.
create table public.lesson_materials (
  id                  uuid primary key default gen_random_uuid(),
  lesson_id           uuid not null references public.course_lessons (id) on delete cascade,
  document_version_id uuid not null references public.document_versions (id) on delete restrict,
  document_id         uuid not null,
  label               text,
  position            int  not null default 0,
  attached_by         uuid default auth.uid() references auth.users (id),
  attached_at         timestamptz not null default now(),
  unique (lesson_id, document_id)
);

create table public.enrollments (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  course_id    uuid not null references public.courses (id) on delete cascade,
  enrolled_at  timestamptz not null default now(),
  completed_at timestamptz,
  unique (user_id, course_id)
);

-- Tab "Đã lưu" ở Khoá học của tôi.
create table public.saved_courses (
  user_id   uuid not null default auth.uid() references auth.users (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  saved_at  timestamptz not null default now(),
  primary key (user_id, course_id)
);

create table public.lesson_progress (
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  lesson_id    uuid not null references public.course_lessons (id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

create index on public.course_modules (course_id);
create index on public.course_lessons (module_id);
create index on public.lesson_materials (lesson_id);
create index on public.lesson_materials (document_id);
create index on public.enrollments (course_id);
create index on public.lesson_progress (lesson_id);

-- ---------------------------------------------------------------- hàm tra cứu
create or replace function public.course_of_module(m uuid)
returns uuid language sql stable security definer set search_path = '' as $$
  select course_id from public.course_modules where id = m;
$$;

create or replace function public.course_of_lesson(l uuid)
returns uuid language sql stable security definer set search_path = '' as $$
  select cm.course_id from public.course_lessons cl
  join public.course_modules cm on cm.id = cl.module_id where cl.id = l;
$$;

create or replace function public.course_visible(c uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_staff() or exists (select 1 from public.courses where id = c and status = 'published');
$$;

-- content_manager sửa mọi khoá; khbd_editor chỉ sửa khoá nháp.
create or replace function public.can_edit_course(c uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.has_role('content_manager')
      or (public.has_role('khbd_editor') and exists (select 1 from public.courses where id = c and status = 'draft'));
$$;

-- ---------------------------------------------------------------- trigger
create or replace function public.courses_guard()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' and new.status <> 'draft' and not public.has_role('content_manager') then
    raise exception 'Khoá học mới phải ở trạng thái nháp. Chỉ quản lý nội dung được xuất bản.' using errcode = '42501';
  end if;
  if tg_op = 'UPDATE' and new.status is distinct from old.status and not public.has_role('content_manager') then
    raise exception 'Chỉ quản lý nội dung được xuất bản hoặc ẩn khoá học.' using errcode = '42501';
  end if;
  if new.status = 'published' and (tg_op = 'INSERT' or old.status <> 'published') then
    new.published_at := now();
    new.published_by := auth.uid();
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger courses_guard before insert or update on public.courses
  for each row execute function public.courses_guard();

create or replace function public.lesson_materials_check_version()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v record;
begin
  select dv.document_id, dv.status into v from public.document_versions dv where dv.id = new.document_version_id;
  if not found then
    raise exception 'Không tìm thấy phiên bản tài liệu %', new.document_version_id;
  end if;
  if not public.is_attachable_status(v.status) then
    raise exception 'Chỉ gắn được phiên bản đã duyệt (phiên bản này đang ở trạng thái %).', v.status using errcode = '23514';
  end if;
  new.document_id := v.document_id;
  if tg_op = 'UPDATE' and new.document_version_id <> old.document_version_id then
    new.attached_by := auth.uid();
    new.attached_at := now();
  end if;
  return new;
end $$;
create trigger lesson_materials_check_version before insert or update of document_version_id on public.lesson_materials
  for each row execute function public.lesson_materials_check_version();

-- Học xong bài cuối cùng thì đánh dấu khoá "Đã hoàn thành".
create or replace function public.lesson_progress_complete_course()
returns trigger language plpgsql security definer set search_path = '' as $$
declare c uuid := public.course_of_lesson(new.lesson_id);
begin
  if not exists (
    select 1 from public.course_lessons cl
    join public.course_modules cm on cm.id = cl.module_id
    where cm.course_id = c
      and not exists (select 1 from public.lesson_progress lp where lp.user_id = new.user_id and lp.lesson_id = cl.id)
  ) then
    update public.enrollments set completed_at = coalesce(completed_at, now())
    where user_id = new.user_id and course_id = c;
  end if;
  return null;
end $$;
create trigger lesson_progress_complete_course after insert on public.lesson_progress
  for each row execute function public.lesson_progress_complete_course();

-- ---------------------------------------------------------------- view
-- Học liệu đang gắn bản cũ trong khi đã có bản mới hơn được duyệt.
create view public.lesson_material_updates with (security_invoker = true) as
select lm.id as material_id, lm.lesson_id, lm.document_id,
       cur.version_no as attached_version, latest.id as latest_version_id, latest.version_no as latest_version
from public.lesson_materials lm
join public.document_versions cur on cur.id = lm.document_version_id
join lateral (
  select dv.id, dv.version_no from public.document_versions dv
  where dv.document_id = lm.document_id and public.is_attachable_status(dv.status)
  order by dv.version_no desc limit 1
) latest on true
where latest.version_no > cur.version_no;

-- Tiến độ của người đang đăng nhập, dùng cho thẻ khoá học và Khoá học của tôi.
create view public.my_course_progress with (security_invoker = true) as
select e.course_id, e.enrolled_at, e.completed_at,
       count(cl.id) as lessons_total,
       count(lp.lesson_id) as lessons_done,
       case when count(cl.id) = 0 then 0 else round(100.0 * count(lp.lesson_id) / count(cl.id)) end as percent
from public.enrollments e
join public.course_modules cm on cm.course_id = e.course_id
join public.course_lessons cl on cl.module_id = cm.id
left join public.lesson_progress lp on lp.lesson_id = cl.id and lp.user_id = e.user_id
where e.user_id = (select auth.uid())
group by e.course_id, e.enrolled_at, e.completed_at;

-- ---------------------------------------------------------------- RLS
alter table public.courses          enable row level security;
alter table public.course_modules   enable row level security;
alter table public.course_lessons   enable row level security;
alter table public.lesson_materials enable row level security;
alter table public.enrollments      enable row level security;
alter table public.saved_courses    enable row level security;
alter table public.lesson_progress  enable row level security;

create policy "Xem khoá đã xuất bản, nhân viên xem hết" on public.courses
  for select to anon, authenticated using (status = 'published' or (select public.is_staff()));
create policy "Nhân viên nội dung tạo khoá" on public.courses
  for insert to authenticated with check ((select public.has_role('content_manager')) or (select public.has_role('khbd_editor')));
create policy "Sửa khoá theo vai trò" on public.courses
  for update to authenticated using (public.can_edit_course(id))
  with check ((select public.has_role('content_manager')) or (select public.has_role('khbd_editor')));
create policy "Quản lý nội dung xoá khoá chưa xuất bản" on public.courses
  for delete to authenticated using ((select public.has_role('content_manager')) and status <> 'published');

create policy "Xem học phần của khoá được xem" on public.course_modules
  for select to anon, authenticated using (public.course_visible(course_id));
create policy "Sửa học phần" on public.course_modules
  for all to authenticated using (public.can_edit_course(course_id)) with check (public.can_edit_course(course_id));

create policy "Xem bài của khoá được xem" on public.course_lessons
  for select to anon, authenticated using (public.course_visible(public.course_of_module(module_id)));
create policy "Sửa bài" on public.course_lessons
  for all to authenticated using (public.can_edit_course(public.course_of_module(module_id)))
  with check (public.can_edit_course(public.course_of_module(module_id)));

create policy "Xem học liệu của khoá được xem" on public.lesson_materials
  for select to authenticated using (public.course_visible(public.course_of_lesson(lesson_id)));
create policy "Gắn, đổi, gỡ học liệu" on public.lesson_materials
  for all to authenticated using (public.can_edit_course(public.course_of_lesson(lesson_id)))
  with check (public.can_edit_course(public.course_of_lesson(lesson_id)));

create policy "Xem đăng ký của mình, quản lý xem hết" on public.enrollments
  for select to authenticated using (user_id = (select auth.uid()) or (select public.has_role('content_manager')));
create policy "Tự đăng ký khoá đã xuất bản" on public.enrollments
  for insert to authenticated with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.courses c where c.id = course_id and c.status = 'published'));
create policy "Tự huỷ đăng ký" on public.enrollments
  for delete to authenticated using (user_id = (select auth.uid()));

create policy "Danh sách lưu của mình" on public.saved_courses
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "Xem tiến độ của mình" on public.lesson_progress
  for select to authenticated using (user_id = (select auth.uid()));
create policy "Đánh dấu xong bài của khoá đã đăng ký" on public.lesson_progress
  for insert to authenticated with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.enrollments e
                where e.user_id = (select auth.uid()) and e.course_id = public.course_of_lesson(lesson_id)));
create policy "Bỏ đánh dấu bài" on public.lesson_progress
  for delete to authenticated using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------- link học liệu cho giáo viên
-- Giáo viên không đọc trực tiếp document_versions (bảng có job, spec, nguồn). Hàm này chỉ trả
-- những cột cần để mở học liệu, và chỉ cho bản đang gắn vào khoá đã xuất bản
-- (nhân viên xem được cả khoá nháp để xem trước).
create or replace function public.course_material_links(p_course_id uuid)
returns table (lesson_id uuid, material_id uuid, label text, kind public.doc_kind,
               title text, version_no int, web_view_link text)
language sql stable security definer set search_path = '' as $$
  select lm.lesson_id, lm.id, lm.label, d.kind, d.title, dv.version_no, dv.web_view_link
  from public.lesson_materials lm
  join public.course_lessons cl on cl.id = lm.lesson_id
  join public.course_modules cm on cm.id = cl.module_id
  join public.courses c on c.id = cm.course_id
  join public.document_versions dv on dv.id = lm.document_version_id
  join public.documents d on d.id = dv.document_id
  where c.id = p_course_id
    and (c.status = 'published' or public.is_staff())
    and (select auth.uid()) is not null
  order by cm.position, cl.position, lm.position;
$$;
revoke execute on function public.course_material_links(uuid) from public, anon;
grant execute on function public.course_material_links(uuid) to authenticated;

-- Bảng certificates thêm ở migration sau, khi công ty chốt mẫu chứng nhận.
