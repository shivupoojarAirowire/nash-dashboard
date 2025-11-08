-- Fix profiles RLS policies to allow admins to see all profiles
-- Drop existing restrictive policies
drop policy if exists "Users can view enabled profiles" on public.profiles;
drop policy if exists "Admins and managers can update profiles" on public.profiles;

-- Create comprehensive policies

-- Admins can see and modify all profiles
create policy "Admins have full access to profiles"
  on public.profiles
  for all
  to authenticated
  using ( public.has_role(auth.uid(), 'admin') )
  with check ( public.has_role(auth.uid(), 'admin') );

-- Managers can see all enabled profiles and update them
create policy "Managers can view all enabled profiles"
  on public.profiles
  for select
  to authenticated
  using ( 
    public.has_role(auth.uid(), 'manager')
    and enabled = true
  );

create policy "Managers can update profiles"
  on public.profiles
  for update
  to authenticated
  using ( public.has_role(auth.uid(), 'manager') )
  with check ( public.has_role(auth.uid(), 'manager') );

-- Users can view their own profile
create policy "Users can view own profile"
  on public.profiles
  for select
  to authenticated
  using ( id = auth.uid() );

-- Users can update their own profile (limited fields)
create policy "Users can update own profile"
  on public.profiles
  for update
  to authenticated
  using ( id = auth.uid() )
  with check ( id = auth.uid() );

-- Allow authenticated users to insert their own profile (for signup flow)
create policy "Users can insert own profile"
  on public.profiles
  for insert
  to authenticated
  with check ( id = auth.uid() );
