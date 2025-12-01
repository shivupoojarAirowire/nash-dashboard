-- Update delete policy to allow both admin and manager roles to delete site assignments
drop policy if exists "site_assignments_delete" on public.site_assignments;

create policy "site_assignments_delete"
  on public.site_assignments for delete
  using (
    exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role in ('admin', 'manager'))
  );
