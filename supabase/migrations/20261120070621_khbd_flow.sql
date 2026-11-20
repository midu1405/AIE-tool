-- Giai đoạn 2: luồng soạn KHBD trong khu nội bộ.
-- Tạo job (soạn lại từ kho / bài mới), chạy giả lập 6 bước (executor = 'mock'), duyệt bài, trả về soạn bản mới.
-- Mọi thao tác ghi đi qua hàm security definer có kiểm vai trò; bảng vẫn chỉ cho nhân viên đọc như phần lõi.

-- ---------------------------------------------------------------- cột bổ sung
alter table public.documents
  add column topic_name    text,
  add column periods       smallint not null default 1 check (periods between 1 and 6),
  add column deploy_format text not null default 'chuyen_de' check (deploy_format in ('chuyen_de', 'long_ghep', 'nhu_cau')),
  add column updated_at    timestamptz not null default now();

-- Nội dung xem trước (mục tiêu, 4 hoạt động, kết quả đối chiếu). Executor thật ghi spec vào đây.
alter table public.document_versions
  add column content  jsonb not null default '{}',
  add column warnings smallint not null default 0;

create index generation_jobs_parent on public.generation_jobs (parent_job_id);
create index generation_jobs_document on public.generation_jobs (document_id);

-- ---------------------------------------------------------------- tiện ích
create or replace function public.can_write_khbd() returns boolean
language sql stable security definer set search_path = '' as $$
  select public.has_role('khbd_editor') or public.has_role('reviewer') or public.has_role('content_manager');
$$;

create or replace function public.can_review_khbd() returns boolean
language sql stable security definer set search_path = '' as $$
  select public.has_role('reviewer') or public.has_role('content_manager');
$$;

-- Nội dung giả lập: đủ khung 4 hoạt động, tổng phút = 45 × số tiết. Không có kiến thức thật.
create or replace function public.mock_khbd_content(p_title text, p_grade int, p_periods int, p_codes text[])
returns jsonb language sql immutable set search_path = '' as $$
  select jsonb_build_object(
    'mock', true,
    'objectives', jsonb_build_array(
      'Nêu được ý chính của bài “' || p_title || '” bằng lời của mình.',
      'Thực hiện được hoạt động khám phá theo nhóm và trình bày kết quả.',
      'Vận dụng được điều đã học vào một tình huống quen thuộc ở lớp ' || p_grade || '.'),
    'codes', to_jsonb(coalesce(p_codes, array[]::text[])),
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

-- ---------------------------------------------------------------- tạo job
-- p_mode: 'kho' (soạn lại từ kho) hoặc 'moi' (bài mới).
-- p_items (kho): [{"lesson_id": uuid}]; (moi): [{"grade": 8, "topic_name": "…", "title": "…", "periods": 1, "codes": ["8.C1.1"]}]
-- p_options: {"format": "chuyen_de", "bases": ["qd2422","cv5588",…], "note": "…"}
-- Trả về id lượt chạy (job cha).
create or replace function public.create_khbd_jobs(p_mode text, p_items jsonb, p_options jsonb default '{}')
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  parent uuid;
  item jsonb;
  doc uuid;
  job uuid;
  l record;
  g int;
  fmt text := coalesce(p_options->>'format', 'chuyen_de');
  opts jsonb;
begin
  if uid is null or not public.can_write_khbd() then
    raise exception 'Bạn chưa có quyền soạn KHBD. Nhờ quản trị cấp vai trò Soạn KHBD.' using errcode = '42501';
  end if;
  if p_mode not in ('kho', 'moi') then raise exception 'Cách soạn không hợp lệ: %', p_mode; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Chọn ít nhất 1 bài.' using errcode = '22023';
  end if;
  if jsonb_array_length(p_items) > 30 then
    raise exception 'Mỗi lượt chạy tối đa 30 bài. Chia thành nhiều lượt.' using errcode = '22023';
  end if;
  opts := jsonb_build_object(
    'format', fmt,
    'bases', (select coalesce(jsonb_agg(distinct b), '[]') from jsonb_array_elements_text(
               coalesce(p_options->'bases', '[]') || '["qd2422","cv5588"]'::jsonb) b),
    'note', coalesce(p_options->>'note', ''));

  insert into public.generation_jobs (kind, requested_by, executor, options, status)
  values ((case when p_mode = 'kho' then 'soan_lai' else 'bai_moi' end)::public.job_kind, uid, 'mock', opts || jsonb_build_object('batch', true), 'queued')
  returning id into parent;

  for item in select value from jsonb_array_elements(p_items) loop
    if p_mode = 'kho' then
      select * into l from public.curriculum_lessons where id = (item->>'lesson_id')::uuid;
      if not found then raise exception 'Không tìm thấy bài nguồn %', item->>'lesson_id'; end if;
      if l.grade <= 3 then raise exception 'Lớp 1–3 chưa soạn được.' using errcode = '22023'; end if;
      select id into doc from public.documents where curriculum_lesson_id = l.id and kind = 'khbd' order by created_at limit 1;
      if doc is null then
        insert into public.documents (kind, curriculum_lesson_id, title, grade, created_mode, topic_name, periods, deploy_format, created_by)
        values ('khbd', l.id, l.title, l.grade, 'soan_lai', 'Chủ đề ' || l.topic_no || ': ' || l.topic_name, l.periods, fmt, uid)
        returning id into doc;
      else
        update public.documents set deploy_format = fmt, updated_at = now() where id = doc;
      end if;
    else
      g := (item->>'grade')::int;
      if g is null or g < 4 or g > 12 then raise exception 'Lớp 1–3 chưa soạn được.' using errcode = '22023'; end if;
      if coalesce(btrim(item->>'title'), '') = '' then raise exception 'Nhập tên bài.' using errcode = '22023'; end if;
      insert into public.documents (kind, title, grade, created_mode, topic_name, periods, deploy_format, created_by)
      values ('khbd', btrim(item->>'title'), g, 'bai_moi', nullif(item->>'topic_name', ''),
              greatest(1, least(6, coalesce((item->>'periods')::int, 1))), fmt, uid)
      returning id into doc;
    end if;

    insert into public.generation_jobs (parent_job_id, kind, document_id, requested_by, executor, options, status)
    values (parent, (case when p_mode = 'kho' then 'soan_lai' else 'bai_moi' end)::public.job_kind, doc, uid, 'mock',
            opts || jsonb_build_object('codes', coalesce(item->'codes', '[]'), 'source_url', coalesce(item->>'source_url', '')), 'queued')
    returning id into job;
    insert into public.job_steps (job_id, step) select job, s from unnest(enum_range(null::public.step_name)) s;
  end loop;
  return parent;
end $$;

-- ---------------------------------------------------------------- chạy giả lập
-- Mỗi bước mất p_step_seconds giây. Gọi lại nhiều lần cũng an toàn: chỉ đuổi kịp theo thời gian thực.
-- Ghi chú có "#loi" thì lần chạy đầu lỗi ở bước Lưu Google Doc (để thử nút Chạy lại).
create or replace function public.advance_mock_jobs(p_step_seconds int default 3)
returns int language plpgsql security definer set search_path = '' as $$
declare
  j record;
  st record;
  d record;
  steps public.step_name[] := enum_range(null::public.step_name);
  i int;
  moved int := 0;
  tick timestamptz;
  ver uuid;
  vno int;
  codes text[];
  base uuid;
  content jsonb;
begin
  if not public.is_staff() then return 0; end if;

  for j in
    select * from public.generation_jobs
    where executor = 'mock' and parent_job_id is not null and status in ('queued', 'running')
    order by created_at
    for update skip locked
  loop
    if j.status = 'queued' then
      update public.generation_jobs set status = 'running', started_at = now(), current_step = steps[1] where id = j.id;
      update public.job_steps set status = 'running', started_at = now() where job_id = j.id and step = steps[1];
      moved := moved + 1;
      continue;
    end if;

    loop
      select * into st from public.job_steps where job_id = j.id and status = 'running' limit 1;
      exit when not found or st.started_at + make_interval(secs => p_step_seconds) > now();
      tick := st.started_at + make_interval(secs => p_step_seconds);
      i := array_position(steps, st.step);

      -- lỗi giả lập
      if st.step = 'luu_doc' and j.attempt = 0 and coalesce(j.options->>'note', '') ilike '%#loi%' then
        update public.job_steps set status = 'failed', finished_at = tick,
          error = jsonb_build_object('message', 'Lỗi ở bước Lưu Google Doc: lệnh điền Doc báo sai chỉ số. Spec KHBD và spec PBT đã lưu, chạy lại sẽ bắt đầu từ bước này.')
        where job_id = j.id and step = st.step;
        update public.generation_jobs set status = 'failed', finished_at = tick,
          error = jsonb_build_object('step', st.step, 'message', 'Lỗi ở bước Lưu Google Doc: lệnh điền Doc báo sai chỉ số. Spec KHBD và spec PBT đã lưu, chạy lại sẽ bắt đầu từ bước này.')
        where id = j.id;
        moved := moved + 1;
        exit;
      end if;

      -- bước Lưu Google Doc tạo phiên bản mới
      if st.step = 'luu_doc' then
        select * into d from public.documents where id = j.document_id for update;
        select coalesce(array_agg(x), array[]::text[]) into codes from jsonb_array_elements_text(coalesce(j.options->'codes', '[]')) x;
        content := public.mock_khbd_content(d.title, d.grade, d.periods, codes);
        vno := coalesce((select max(version_no) from public.document_versions where document_id = d.id), 0) + 1;
        insert into public.document_versions (document_id, version_no, job_id, drive_file_id, web_view_link, skill_version,
                                              created_by, status, content, warnings)
        values (d.id, vno, j.id, 'mock-' || j.id, '', 'aca-khbd-ai12 v6 (giả lập)', j.requested_by, 'in_review', content,
                (select count(*) from jsonb_array_elements(content->'checks') c where c->>'tag' = 'warn'))
        returning id into ver;
        update public.documents set current_version_id = ver, status = 'in_review', updated_at = tick where id = d.id;
        base := nullif(j.options->>'base_version_id', '')::uuid;
        if base is not null then
          update public.feedback_items set status = 'da_xu_ly', addressed_in_version_id = ver
          where document_version_id = base and status = 'open';
        end if;
        update public.job_steps set output = jsonb_build_object('version_id', ver, 'version_no', vno) where job_id = j.id and step = st.step;
      end if;

      update public.job_steps set status = 'succeeded', finished_at = tick where job_id = j.id and step = st.step;
      moved := moved + 1;
      if i = array_length(steps, 1) then
        update public.generation_jobs set status = 'succeeded', current_step = null, finished_at = tick,
          run_minutes = round(extract(epoch from tick - started_at)::numeric / 60, 1)
        where id = j.id;
        exit;
      end if;
      update public.job_steps set status = 'running', started_at = tick where job_id = j.id and step = steps[i + 1];
      update public.generation_jobs set current_step = steps[i + 1] where id = j.id;
    end loop;
  end loop;

  -- lượt chạy (job cha) xong khi mọi bài đã kết thúc
  update public.generation_jobs p set
    status = case when exists (select 1 from public.generation_jobs c where c.parent_job_id = p.id and c.status = 'failed') then 'failed'::public.job_status else 'succeeded'::public.job_status end,
    finished_at = now()
  where p.parent_job_id is null and p.executor = 'mock' and p.status in ('queued', 'running')
    and not exists (select 1 from public.generation_jobs c where c.parent_job_id = p.id and c.status in ('queued', 'running'));
  update public.generation_jobs p set status = 'running', started_at = coalesce(started_at, now())
  where p.parent_job_id is null and p.status = 'queued'
    and exists (select 1 from public.generation_jobs c where c.parent_job_id = p.id and c.status = 'running');
  return moved;
end $$;

-- ---------------------------------------------------------------- chạy lại, huỷ
create or replace function public.retry_job(p_job uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare j record;
begin
  select * into j from public.generation_jobs where id = p_job for update;
  if not found then raise exception 'Không tìm thấy lượt soạn.'; end if;
  if not (j.requested_by = auth.uid() and public.can_write_khbd()) and not public.can_review_khbd() then
    raise exception 'Bạn không có quyền chạy lại bài này.' using errcode = '42501';
  end if;
  if j.status <> 'failed' then raise exception 'Chỉ chạy lại được bài đang lỗi.' using errcode = '22023'; end if;
  update public.job_steps set status = 'running', started_at = now(), finished_at = null, error = null
  where job_id = j.id and status = 'failed';
  update public.generation_jobs set status = 'running', attempt = attempt + 1, error = null, finished_at = null where id = j.id;
  update public.generation_jobs set status = 'running', finished_at = null where id = j.parent_job_id;
end $$;

create or replace function public.cancel_job(p_job uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare j record;
begin
  select * into j from public.generation_jobs where id = p_job for update;
  if not found then raise exception 'Không tìm thấy lượt soạn.'; end if;
  if not (j.requested_by = auth.uid() and public.can_write_khbd()) and not public.can_review_khbd() then
    raise exception 'Bạn không có quyền huỷ bài này.' using errcode = '42501';
  end if;
  if j.status <> 'queued' then raise exception 'Chỉ huỷ được bài đang chờ.' using errcode = '22023'; end if;
  update public.job_steps set status = 'canceled' where job_id = j.id;
  update public.generation_jobs set status = 'canceled', finished_at = now() where id = j.id;
end $$;

-- ---------------------------------------------------------------- duyệt bài
-- p_decision: 'approved' hoặc 'changes_requested'. Trả về job soạn bản mới khi trả về, ngược lại null.
create or replace function public.review_version(p_version uuid, p_decision text, p_checklist jsonb default null,
                                                 p_rubric jsonb default null, p_summary text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v record;
  d record;
  parent uuid;
  job uuid;
  open_notes int;
begin
  if not public.can_review_khbd() then
    raise exception 'Bạn chưa có quyền duyệt KHBD. Nhờ quản trị cấp vai trò Duyệt bài.' using errcode = '42501';
  end if;
  if p_decision not in ('approved', 'changes_requested') then raise exception 'Quyết định không hợp lệ.'; end if;
  select * into v from public.document_versions where id = p_version for update;
  if not found then raise exception 'Không tìm thấy phiên bản.'; end if;
  if v.status <> 'in_review' then
    raise exception 'Bản v% không ở trạng thái chờ duyệt.', v.version_no using errcode = '22023';
  end if;
  select * into d from public.documents where id = v.document_id for update;

  insert into public.reviews (document_version_id, reviewer_type, reviewer_id, checklist, rubric, decision, summary)
  values (v.id, 'human', auth.uid(), p_checklist, p_rubric, p_decision, p_summary);

  if p_decision = 'approved' then
    update public.document_versions set status = 'approved', approved_at = now(), approved_by = auth.uid() where id = v.id;
    update public.documents set status = 'approved', updated_at = now() where id = d.id;
    return null;
  end if;

  select count(*) into open_notes from public.feedback_items where document_version_id = v.id and status = 'open';
  if open_notes = 0 then
    raise exception 'Thêm ít nhất 1 góp ý trước khi trả về, để Claude biết cần sửa gì.' using errcode = '22023';
  end if;
  update public.document_versions set status = 'changes_requested' where id = v.id;
  update public.documents set status = 'changes_requested', updated_at = now() where id = d.id;

  insert into public.generation_jobs (kind, requested_by, executor, options, status)
  values ('soan_ban_moi', auth.uid(), 'mock', jsonb_build_object('batch', true), 'queued') returning id into parent;
  insert into public.generation_jobs (parent_job_id, kind, document_id, requested_by, executor, options, status)
  values (parent, 'soan_ban_moi', d.id, auth.uid(), 'mock',
          coalesce((select options from public.generation_jobs where id = v.job_id), '{}')
            - 'note' || jsonb_build_object('base_version_id', v.id, 'note', ''), 'queued')
  returning id into job;
  insert into public.job_steps (job_id, step) select job, s from unnest(enum_range(null::public.step_name)) s;
  return parent;
end $$;

-- Hoàn tác duyệt: chỉ khi bản chưa được gắn vào khoá học nào.
create or replace function public.undo_approval(p_version uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v record;
begin
  if not public.can_review_khbd() then raise exception 'Bạn chưa có quyền duyệt KHBD.' using errcode = '42501'; end if;
  select * into v from public.document_versions where id = p_version for update;
  if not found or v.status <> 'approved' then raise exception 'Bản này chưa được duyệt.' using errcode = '22023'; end if;
  if exists (select 1 from public.lesson_materials where document_version_id = v.id) then
    raise exception 'Bản v% đã gắn vào khoá học, gỡ khỏi khoá trước khi hoàn tác.', v.version_no using errcode = '22023';
  end if;
  update public.document_versions set status = 'in_review', approved_at = null, approved_by = null where id = v.id;
  update public.documents set status = 'in_review', updated_at = now() where id = v.document_id and current_version_id = v.id;
end $$;

-- ---------------------------------------------------------------- danh sách
-- Mỗi tài liệu một dòng, kèm bản hiện tại và lượt soạn gần nhất. 'error' = lượt gần nhất lỗi và chưa có bản nào;
-- 'running' = đang soạn bản đầu tiên; 'draft' = chưa có bản và chưa có lượt soạn nào.
create view public.khbd_list with (security_invoker = true) as
select d.id, d.kind, d.title, d.grade, d.topic_name, d.created_mode, d.periods, d.deploy_format,
       d.updated_at, d.current_version_id, d.curriculum_lesson_id,
       v.version_no, v.warnings,
       lj.id as latest_job_id, lj.status as latest_job_status,
       case
         when v.id is null and lj.status = 'failed' then 'error'
         when v.id is null and lj.status in ('queued', 'running') then 'running'
         when v.id is null then 'draft'
         else v.status::text
       end as list_status,
       exists (select 1 from public.documents p where p.pair_id = d.id and p.kind = 'pbt') as has_pbt
from public.documents d
left join public.document_versions v on v.id = d.current_version_id
left join lateral (
  select g.id, g.status from public.generation_jobs g where g.document_id = d.id order by g.created_at desc limit 1
) lj on true
where d.kind = 'khbd';

-- ---------------------------------------------------------------- góp ý
-- Người duyệt đánh dấu được góp ý là đã xử lý hoặc bỏ qua.
create policy update_feedback on public.feedback_items for update
  using ((select public.can_review_khbd())) with check ((select public.can_review_khbd()));

-- ---------------------------------------------------------------- quyền gọi hàm
revoke execute on function public.create_khbd_jobs(text, jsonb, jsonb) from public, anon;
revoke execute on function public.advance_mock_jobs(int) from public, anon;
revoke execute on function public.retry_job(uuid) from public, anon;
revoke execute on function public.cancel_job(uuid) from public, anon;
revoke execute on function public.review_version(uuid, text, jsonb, jsonb, text) from public, anon;
revoke execute on function public.undo_approval(uuid) from public, anon;
grant execute on function public.create_khbd_jobs(text, jsonb, jsonb), public.advance_mock_jobs(int),
  public.retry_job(uuid), public.cancel_job(uuid), public.review_version(uuid, text, jsonb, jsonb, text),
  public.undo_approval(uuid) to authenticated;

-- ---------------------------------------------------------------- Realtime cho màn Tiến độ
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.generation_jobs, public.job_steps;
  end if;
end $$;
