-- Create table to track site loading assignments with deadlines
create extension if not exists pgcrypto with schema public;

create table if not exists public.site_assignments (
  id uuid primary key default gen_random_uuid(),
  city text not null,
  store_id uuid not null references public.stores(id) on delete cascade,
  store_code text not null,
  floor_map_path text not null,
  floor_map_url text not null,
  assigned_to uuid not null references auth.users(id) on delete cascade,
  assigned_by uuid references auth.users(id) on delete set null,
  deadline_at timestamptz not null,
  status text not null default 'Pending' check (status in ('Pending','In Progress','Done','Cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Reuse or create updated_at trigger function
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Updated at trigger for site_assignments
drop trigger if exists trg_site_assignments_updated_at on public.site_assignments;
create trigger trg_site_assignments_updated_at
before update on public.site_assignments
for each row execute function public.set_updated_at();

-- Enable RLS
alter table public.site_assignments enable row level security;

-- Policies
-- Drop existing policies to avoid conflicts
drop policy if exists "site_assignments_read" on public.site_assignments;
drop policy if exists "site_assignments_insert" on public.site_assignments;
drop policy if exists "site_assignments_update" on public.site_assignments;
drop policy if exists "site_assignments_delete" on public.site_assignments;

-- Read: Admins/managers can see all; assignees and assigners can see their own
create policy "site_assignments_read"
  on public.site_assignments for select
  using (
    public.has_role(auth.uid(), 'admin'::public.app_role) OR 
    public.has_role(auth.uid(), 'manager'::public.app_role) OR
    assigned_to = auth.uid()
    or assigned_by = auth.uid()
  );

-- Insert: Admins/managers only
create policy "site_assignments_insert"
  on public.site_assignments for insert
  with check (
    public.has_role(auth.uid(), 'admin'::public.app_role) OR
    public.has_role(auth.uid(), 'manager'::public.app_role)
  );

-- Update: Admins/managers; assignees can update status only (optional broader rule kept simple here)
create policy "site_assignments_update"
  on public.site_assignments for update
  using (
    public.has_role(auth.uid(), 'admin'::public.app_role) OR
    public.has_role(auth.uid(), 'manager'::public.app_role) OR
    assigned_to = auth.uid()
  )
  with check (
    public.has_role(auth.uid(), 'admin'::public.app_role) OR
    public.has_role(auth.uid(), 'manager'::public.app_role) OR
    assigned_to = auth.uid()
  );

-- Delete: Admins only
create policy "site_assignments_delete"
  on public.site_assignments for delete
  using (
    public.has_role(auth.uid(), 'admin'::public.app_role)
  );

-- Helpful index
create index if not exists idx_site_assignments_assigned_to on public.site_assignments(assigned_to);
create index if not exists idx_site_assignments_store_id on public.site_assignments(store_id);
