-- Update delete policy to allow both admin and manager roles to delete site assignments
drop policy if exists "site_assignments_delete" on public.site_assignments;

create policy "site_assignments_delete"
  on public.site_assignments for delete
  using (
    public.has_role(auth.uid(), 'admin'::public.app_role) OR
    public.has_role(auth.uid(), 'manager'::public.app_role)
  );
