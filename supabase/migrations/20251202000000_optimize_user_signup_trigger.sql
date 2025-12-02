-- Optimize the handle_new_user trigger to prevent timeouts
-- This migration simplifies the function to only create essential data

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create minimal, fast function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only insert profile - minimal operation
  INSERT INTO public.profiles (
    id, 
    email, 
    full_name, 
    phone, 
    address, 
    department
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    NEW.raw_user_meta_data->>'address',
    NEW.raw_user_meta_data->>'department'
  )
  ON CONFLICT (id) DO NOTHING;

  -- Insert user role separately
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id, 
    COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'user'::app_role)
  )
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log but don't fail
    RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Recreate trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create a separate background function to populate feature access
-- This runs asynchronously to avoid blocking signup
CREATE OR REPLACE FUNCTION public.populate_user_features()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Populate feature access for users who don't have any features yet
  INSERT INTO public.user_feature_access (user_id, feature_name, enabled)
  SELECT u.id, f.feature_name, f.enabled
  FROM auth.users u
  CROSS JOIN public.feature_access f
  WHERE f.enabled = true
    AND NOT EXISTS (
      SELECT 1 
      FROM public.user_feature_access ufa 
      WHERE ufa.user_id = u.id 
        AND ufa.feature_name = f.feature_name
    )
  ON CONFLICT (user_id, feature_name) DO NOTHING;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.populate_user_features() TO authenticated;
GRANT EXECUTE ON FUNCTION public.populate_user_features() TO service_role;

COMMENT ON FUNCTION public.handle_new_user() IS 'Optimized trigger function to create user profile and assign default role';
COMMENT ON FUNCTION public.populate_user_features() IS 'Background function to populate feature access for users without blocking signup';
