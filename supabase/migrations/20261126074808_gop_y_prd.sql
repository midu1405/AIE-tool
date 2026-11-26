-- Sửa theo góp ý PRD ngày 26/11/2026 (docs/prd-usecase.md, mục P1–P4, B7). Midu chốt cùng ngày.
--   P1. Khoá minh hoạ (courses.is_demo): vẫn hiện ở danh mục và trang chi tiết để giao diện có dữ liệu,
--       nhưng không đăng ký được và không cấp giấy. issue_certificate chỉ cấp khi khoá đủ điều kiện
--       xuất bản (course_problems rỗng).
--   P2. submit_quiz: chưa đạt chỉ trả đúng/sai từng câu; đạt rồi mới trả đáp án và giải thích.
--   P3. Đổi trạng thái sang "đã xuất bản" chạy lại các mục đỏ của danh sách tự kiểm ở database
--       (trước đây chỉ kiểm trên giao diện). Khoá minh hoạ được miễn.
--   P4. Không ai chèn thẳng generation_jobs (mọi job đi qua hàm có kiểm tra, gồm job PBT sau này);
--       không xoá được khoá đã có người học, kể cả khoá đã ẩn.
--   B7. Khoá đã ẩn: người mới không thấy; người đã đăng ký vẫn thấy, học tiếp và nhận giấy.

-- ---------------------------------------------------------------- P1: khoá minh hoạ
alter table public.courses add column is_demo boolean not null default false;
comment on column public.courses.is_demo is
  'Khoá minh hoạ: hiện ở danh mục cho giao diện có dữ liệu, không đăng ký và không cấp giấy chứng nhận.';
update public.courses set is_demo = true
where slug in ('hieu-biet-ai', 'gd-ai-thcs', 'gd-ai-th', 'gd-ai-thpt', 'teachable-machine', 'prompt-gv',
               'an-toan-ai', 'nang-luc-so', 'soan-khbd-ai');

-- ---------------------------------------------------------------- P3: danh sách tự kiểm ở database
-- Cùng các mục "bad" của readinessChecks trong lib/steps.ts. Đổi một bên thì đổi cả bên kia.
create or replace function public.quiz_complete(b jsonb, a int[], e text[])
returns boolean language sql immutable set search_path = '' as $$
  select case when jsonb_typeof(b -> 'questions') = 'array' and jsonb_array_length(b -> 'questions') > 0 then
    not exists (
      select 1 from jsonb_array_elements(b -> 'questions') with ordinality q(v, n) cross join lateral (select q.n::int as i) ix
      where btrim(coalesce(q.v ->> 'text', '')) = ''
         or jsonb_typeof(q.v -> 'options') is distinct from 'array'
         or (select count(*) from jsonb_array_elements_text(q.v -> 'options') o where btrim(o) <> '') < 2
         or a[ix.i] is null or a[ix.i] < 0
         or btrim(coalesce(q.v -> 'options' ->> a[ix.i], '')) = ''
         or btrim(coalesce(e[ix.i], '')) = '')
  else false end;
$$;

create or replace function public.course_info_problems(p_title text, p_summary text, p_description text,
                                                       p_audience_note text, p_outcomes text[])
returns text[] language sql immutable set search_path = '' as $$
  select array_remove(array[
    case when btrim(p_title) = '' or btrim(p_summary) = '' or btrim(p_description) = '' or btrim(p_audience_note) = ''
      then 'Thông tin trang khoá còn thiếu tên, tóm tắt, giới thiệu hoặc “Dành cho ai”.' end,
    case when (select count(*) from unnest(p_outcomes) x where btrim(x) <> '') not between 3 and 6
      then '“Bạn sẽ học được gì” cần 3–6 ý.' end
  ], null);
$$;

-- Các mục đỏ về nội dung (học phần, phần, bước). Rỗng = đủ điều kiện xuất bản và cấp giấy.
create or replace function public.course_content_problems(p_course uuid)
returns text[] language plpgsql stable security definer set search_path = '' as $$
declare
  out text[] := '{}';
  r record;
begin
  if not exists (select 1 from public.course_modules where course_id = p_course)
     or exists (select 1 from public.course_modules m where m.course_id = p_course
                and not exists (select 1 from public.course_sections s where s.module_id = m.id))
     or exists (select 1 from public.course_sections s join public.course_modules m on m.id = s.module_id
                where m.course_id = p_course and not exists (select 1 from public.course_lessons l where l.section_id = s.id)) then
    out := out || 'Mỗi học phần cần ít nhất một phần, mỗi phần cần ít nhất một bước.'::text;
  end if;
  select count(*) filter (where not l.ready) as nhap,
         count(*) filter (where (l.kind = 'doc' and btrim(coalesce(lc.body ->> 'text', '')) = '')
                             or (l.kind = 'reflect' and btrim(coalesce(lc.body ->> 'prompt', '')) = '')) as trong,
         count(*) filter (where l.kind = 'quiz' and not public.quiz_complete(lc.body, k.answers, k.explains)) as quiz,
         count(*) filter (where l.kind = 'video' and (coalesce(lc.body ->> 'url', '') !~* '^https?://[^\s<>"]+$'
                                                      or btrim(coalesce(lc.body ->> 'transcript', '')) = '')) as video
    into r
  from public.course_lessons l
  join public.course_modules m on m.id = l.module_id
  left join public.lesson_contents lc on lc.lesson_id = l.id
  left join public.quiz_keys k on k.lesson_id = l.id
  where m.course_id = p_course;
  if r.nhap > 0 then out := out || format('%s bước chưa “Sẵn sàng”.', r.nhap); end if;
  if r.trong > 0 then out := out || format('%s bài đọc hoặc câu hỏi phản tư còn trống.', r.trong); end if;
  if r.quiz > 0 then out := out || format('%s quiz thiếu câu hỏi, đáp án đúng hoặc giải thích.', r.quiz); end if;
  if r.video > 0 then out := out || format('%s video thiếu link hoặc bản ghi lời.', r.video); end if;
  return out;
end $$;

create or replace function public.course_problems(p_course uuid)
returns text[] language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select public.course_info_problems(c.title, c.summary, c.description, c.audience_note, c.outcomes)
            || public.course_content_problems(c.id)
     from public.courses c where c.id = p_course),
    array['Không tìm thấy khoá học.']);
$$;

create or replace function public.courses_guard()
returns trigger language plpgsql security definer set search_path = '' as $$
declare p text[];
begin
  if tg_op = 'INSERT' and new.status <> 'draft' and not public.has_role('content_manager') then
    raise exception 'Khoá học mới phải ở trạng thái nháp. Chỉ quản lý nội dung được xuất bản.' using errcode = '42501';
  end if;
  if tg_op = 'UPDATE' and new.status is distinct from old.status and not public.has_role('content_manager') then
    raise exception 'Chỉ quản lý nội dung được xuất bản hoặc ẩn khoá học.' using errcode = '42501';
  end if;
  if new.is_demo and (tg_op = 'INSERT' or not old.is_demo) and not public.has_role('content_manager') then
    raise exception 'Chỉ quản lý nội dung được đánh dấu khoá minh hoạ.' using errcode = '42501';
  end if;
  if new.status = 'published' and (tg_op = 'INSERT' or old.status <> 'published') then
    if not new.is_demo then
      if tg_op = 'INSERT' then
        raise exception 'Tạo khoá ở trạng thái nháp, soạn đủ nội dung rồi mới xuất bản.' using errcode = '23514';
      end if;
      p := public.course_info_problems(new.title, new.summary, new.description, new.audience_note, new.outcomes)
           || public.course_content_problems(new.id);
      if cardinality(p) > 0 then
        raise exception 'Chưa xuất bản được: %', array_to_string(p, ' ')
          using errcode = '23514', hint = 'Mở tab “Kiểm tra trước khi xuất bản” để xem và sửa từng mục.';
      end if;
    end if;
    new.published_at := now();
    new.published_by := auth.uid();
  end if;
  new.updated_at := now();
  return new;
end $$;

-- ---------------------------------------------------------------- B7: khoá ẩn vẫn mở cho người đã đăng ký
create or replace function public.course_visible(c uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_staff()
      or exists (select 1 from public.courses
                 where id = c and (status = 'published' or (status = 'hidden' and public.is_enrolled(c))));
$$;

drop policy "Xem khoá đã xuất bản, nhân viên xem hết" on public.courses;
create policy "Xem khoá xuất bản, khoá ẩn đã đăng ký" on public.courses
  for select to anon, authenticated
  using (status = 'published' or (select public.is_staff()) or (status = 'hidden' and public.is_enrolled(id)));

drop policy "Xem nội dung bước khi đã đăng ký" on public.lesson_contents;
create policy "Xem nội dung bước khi đã đăng ký" on public.lesson_contents
  for select to authenticated using (
    (select public.is_staff())
    or (public.is_enrolled(public.course_of_lesson(lesson_id))
        and exists (select 1 from public.courses c
                    where c.id = public.course_of_lesson(lesson_id) and c.status in ('published', 'hidden'))));

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
    and (c.status = 'published' or public.is_staff() or (c.status = 'hidden' and public.is_enrolled(c.id)))
    and (select auth.uid()) is not null
  order by cm.position, cs.position, cl.position, lm.position;
$$;

-- ---------------------------------------------------------------- P1: đăng ký và cấp giấy
drop policy "Tự đăng ký khoá đã xuất bản" on public.enrollments;
create policy "Tự đăng ký khoá xuất bản, trừ minh hoạ" on public.enrollments
  for insert to authenticated with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.courses c where c.id = course_id and c.status = 'published' and not c.is_demo));

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
  select * into c from public.courses where id = p_course;
  if c.is_demo or c.status = 'draft' or cardinality(public.course_problems(p_course)) > 0 then
    raise exception 'Khoá này chưa đủ nội dung để cấp giấy chứng nhận. AI Edu sẽ báo khi khoá hoàn thiện.'
      using errcode = '22023';
  end if;
  if array_length(regexp_split_to_array(nm, ' '), 1) < 2 or char_length(nm) > 80 then
    raise exception 'Nhập họ và tên đầy đủ (ít nhất 2 chữ, tối đa 80 ký tự).' using errcode = '22023';
  end if;
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

-- ---------------------------------------------------------------- P2: quiz không lộ đáp án khi chưa đạt
create or replace function public.submit_quiz(p_lesson uuid, p_answers int[])
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  c uuid := public.course_of_lesson(p_lesson);
  k public.quiz_keys;
  n int;
  ok int := 0;
  pass boolean;
  res boolean[] := '{}';
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
    res := res || (p_answers[i] = k.answers[i]);
    if p_answers[i] = k.answers[i] then ok := ok + 1; end if;
  end loop;
  pass := ok >= ceil(n * 0.8);
  insert into public.quiz_attempts (user_id, lesson_id, answers, correct, total, passed)
    values ((select auth.uid()), p_lesson, p_answers, ok, n, pass);
  if pass and public.is_enrolled(c) then
    insert into public.lesson_progress (user_id, lesson_id) values ((select auth.uid()), p_lesson) on conflict do nothing;
  end if;
  -- Chưa đạt: chỉ báo câu nào đúng, câu nào sai. Đạt: thêm đáp án và giải thích để ôn lại.
  return jsonb_build_object('correct', ok, 'total', n, 'passed', pass, 'need', ceil(n * 0.8)::int,
                            'results', to_jsonb(res))
      || case when pass then jsonb_build_object('answers', to_jsonb(k.answers), 'explains', to_jsonb(k.explains))
              else '{}'::jsonb end;
end $$;

-- ---------------------------------------------------------------- P4: xoá khoá, chèn job
create or replace function public.course_has_learners(c uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.enrollments where course_id = c);
$$;

drop policy "Quản lý nội dung xoá khoá chưa xuất bản" on public.courses;
create policy "Xoá khoá chưa xuất bản, chưa có người học" on public.courses
  for delete to authenticated
  using ((select public.has_role('content_manager')) and status <> 'published' and not public.course_has_learners(id));

-- Mọi job tạo qua create_khbd_jobs, review_version (security definer, có kiểm vai trò và trạng thái).
-- Job PBT sau này cũng phải qua hàm kiểm "KHBD đã duyệt".
drop policy create_jobs on public.generation_jobs;

-- ---------------------------------------------------------------- quyền gọi hàm
revoke execute on function public.quiz_complete(jsonb, int[], text[]), public.course_info_problems(text, text, text, text, text[]),
  public.course_content_problems(uuid), public.course_problems(uuid), public.course_has_learners(uuid) from public, anon;
grant execute on function public.course_has_learners(uuid) to authenticated;
grant execute on function public.course_problems(uuid) to authenticated;
