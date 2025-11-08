-- Add missing columns to profiles table
alter table public.profiles
  add column if not exists enabled boolean not null default true,
  add column if not exists department text;

-- Create index for faster lookups
create index if not exists idx_profiles_enabled on public.profiles(enabled);
