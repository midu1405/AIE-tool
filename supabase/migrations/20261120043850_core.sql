-- AI Edu Training Hub · phần lõi: người dùng, vai trò, kho Drive, KHBD, duyệt bài.
-- Drive là bản gốc của học liệu; database giữ chỉ mục, hàng đợi job, phiên bản và kết quả duyệt.
-- Khoá học cho giáo viên nằm ở migration 20261120000100_courses.sql (chạy sau file này).

-- Extension đặt trong schema extensions theo cách của Supabase (gen_random_uuid có sẵn từ PG 13).
create schema if not exists extensions;
create extension if not exists pg_trgm with schema extensions;

-- ============================================================
-- 1. Người dùng và phân quyền
-- ============================================================
create table profiles (
  id          uuid primary key references auth.users on delete cascade,
  email       text unique not null,
  full_name   text,
  created_at  timestamptz not null default now()
);

-- Một người có thể giữ nhiều vai trò (vd vừa soạn vừa duyệt). Không có dòng nào = giáo viên.
create table user_roles (
  user_id    uuid not null references auth.users (id) on delete cascade,
  role       text not null check (role in ('admin', 'content_manager', 'khbd_editor', 'reviewer')),
  granted_at timestamptz not null default now(),
  granted_by uuid references auth.users (id),
  primary key (user_id, role)
);

-- admin ngầm có mọi vai trò
create function has_role(r text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.user_roles
    where user_id = (select auth.uid()) and role in (r, 'admin')
  );
$$;

create function is_staff() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.user_roles where user_id = (select auth.uid()));
$$;

-- vai trò nhân viên chỉ dành cho tài khoản công ty
create function user_roles_staff_domain() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from auth.users where id = new.user_id and email like '%@aiedu.com.vn') then
    raise exception 'Chỉ tài khoản @aiedu.com.vn được giữ vai trò nhân viên.' using errcode = '23514';
  end if;
  return new;
end $$;
create trigger user_roles_staff_domain before insert or update on user_roles
  for each row execute function user_roles_staff_domain();

-- tạo profile khi đăng nhập lần đầu
create function handle_new_user() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, full_name)
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
create index drive_files_name on drive_files using gin (name extensions.gin_trgm_ops);

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
  status              doc_status not null default 'draft',  -- = trạng thái của current_version_id
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
  status           doc_status not null default 'draft',  -- trạng thái của riêng phiên bản này
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
-- 6. Nhật ký thao tác
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
-- 7. Row Level Security
-- ============================================================
alter table profiles            enable row level security;
alter table user_roles          enable row level security;
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
alter table audit_log           enable row level security;

-- profiles: tự xem mình; nhân viên xem tất cả; chỉ admin đổi vai trò
create policy profiles_self on profiles for select using (id = (select auth.uid()) or (select is_staff()));
create policy profiles_update_self on profiles for update
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- vai trò: tự xem của mình; admin xem và cấp/thu hồi
create policy user_roles_self on user_roles for select using (user_id = (select auth.uid()) or (select has_role('admin')));
create policy user_roles_admin on user_roles for all using ((select has_role('admin'))) with check ((select has_role('admin')));

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
  with check (requested_by = (select auth.uid()) and (has_role('khbd_editor') or has_role('reviewer') or has_role('content_manager')));
create policy write_reviews on reviews for insert
  with check (reviewer_id = (select auth.uid()) and (has_role('reviewer') or has_role('content_manager')));
create policy write_feedback on feedback_items for insert with check (is_staff());
