-- SECURITY DEFINER RPC to list profiles for all users
-- Usage (from client): select * from rpc('admin_list_profiles') OR call via supabase.rpc('admin_list_profiles')

-- This function returns all rows from public.profiles for all authenticated users

CREATE OR REPLACE FUNCTION public.admin_list_profiles()
RETURNS SETOF public.profiles
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.profiles;
$$;

COMMENT ON FUNCTION public.admin_list_profiles() IS 'Returns all profiles for all authenticated users';
