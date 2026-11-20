-- Khung khoá học 3 tầng: Học phần → Phần → Bước (tham khảo Raspberry Pi Training Hub).
-- Quyết định đã chốt 5 trong CLAUDE.md. Bản mẫu: Detail, HocBuoc, SoanNoiDung.
--
-- "Bước" dùng lại bảng course_lessons (lesson_progress, lesson_materials vẫn trỏ vào đó).
--   * course_sections: tầng Phần trong học phần.
--   * course_lessons.section_id: bước thuộc phần nào; module_id do trigger điền theo phần.
--     Thứ tự bước tính trong phần (unique section_id, position).
--   * course_lessons.kind đổi sang: doc, video, quiz, reflect, end. Cột body cũ không dùng nữa.
--   * course_lessons.ready: người soạn đánh dấu "Sẵn sàng".
--   * lesson_contents: nội dung bước, chỉ người đã đăng ký khoá (và nhân viên) đọc được.
--   * quiz_keys: đáp án và giải thích, chỉ nhân viên đọc; giáo viên nộp bài qua submit_quiz().
--   * quiz_attempts, reflections: kết quả quiz và câu trả lời phản tư. Người phụ trách khoá xem được.
--   * courses.prerequisites, courses.materials_needed: "Cần có trước khi học", "Cần chuẩn bị".
-- Quiz đạt khi đúng ít nhất 80% số câu (làm tròn lên). Bước quiz chỉ tính xong khi đạt;
-- bước phản tư chỉ tính xong khi đã lưu câu trả lời.

-- ---------------------------------------------------------------- khoá: hai mục mới ở trang chi tiết
alter table public.courses
  add column prerequisites    text[] not null default '{}',
  add column materials_needed text[] not null default '{}';

-- ---------------------------------------------------------------- tầng Phần
create table public.course_sections (
  id         uuid primary key default gen_random_uuid(),
  module_id  uuid not null references public.course_modules (id) on delete cascade,
  position   int  not null check (position >= 0),
  title      text not null check (length(btrim(title)) > 0),
  created_at timestamptz not null default now(),
  constraint course_sections_order unique (module_id, position) deferrable initially deferred
);
create index on public.course_sections (module_id);

-- Mỗi học phần cũ có một phần "Nội dung" chứa các bài cũ.
insert into public.course_sections (module_id, position, title)
select id, 0, 'Nội dung' from public.course_modules;

-- ---------------------------------------------------------------- bước
alter table public.course_lessons drop constraint course_lessons_kind_check;
update public.course_lessons set kind = case kind
  when 'video' then 'video' when 'quiz' then 'quiz' when 'activity' then 'reflect' else 'doc' end;
alter table public.course_lessons
  alter column kind set default 'doc',
  add constraint course_lessons_kind_check check (kind in ('doc', 'video', 'quiz', 'reflect', 'end')),
  add column section_id uuid references public.course_sections (id) on delete cascade,
  add column ready boolean not null default false;

update public.course_lessons cl set section_id = cs.id
from public.course_sections cs where cs.module_id = cl.module_id;
alter table public.course_lessons alter column section_id set not null;

alter table public.course_lessons drop constraint course_lessons_order;
alter table public.course_lessons
  add constraint course_lessons_order unique (section_id, position) deferrable initially deferred;
create index on public.course_lessons (section_id);

comment on column public.course_lessons.body is 'Không dùng nữa (từ 20261120081713_course_steps). Nội dung bước ở lesson_contents.';

-- module_id luôn theo phần. Thêm bước không ghi phần (dữ liệu mẫu cũ, code cũ) thì vào phần đầu
-- của học phần, chưa có thì tạo phần "Nội dung".
create or replace function public.course_lessons_sync_section()
returns trigger language plpgsql security definer set search_path = '' as $$
declare s uuid;
begin
  if new.section_id is null then
    if new.module_id is null then
      raise exception 'Bước phải thuộc một phần.' using errcode = '23502';
    end if;
    select id into s from public.course_sections where module_id = new.module_id order by position limit 1;
    if s is null then
      insert into public.course_sections (module_id, position, title) values (new.module_id, 0, 'Nội dung') returning id into s;
    end if;
    new.section_id := s;
  end if;
  select module_id into new.module_id from public.course_sections where id = new.section_id;
  return new;
end $$;
create trigger course_lessons_sync_section before insert or update of section_id, module_id on public.course_lessons
  for each row execute function public.course_lessons_sync_section();
revoke execute on function public.course_lessons_sync_section() from public, anon, authenticated;

-- ---------------------------------------------------------------- hàm tra cứu
create or replace function public.course_of_section(s uuid)
returns uuid language sql stable security definer set search_path = '' as $$
  select cm.course_id from public.course_sections cs join public.course_modules cm on cm.id = cs.module_id where cs.id = s;
$$;

-- Người phụ trách khoá: nhân viên soạn hoặc quản lý khoá học (admin ngầm có).
create or replace function public.is_course_staff()
returns boolean language sql stable security definer set search_path = '' as $$
  select public.has_role('content_manager') or public.has_role('khbd_editor');
$$;

create or replace function public.is_enrolled(c uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.enrollments where user_id = (select auth.uid()) and course_id = c);
$$;

-- ---------------------------------------------------------------- nội dung bước
-- body theo loại bước:
--   doc:     { text }                     (Markdown rút gọn: ## tiêu đề, - danh sách, [Gợi ý khi dạy] …)
--   video:   { url, intro, watch, transcript, captions }
--   quiz:    { questions: [{ text, options: [text] }] }   (đáp án ở quiz_keys)
--   reflect: { prompt, hints, allow_link }
--   end:     { message }
create table public.lesson_contents (
  lesson_id  uuid primary key references public.course_lessons (id) on delete cascade,
  body       jsonb not null default '{}',
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid() references auth.users (id)
);

create table public.quiz_keys (
  lesson_id uuid primary key references public.course_lessons (id) on delete cascade,
  answers   int[]  not null default '{}',   -- vị trí lựa chọn đúng của từng câu (đếm từ 0)
  explains  text[] not null default '{}'    -- giải thích từng câu, hiện sau khi nộp
);

create table public.quiz_attempts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  lesson_id  uuid not null references public.course_lessons (id) on delete cascade,
  answers    int[] not null,
  correct    int  not null,
  total      int  not null,
  passed     boolean not null,
  created_at timestamptz not null default now()
);
create index on public.quiz_attempts (lesson_id, user_id);

create table public.reflections (
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  lesson_id  uuid not null references public.course_lessons (id) on delete cascade,
  answer     text not null check (length(btrim(answer)) > 0),
  link       text not null default '' check (link = '' or link ~* '^https?://'),
  updated_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);
create index on public.reflections (lesson_id);

create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end $$;
create trigger lesson_contents_touch before update on public.lesson_contents for each row execute function public.touch_updated_at();
create trigger reflections_touch before update on public.reflections for each row execute function public.touch_updated_at();
revoke execute on function public.touch_updated_at() from public, anon, authenticated;

-- ---------------------------------------------------------------- nộp quiz
-- Chấm ở database để giáo viên không đọc được đáp án trước khi nộp. Đạt (≥ 80%) thì ghi lesson_progress.
create or replace function public.submit_quiz(p_lesson uuid, p_answers int[])
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  c uuid := public.course_of_lesson(p_lesson);
  k public.quiz_keys;
  n int;
  ok int := 0;
  pass boolean;
  i int;
begin
  if (select auth.uid()) is null then raise exception 'Bạn cần đăng nhập để nộp bài.' using errcode = '42501'; end if;
  if c is null or (select kind from public.course_lessons where id = p_lesson) <> 'quiz' then
    raise exception 'Không tìm thấy bài quiz.';
  end if;
  if not public.is_enrolled(c) and not public.is_course_staff() then
    raise exception 'Bạn cần đăng ký khoá học trước khi làm quiz.' using errcode = '42501';
  end if;
  select * into k from public.quiz_keys where lesson_id = p_lesson;
  n := coalesce(array_length(k.answers, 1), 0);
  if n = 0 then raise exception 'Quiz này chưa có đáp án. Báo người phụ trách khoá.'; end if;
  if coalesce(array_length(p_answers, 1), 0) <> n then
    raise exception 'Cần trả lời đủ % câu.', n using errcode = '22023';
  end if;
  for i in 1..n loop
    if p_answers[i] = k.answers[i] then ok := ok + 1; end if;
  end loop;
  pass := ok >= ceil(n * 0.8);
  insert into public.quiz_attempts (user_id, lesson_id, answers, correct, total, passed)
    values ((select auth.uid()), p_lesson, p_answers, ok, n, pass);
  if pass and public.is_enrolled(c) then
    insert into public.lesson_progress (user_id, lesson_id) values ((select auth.uid()), p_lesson) on conflict do nothing;
  end if;
  return jsonb_build_object('correct', ok, 'total', n, 'passed', pass, 'need', ceil(n * 0.8)::int,
                            'answers', to_jsonb(k.answers), 'explains', to_jsonb(k.explains));
end $$;
revoke execute on function public.submit_quiz(uuid, int[]) from public, anon;
grant execute on function public.submit_quiz(uuid, int[]) to authenticated;

-- ---------------------------------------------------------------- đánh dấu xong bước
-- Bước đọc, video, tổng kết: giáo viên tự đánh dấu. Quiz: chỉ qua submit_quiz. Phản tư: phải có câu trả lời.
create or replace function public.can_mark_lesson(l uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_enrolled(public.course_of_lesson(l))
     and case (select kind from public.course_lessons where id = l)
           when 'quiz' then false
           when 'reflect' then exists (select 1 from public.reflections r where r.lesson_id = l and r.user_id = (select auth.uid()))
           else true
         end;
$$;

drop policy "Đánh dấu xong bài của khoá đã đăng ký" on public.lesson_progress;
create policy "Đánh dấu xong bước của khoá đã đăng ký" on public.lesson_progress
  for insert to authenticated with check (user_id = (select auth.uid()) and public.can_mark_lesson(lesson_id));
create policy "Người phụ trách khoá xem tiến độ" on public.lesson_progress
  for select to authenticated using ((select public.is_course_staff()));

-- ---------------------------------------------------------------- hàm cũ: thêm tầng Phần
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
    and (c.status = 'published' or public.is_staff())
    and (select auth.uid()) is not null
  order by cm.position, cs.position, cl.position, lm.position;
$$;

-- Đổi chỗ với dòng kề: học phần trong khoá, phần trong học phần, bước trong phần.
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
  elsif p_kind = 'section' then
    select id, module_id as parent, position into cur from public.course_sections where id = p_id;
    if not found then raise exception 'Không tìm thấy phần.'; end if;
    select id, position into other from public.course_sections
      where module_id = cur.parent and (case when p_dir < 0 then position < cur.position else position > cur.position end)
      order by case when p_dir < 0 then -position else position end limit 1;
    if not found then return; end if;
    update public.course_sections set position = other.position where id = cur.id;
    get diagnostics n = row_count;
    update public.course_sections set position = cur.position where id = other.id;
  elsif p_kind = 'lesson' then
    select id, section_id as parent, position into cur from public.course_lessons where id = p_id;
    if not found then raise exception 'Không tìm thấy bước.'; end if;
    select id, position into other from public.course_lessons
      where section_id = cur.parent and (case when p_dir < 0 then position < cur.position else position > cur.position end)
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

-- ---------------------------------------------------------------- RLS
alter table public.course_sections  enable row level security;
alter table public.lesson_contents  enable row level security;
alter table public.quiz_keys        enable row level security;
alter table public.quiz_attempts    enable row level security;
alter table public.reflections      enable row level security;

create policy "Xem phần của khoá được xem" on public.course_sections
  for select to anon, authenticated using (public.course_visible(public.course_of_module(module_id)));
create policy "Sửa phần" on public.course_sections
  for all to authenticated using (public.can_edit_course(public.course_of_module(module_id)))
  with check (public.can_edit_course(public.course_of_module(module_id)));

-- Nội dung bước: người đã đăng ký khoá đang xuất bản, hoặc nhân viên (xem trước khoá nháp).
create policy "Xem nội dung bước khi đã đăng ký" on public.lesson_contents
  for select to authenticated using (
    (select public.is_staff())
    or (public.is_enrolled(public.course_of_lesson(lesson_id))
        and exists (select 1 from public.courses c where c.id = public.course_of_lesson(lesson_id) and c.status = 'published')));
create policy "Soạn nội dung bước" on public.lesson_contents
  for all to authenticated using (public.can_edit_course(public.course_of_lesson(lesson_id)))
  with check (public.can_edit_course(public.course_of_lesson(lesson_id)));

create policy "Nhân viên xem đáp án" on public.quiz_keys
  for select to authenticated using ((select public.is_staff()));
create policy "Soạn đáp án" on public.quiz_keys
  for all to authenticated using (public.can_edit_course(public.course_of_lesson(lesson_id)))
  with check (public.can_edit_course(public.course_of_lesson(lesson_id)));

-- Kết quả quiz chỉ ghi qua submit_quiz (không có policy insert).
create policy "Xem kết quả quiz của mình, người phụ trách xem hết" on public.quiz_attempts
  for select to authenticated using (user_id = (select auth.uid()) or (select public.is_course_staff()));

create policy "Xem phản tư của mình, người phụ trách xem hết" on public.reflections
  for select to authenticated using (user_id = (select auth.uid()) or (select public.is_course_staff()));
create policy "Viết phản tư khi đã đăng ký" on public.reflections
  for insert to authenticated with check (
    user_id = (select auth.uid())
    and public.is_enrolled(public.course_of_lesson(lesson_id))
    and (select kind from public.course_lessons where id = lesson_id) = 'reflect');
create policy "Sửa phản tư của mình" on public.reflections
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Hàm tra cứu dùng trong policy: gọi được qua API nhưng chỉ trả boolean/id (như các hàm ở hardening).
revoke execute on function public.course_of_section(uuid), public.is_course_staff(), public.is_enrolled(uuid),
  public.can_mark_lesson(uuid) from public;
grant execute on function public.course_of_section(uuid), public.is_course_staff(), public.is_enrolled(uuid),
  public.can_mark_lesson(uuid) to anon, authenticated;
