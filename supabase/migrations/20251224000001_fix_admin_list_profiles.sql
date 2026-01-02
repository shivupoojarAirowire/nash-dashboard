-- Fix admin_list_profiles function to allow all users to see all profiles
-- This replaces the previous version that had type casting issues

DROP FUNCTION IF EXISTS public.admin_list_profiles();

CREATE OR REPLACE FUNCTION public.admin_list_profiles()
RETURNS SETOF public.profiles
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.profiles;
$$;

COMMENT ON FUNCTION public.admin_list_profiles() IS 'Returns all profiles for all authenticated users';
