-- Fix stores RLS policies for bulk upload
-- Drop old policies
drop policy if exists "Allow read access to authenticated users" on public.stores;
drop policy if exists "Allow insert access to authenticated users" on public.stores;
drop policy if exists "Allow update access to authenticated users" on public.stores;

-- Create new comprehensive policies

-- Everyone authenticated can read stores
create policy "Authenticated users can read stores"
  on public.stores
  for select
  to authenticated
  using (true);

-- Admins and managers can insert stores
create policy "Admins and managers can insert stores"
  on public.stores
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.user_roles ur 
      where ur.user_id = auth.uid() 
      and ur.role in ('admin', 'manager')
    )
  );

-- Admins and managers can update stores
create policy "Admins and managers can update stores"
  on public.stores
  for update
  to authenticated
  using (
    exists (
      select 1 from public.user_roles ur 
      where ur.user_id = auth.uid() 
      and ur.role in ('admin', 'manager')
    )
  )
  with check (
    exists (
      select 1 from public.user_roles ur 
      where ur.user_id = auth.uid() 
      and ur.role in ('admin', 'manager')
    )
  );

-- Admins can delete stores
create policy "Admins can delete stores"
  on public.stores
  for delete
  to authenticated
  using (
    exists (
      select 1 from public.user_roles ur 
      where ur.user_id = auth.uid() 
      and ur.role = 'admin'
    )
  );
