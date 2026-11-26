-- Danh sách KHBD hiện cờ "Tự duyệt" (góp ý B8 ngày 26/11, Midu chốt: cho phép người tạo tự duyệt, nhưng ghi lại để soát).
-- self_approved: bản hiện tại đã duyệt và người duyệt chính là người tạo job đầu tiên của tài liệu (người đặt soạn bài).
-- Chỉ thêm cột ở cuối view nên dùng create or replace được.
create or replace view public.khbd_list with (security_invoker = true) as
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
       exists (select 1 from public.documents p where p.pair_id = d.id and p.kind = 'pbt') as has_pbt,
       (v.status = 'approved' and v.approved_by is not null
        and v.approved_by = (select g.requested_by from public.generation_jobs g
                             where g.document_id = d.id order by g.created_at limit 1)) as self_approved
from public.documents d
left join public.document_versions v on v.id = d.current_version_id
left join lateral (
  select g.id, g.status from public.generation_jobs g where g.document_id = d.id order by g.created_at desc limit 1
) lj on true
where d.kind = 'khbd';
