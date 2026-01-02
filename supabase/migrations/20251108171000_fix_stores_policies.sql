-- Fix stores RLS policies for bulk upload
-- Drop old policies
drop policy if exists "Allow read access to authenticated users" on public.stores;
drop policy if exists "Allow insert access to authenticated users" on public.stores;
drop policy if exists "Allow update access to authenticated users" on public.stores;
drop policy if exists "Authenticated users can read stores" on public.stores;
drop policy if exists "Admins and managers can insert stores" on public.stores;
drop policy if exists "Admins and managers can update stores" on public.stores;
drop policy if exists "Admins can delete stores" on public.stores;

-- Create new comprehensive policies

-- Everyone authenticated can read stores
create policy "Authenticated users can read stores"
  on public.stores
  for select
  to authenticated
  using (true);

-- Admins and managers can insert stores - use has_role function with explicit ENUM cast
create policy "Admins and managers can insert stores"
  on public.stores
  for insert
  to authenticated
  with check (
    public.has_role(auth.uid(), 'admin'::public.app_role) OR
    public.has_role(auth.uid(), 'manager'::public.app_role)
  );

-- Admins and managers can update stores
create policy "Admins and managers can update stores"
  on public.stores
  for update
  to authenticated
  using (
    public.has_role(auth.uid(), 'admin'::public.app_role) OR
    public.has_role(auth.uid(), 'manager'::public.app_role)
  )
  with check (
    public.has_role(auth.uid(), 'admin'::public.app_role) OR
    public.has_role(auth.uid(), 'manager'::public.app_role)
  );

-- Admins can delete stores
create policy "Admins can delete stores"
  on public.stores
  for delete
  to authenticated
  using (
    public.has_role(auth.uid(), 'admin'::public.app_role)
  );
