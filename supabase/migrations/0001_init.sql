-- AI Edu Training Hub · migration đầu tiên
-- Hai khu: trang giáo viên (khoá học) và khu nội bộ (KHBD). Drive là bản gốc của học liệu;
-- database giữ chỉ mục, hàng đợi job, phiên bản, duyệt và khoá học.

create extension if not exists pgcrypto;
create extension if not exists pg_trgm;
create extension if not exists unaccent;

-- ============================================================
-- 1. Người dùng và phân quyền
-- ============================================================
create type user_role as enum ('teacher', 'soan_bai', 'duyet', 'quan_ly_noi_dung', 'admin');

create table profiles (
  id          uuid primary key references auth.users on delete cascade,
  email       text unique not null,
  full_name   text,
  role        user_role not null default 'teacher',
  created_at  timestamptz not null default now(),
  -- vai trò nhân viên chỉ dành cho tài khoản công ty
  constraint staff_domain check (role = 'teacher' or email like '%@aiedu.com.vn')
);

create function is_staff() returns boolean language sql stable security definer as $$
  select exists (select 1 from profiles where id = auth.uid() and role <> 'teacher');
$$;

create function has_role(variadic roles user_role[]) returns boolean language sql stable security definer as $$
  select exists (select 1 from profiles where id = auth.uid() and role = any(roles));
$$;

-- tạo profile khi đăng nhập lần đầu
create function handle_new_user() returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================
-- 2. Kho học liệu trên Drive (chỉ mục, không thay Drive)
-- ============================================================
create table drive_sources (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,     -- '3. Giáo dục trí tuệ nhân tạo dành cho học sinh phổ thông'
  shared_drive_id     text not null,
  root_folder_id      text not null,     -- gốc kho nguồn (chỉ đọc)
  output_folder_id    text not null,     -- 1. Pre-Review › AI Agent
  changes_page_token  text,
  last_synced_at      timestamptz
);

create table drive_files (
  id              uuid primary key default gen_random_uuid(),
  source_id       uuid not null references drive_sources,
  drive_file_id   text not null unique,
  parent_drive_id text,
  name            text not null,
  mime_type       text not null,
  is_folder       boolean not null default false,
  path            text not null,
  path_ids        text[] not null,
  drive_version   bigint,
  modified_time   timestamptz,
  web_view_link   text,
  trashed         boolean not null default false,
  needs_extract   boolean not null default true,
  updated_at      timestamptz not null default now()
);
create index drive_files_path_ids on drive_files using gin (path_ids);
create index drive_files_name on drive_files using gin (name gin_trgm_ops);

create table file_contents (
  file_id        uuid primary key references drive_files on delete cascade,
  drive_version  bigint,
  text           text not null,
  extracted_at   timestamptz not null default now()
);

create table sync_runs (
  id          uuid primary key default gen_random_uuid(),
  source_id   uuid not null references drive_sources,
  kind        text not null check (kind in ('full', 'incremental', 'manual')),
  started_at  timestamptz not null default now(),
  finished_at timestamptz,
  added int default 0, updated int default 0, removed int default 0,
  error       jsonb
);

-- ============================================================
-- 3. Khung chương trình (khung NLS) và bài nguồn
-- ============================================================
create type school_level as enum ('tieu_hoc', 'thcs', 'thpt');

create table curriculum_lessons (
  id                uuid primary key default gen_random_uuid(),
  level             school_level not null,
  grade             smallint not null check (grade between 1 and 12),
  topic_no          smallint not null,
  topic_name        text not null,
  lesson_no         smallint not null,          -- số "Bài N" trong lớp theo khung
  title             text not null,
  periods           smallint not null default 1,
  objectives        text[] not null default '{}',
  source_folder_id  uuid references drive_files, -- thư mục bài trong kho, nếu có
  unique (grade, lesson_no)
);

-- ============================================================
-- 4. Soạn KHBD: job, bước, tài liệu, phiên bản
-- ============================================================
create type job_kind   as enum ('soan_lai', 'bai_moi', 'soan_ban_moi', 'pbt', 'doi_chieu');
create type job_status as enum ('queued', 'running', 'succeeded', 'failed', 'canceled');
create type step_name  as enum ('doc_nguon', 'chon_ma_2422', 'soan_khbd_spec', 'kiem_tra', 'luu_doc', 'ghi_nhat_ky');
create type doc_kind   as enum ('khbd', 'pbt');
create type doc_status as enum ('draft', 'in_review', 'changes_requested', 'approved', 'archived');

create table documents (
  id                  uuid primary key default gen_random_uuid(),
  kind                doc_kind not null,
  curriculum_lesson_id uuid references curriculum_lessons,
  title               text not null,            -- vd 'Bài 3. AI tạo sinh'
  grade               smallint not null check (grade between 1 and 12),
  created_mode        text not null check (created_mode in ('soan_lai', 'bai_moi')),
  status              doc_status not null default 'draft',
  pair_id             uuid references documents, -- KHBD <-> PBT
  current_version_id  uuid,
  stale_source        boolean not null default false,
  created_by          uuid references profiles,
  created_at          timestamptz not null default now()
);

create table generation_jobs (
  id              uuid primary key default gen_random_uuid(),
  parent_job_id   uuid references generation_jobs,  -- lượt soạn hàng loạt
  kind            job_kind not null,
  document_id     uuid references documents,
  source_file_id  uuid references drive_files,      -- bài nguồn khi soạn lại
  requested_by    uuid not null references profiles,
  status          job_status not null default 'queued',
  current_step    step_name,
  executor        text not null default 'mock',     -- mock | api | routine | ...
  options         jsonb not null default '{}',      -- grade, format, bases[], note, lesson_name, codes, periods
  attempt         smallint not null default 0,
  error           jsonb,
  run_minutes     numeric(6,1),
  created_at      timestamptz not null default now(),
  started_at      timestamptz,
  finished_at     timestamptz
);
create index jobs_queue on generation_jobs (created_at) where status = 'queued';

create table job_steps (
  job_id      uuid references generation_jobs on delete cascade,
  step        step_name not null,
  status      job_status not null default 'queued',
  output      jsonb,
  error       jsonb,
  started_at  timestamptz,
  finished_at timestamptz,
  primary key (job_id, step)
);

create table document_versions (
  id               uuid primary key default gen_random_uuid(),
  document_id      uuid not null references documents on delete cascade,
  version_no       int not null,
  job_id           uuid references generation_jobs,
  drive_file_id    text not null,
  web_view_link    text not null,
  spec_drive_file_id text,
  source_snapshot  jsonb not null default '[]',  -- [{drive_file_id, modified_time}]
  skill_version    text,                          -- 'aca-khbd-ai12 v6'
  created_by       uuid references profiles,
  created_at       timestamptz not null default now(),
  approved_at      timestamptz,
  approved_by      uuid references profiles,
  unique (document_id, version_no)
);
alter table documents add foreign key (current_version_id) references document_versions;

create function next_version_no(doc uuid) returns int language plpgsql as $$
declare n int;
begin
  perform 1 from documents where id = doc for update;
  select coalesce(max(version_no), 0) + 1 into n from document_versions where document_id = doc;
  return n;
end $$;

-- ============================================================
-- 5. Duyệt bài
-- ============================================================
create table reviews (
  id                  uuid primary key default gen_random_uuid(),
  document_version_id uuid not null references document_versions on delete cascade,
  reviewer_type       text not null check (reviewer_type in ('ai', 'human')),
  reviewer_id         uuid references profiles,
  checklist           jsonb,          -- 8 mục 2422 + 5588: [{item, result: dat|da_sua|can_xem}]
  bases               text[] not null default '{qd2422,cv5588}',
  rubric              jsonb,          -- {"1": 3, "2": 2, ..., "7": "na"}
  decision            text check (decision in ('approved', 'changes_requested')),
  summary             text,
  created_at          timestamptz not null default now()
);

create table feedback_items (
  id                      uuid primary key default gen_random_uuid(),
  document_version_id     uuid not null references document_versions on delete cascade,
  source                  text not null check (source in ('web', 'gdoc_comment', 'doi_chieu', 'day_thu')),
  drive_comment_id        text unique,
  author                  text,
  anchor                  text,       -- vd 'Hoạt động 2'
  content                 text not null,
  status                  text not null default 'open' check (status in ('open', 'da_xu_ly', 'bo_qua')),
  addressed_in_version_id uuid references document_versions,
  created_at              timestamptz not null default now()
);

-- ============================================================
-- 6. Khoá học cho giáo viên
-- ============================================================
create type course_status as enum ('draft', 'published', 'hidden');

create table courses (
  id            uuid primary key default gen_random_uuid(),
  slug          text unique not null,
  title         text not null,
  summary       text not null,
  description   text,
  topic         text not null check (topic in ('hieu_biet_ai', 'day_hoc_voi_ai', 'an_toan_dao_duc', 'nang_luc_so')),
  audiences     text[] not null default '{}',   -- tieu_hoc, thcs, thpt, quan_ly
  hours_min     smallint not null,
  hours_max     smallint not null,
  format        text not null check (format in ('tu_hoc', 'co_huong_dan')),
  level         text not null check (level in ('co_ban', 'nang_cao')),
  status        course_status not null default 'draft',
  published_at  timestamptz,
  created_by    uuid references profiles,
  updated_at    timestamptz not null default now()
);

create table course_modules (
  id         uuid primary key default gen_random_uuid(),
  course_id  uuid not null references courses on delete cascade,
  position   smallint not null,
  title      text not null,
  unique (course_id, position)
);

create table course_lessons (
  id         uuid primary key default gen_random_uuid(),
  module_id  uuid not null references course_modules on delete cascade,
  position   smallint not null,
  title      text not null,
  body_md    text,
  unique (module_id, position)
);

-- học liệu: ghim đúng một phiên bản KHBD/PBT đã duyệt
create table lesson_materials (
  id                  uuid primary key default gen_random_uuid(),
  lesson_id           uuid not null references course_lessons on delete cascade,
  document_version_id uuid not null references document_versions,
  attached_by         uuid references profiles,
  attached_at         timestamptz not null default now(),
  unique (lesson_id, document_version_id)
);

create function only_approved_material() returns trigger language plpgsql as $$
begin
  if not exists (select 1 from document_versions where id = new.document_version_id and approved_at is not null) then
    raise exception 'Chỉ gắn được phiên bản đã duyệt';
  end if;
  return new;
end $$;
create trigger lesson_materials_approved before insert or update on lesson_materials
  for each row execute function only_approved_material();

-- học liệu đã gắn đang có phiên bản mới hơn được duyệt
create view material_updates as
select lm.id as material_id, lm.lesson_id, dv.document_id, dv.version_no as pinned_version,
       max(newer.version_no) as latest_approved_version
from lesson_materials lm
join document_versions dv on dv.id = lm.document_version_id
join document_versions newer on newer.document_id = dv.document_id
  and newer.approved_at is not null and newer.version_no > dv.version_no
group by lm.id, lm.lesson_id, dv.document_id, dv.version_no;

create table enrollments (
  user_id      uuid references profiles on delete cascade,
  course_id    uuid references courses on delete cascade,
  enrolled_at  timestamptz not null default now(),
  completed_at timestamptz,
  primary key (user_id, course_id)
);

create table saved_courses (
  user_id   uuid references profiles on delete cascade,
  course_id uuid references courses on delete cascade,
  saved_at  timestamptz not null default now(),
  primary key (user_id, course_id)
);

create table lesson_progress (
  user_id      uuid references profiles on delete cascade,
  lesson_id    uuid references course_lessons on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);
-- Chứng nhận: chưa làm ở bản đầu (quyết định 20/11/2026).

-- ============================================================
-- 7. Nhật ký thao tác
-- ============================================================
create table audit_log (
  id         bigserial primary key,
  actor_id   uuid references profiles,
  action     text not null,
  entity     text not null,
  entity_id  text,
  meta       jsonb,
  at         timestamptz not null default now()
);

-- ============================================================
-- 8. Row Level Security
-- ============================================================
alter table profiles            enable row level security;
alter table drive_sources       enable row level security;
alter table drive_files         enable row level security;
alter table file_contents       enable row level security;
alter table sync_runs           enable row level security;
alter table curriculum_lessons  enable row level security;
alter table documents           enable row level security;
alter table generation_jobs     enable row level security;
alter table job_steps           enable row level security;
alter table document_versions   enable row level security;
alter table reviews             enable row level security;
alter table feedback_items      enable row level security;
alter table courses             enable row level security;
alter table course_modules      enable row level security;
alter table course_lessons      enable row level security;
alter table lesson_materials    enable row level security;
alter table enrollments         enable row level security;
alter table saved_courses       enable row level security;
alter table lesson_progress     enable row level security;
alter table audit_log           enable row level security;

-- profiles: tự xem mình; nhân viên xem tất cả; chỉ admin đổi vai trò
create policy profiles_self on profiles for select using (id = auth.uid() or is_staff());
create policy profiles_admin on profiles for update using (has_role('admin'));

-- khu nội bộ: nhân viên đọc; ghi qua server (service role) hoặc theo vai trò
create policy staff_read_drive_sources on drive_sources for select using (is_staff());
create policy staff_read_drive_files on drive_files for select using (is_staff());
create policy staff_read_file_contents on file_contents for select using (is_staff());
create policy staff_read_sync_runs on sync_runs for select using (is_staff());
create policy staff_read_curriculum on curriculum_lessons for select using (is_staff());
create policy staff_read_documents on documents for select using (is_staff());
create policy staff_read_versions on document_versions for select using (is_staff());
create policy staff_read_jobs on generation_jobs for select using (is_staff());
create policy staff_read_steps on job_steps for select using (is_staff());
create policy staff_read_reviews on reviews for select using (is_staff());
create policy staff_read_feedback on feedback_items for select using (is_staff());
create policy staff_read_audit on audit_log for select using (has_role('admin'));

create policy create_jobs on generation_jobs for insert
  with check (requested_by = auth.uid() and has_role('soan_bai', 'duyet', 'quan_ly_noi_dung', 'admin'));
create policy write_reviews on reviews for insert
  with check (reviewer_id = auth.uid() and has_role('duyet', 'quan_ly_noi_dung', 'admin'));
create policy write_feedback on feedback_items for insert with check (is_staff());

-- khoá học: ai cũng xem khoá đã xuất bản; nhân viên xem mọi khoá; chỉ quản lý nội dung sửa và xuất bản
create policy courses_public on courses for select using (status = 'published' or is_staff());
create policy courses_manage on courses for all
  using (has_role('quan_ly_noi_dung', 'admin')) with check (has_role('quan_ly_noi_dung', 'admin'));
create policy modules_public on course_modules for select
  using (exists (select 1 from courses c where c.id = course_id and (c.status = 'published' or is_staff())));
create policy modules_manage on course_modules for all
  using (has_role('quan_ly_noi_dung', 'admin')) with check (has_role('quan_ly_noi_dung', 'admin'));
create policy lessons_public on course_lessons for select
  using (exists (select 1 from course_modules m join courses c on c.id = m.course_id
                 where m.id = module_id and (c.status = 'published' or is_staff())));
create policy lessons_manage on course_lessons for all
  using (has_role('quan_ly_noi_dung', 'admin')) with check (has_role('quan_ly_noi_dung', 'admin'));
create policy materials_read on lesson_materials for select
  using (exists (select 1 from course_lessons l join course_modules m on m.id = l.module_id join courses c on c.id = m.course_id
                 where l.id = lesson_id and (c.status = 'published' or is_staff())));
-- giáo viên mở được phiên bản KHBD/PBT đã gắn vào khoá đã xuất bản
create policy versions_in_published_course on document_versions for select
  using (exists (select 1 from lesson_materials lm join course_lessons l on l.id = lm.lesson_id
                 join course_modules m on m.id = l.module_id join courses c on c.id = m.course_id
                 where lm.document_version_id = document_versions.id and c.status = 'published'));
create policy materials_manage on lesson_materials for all
  using (has_role('quan_ly_noi_dung', 'admin')) with check (has_role('quan_ly_noi_dung', 'admin'));

-- việc học của từng người: chỉ chính người đó
create policy own_enrollments on enrollments for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_saved on saved_courses for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_progress on lesson_progress for all using (user_id = auth.uid()) with check (user_id = auth.uid());
