-- Ensure required extension for gen_random_uuid()
create extension if not exists pgcrypto with schema public;

-- Per-user feature access table
-- Idempotent creation
create table if not exists public.user_feature_access (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  feature_name text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, feature_name)
);

-- Updated at trigger
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_user_feature_access_updated_at on public.user_feature_access;
create trigger trg_user_feature_access_updated_at
before update on public.user_feature_access
for each row execute function public.set_updated_at();

-- Enable RLS
alter table public.user_feature_access enable row level security;

-- Policies
-- Drop existing policies first
drop policy if exists "user_feature_access_admin_all" on public.user_feature_access;
drop policy if exists "user_feature_access_self_read" on public.user_feature_access;

-- Admins can do anything
create policy "user_feature_access_admin_all"
  on public.user_feature_access
  using ( public.has_role(auth.uid(), 'admin'::public.app_role) )
  with check ( public.has_role(auth.uid(), 'admin'::public.app_role) );

-- Users can read their own feature flags
create policy "user_feature_access_self_read"
  on public.user_feature_access for select
  using ( user_id = auth.uid() );

-- Users cannot modify their own flags (admin only) so no insert/update/delete policies for non-admin.

-- Seed some default features for existing users (only if none exist yet)
insert into public.user_feature_access (user_id, feature_name, enabled)
select u.id, f.feature_name, f.enabled
from auth.users u
cross join (
  values 
    ('Dashboard', true),
    ('Users', true),
    ('Stores', true),
    ('Delivery', true),
    ('Inventory', true),
    ('Subscriptions', true),
    ('Upload Data', true),
    ('Project Manager', true)
) as f(feature_name, enabled)
where not exists (
  select 1 from public.user_feature_access ufa where ufa.user_id = u.id
);

-- View for simplified querying (optional)
create or replace view public.v_user_features as
select user_id, jsonb_object_agg(feature_name, enabled order by feature_name) as features
from public.user_feature_access
group by user_id;
